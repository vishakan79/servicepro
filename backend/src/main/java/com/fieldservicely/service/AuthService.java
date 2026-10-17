package com.fieldservicely.service;

import com.fieldservicely.config.AppProperties;
import com.fieldservicely.dto.AuthDtos.LoginResult;
import com.fieldservicely.dto.AuthDtos.LoginRequest;
import com.fieldservicely.dto.AuthDtos.RegisterRequest;
import com.fieldservicely.dto.AuthDtos.RegisterResponse;
import com.fieldservicely.dto.AuthDtos.RegisterStart;
import com.fieldservicely.dto.AuthDtos.TokenResponse;
import com.fieldservicely.dto.AuthDtos.UserView;
import com.fieldservicely.entity.Customer;
import com.fieldservicely.entity.RefreshToken;
import com.fieldservicely.entity.Role;
import com.fieldservicely.entity.User;
import com.fieldservicely.exception.ApiException;
import com.fieldservicely.repository.CustomerRepository;
import com.fieldservicely.repository.RefreshTokenRepository;
import com.fieldservicely.repository.UserRepository;
import com.fieldservicely.security.FirebaseTokenVerifier;
import com.fieldservicely.security.JwtService;
import com.fieldservicely.security.LoginRateLimiter;
import com.fieldservicely.util.PhoneNumbers;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.EnumSet;
import java.util.HexFormat;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Registration proves two things with Firebase: the mobile number (SMS code) and the email address (sign-in link). The person
 * then signs in with email and password. Customers are active immediately; staff roles wait for administrator approval, and
 * ADMIN can never be self-registered.
 */
@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Set<Role> SELF_REGISTER = EnumSet.of(Role.CUSTOMER, Role.TECHNICIAN, Role.MANAGER);
    private static final String BAD_LOGIN = "Incorrect email or password.";

    private final UserRepository users;
    private final CustomerRepository customers;
    private final RefreshTokenRepository refreshTokens;
    private final JwtService jwt;
    private final LoginRateLimiter limiter;
    private final AppProperties props;
    private final FirebaseTokenVerifier firebase;
    private final PasswordEncoder encoder;
    /** Compared against when the email is unknown, so a wrong email and a wrong password take the same time. */
    private final String dummyHash;

    public AuthService(UserRepository users, CustomerRepository customers, RefreshTokenRepository refreshTokens, JwtService jwt,
                       LoginRateLimiter limiter, AppProperties props, FirebaseTokenVerifier firebase, PasswordEncoder encoder) {
        this.users = users;
        this.customers = customers;
        this.refreshTokens = refreshTokens;
        this.jwt = jwt;
        this.limiter = limiter;
        this.props = props;
        this.firebase = firebase;
        this.encoder = encoder;
        this.dummyHash = encoder.encode("not-a-real-password-" + RANDOM.nextLong());
    }

    // ---- sign in -----------------------------------------------------------------------------------------------

    /** Email + password. Failures are counted per client address and email, and never say which of the two was wrong. */
    @Transactional(noRollbackFor = ApiException.class)
    public LoginResult login(LoginRequest in, String clientIp) {
        String email = in.email().trim().toLowerCase();
        String key = "login|" + clientIp + "|" + email;
        if (limiter.isBlocked(key)) throw new ApiException.TooManyRequests("Too many failed attempts. Try again in 15 minutes.");
        User user = users.findByEmailIgnoreCase(email).orElse(null);
        boolean ok = encoder.matches(in.password(), user == null ? dummyHash : user.getPasswordHash());
        if (user == null || !ok) {
            limiter.recordFailure(key);
            throw new ApiException.Unauthorized(BAD_LOGIN);
        }
        limiter.reset(key);
        if (!user.isEnabled()) {
            // Only revealed after the correct password, so it cannot be used to discover accounts.
            throw new ApiException.Forbidden(user.isApprovalPending()
                    ? "Your account is waiting for administrator approval."
                    : "This account has been disabled. Contact your administrator.");
        }
        log.info("Sign-in for user {}", user.getId());
        return issue(user);
    }

    // ---- registration ------------------------------------------------------------------------------------------

    /** Checks the role, email and mobile number are allowed and free, before the person spends an SMS or an email on them. */
    @Transactional(readOnly = true)
    public void startRegistration(RegisterStart in, String clientIp) {
        throttle("reg-check|" + clientIp);
        checkRegistration(in.role(), in.email(), in.phone(), in.address());
    }

    @Transactional(noRollbackFor = ApiException.class)
    public RegisterResponse register(RegisterRequest in, String clientIp) {
        checkRegistration(in.role(), in.email(), in.phone(), in.address());
        String email = in.email().trim().toLowerCase();
        String phone = PhoneNumbers.normalize(in.phone());
        String key = "reg|" + clientIp + "|" + email;
        if (limiter.isBlocked(key)) throw new ApiException.TooManyRequests("Too many failed attempts. Try again later.");
        try {
            String provenEmail = firebase.verifyEmail(in.emailIdToken());
            if (!provenEmail.equals(email)) throw new ApiException.Unauthorized("The verified email address does not match the one entered.");
        } catch (ApiException.Unauthorized ex) {
            limiter.recordFailure(key);
            throw ex;
        }
        limiter.reset(key);

        User u = new User();
        u.setName(in.name().trim());
        u.setEmail(email);
        u.setPhone(phone);
        u.setPasswordHash(encoder.encode(in.password()));
        u.setRole(in.role());
        u.setEmailVerified(true);
        u.setPhoneVerified(false);
        boolean customer = in.role() == Role.CUSTOMER;
        u.setEnabled(customer);
        u.setApprovalPending(!customer);
        if (customer) {
            Customer c = new Customer();
            c.setName(u.getName());
            c.setPhone(phone);
            c.setEmail(email);
            c.setAddress(in.address().trim());
            customers.save(c);
            u.setCustomerId(c.getId());
        }
        users.save(u);
        log.info("Registered user {} as {} (active={})", u.getId(), u.getRole(), u.isEnabled());
        return customer
                ? new RegisterResponse("ACTIVE", "Your account is ready. Sign in with your email and password.")
                : new RegisterResponse("PENDING_APPROVAL",
                        "Your mobile and email are verified. An administrator must approve your account before you can sign in.");
    }

    private void checkRegistration(Role role, String email, String phone, String address) {
        if (!SELF_REGISTER.contains(role)) {
            throw new ApiException.Forbidden("Administrator accounts are created by an existing administrator.");
        }
        if (role == Role.CUSTOMER && (address == null || address.isBlank())) {
            throw new ApiException.BadRequest("Address is required for customers");
        }
        String e = email.trim().toLowerCase();
        String p = PhoneNumbers.normalize(phone);
        if (users.existsByEmailIgnoreCase(e)) throw new ApiException.Conflict("An account with this email already exists. Sign in instead.");
        if (users.existsByPhone(p)) throw new ApiException.Conflict("An account with this mobile number already exists. Sign in instead.");
    }

    /** Counts a request against the client address; used by the unauthenticated pre-check. */
    private void throttle(String key) {
        if (limiter.isBlocked(key)) throw new ApiException.TooManyRequests("Too many requests. Try again later.");
        limiter.recordFailure(key);
    }

    // ---- sessions ----------------------------------------------------------------------------------------------

    /** Rotates the refresh token. Presenting an already-used token revokes every session of that user. */
    @Transactional(noRollbackFor = ApiException.Unauthorized.class)
    public LoginResult refresh(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new ApiException.Unauthorized("Session expired");
        }
        RefreshToken stored = refreshTokens.findByTokenHash(sha256(rawToken))
                .orElseThrow(() -> new ApiException.Unauthorized("Session expired"));
        if (stored.isRevoked()) {
            refreshTokens.revokeAllForUser(stored.getUserId());
            log.warn("Refresh token reuse detected for user {}", stored.getUserId());
            throw new ApiException.Unauthorized("Session expired");
        }
        if (stored.getExpiresAt().isBefore(Instant.now())) {
            throw new ApiException.Unauthorized("Session expired");
        }
        User user = users.findById(stored.getUserId()).filter(User::isEnabled)
                .orElseThrow(() -> new ApiException.Unauthorized("Session expired"));
        stored.setRevoked(true);
        return issue(user);
    }

    @Transactional
    public void logout(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) return;
        refreshTokens.findByTokenHash(sha256(rawToken)).ifPresent(t -> t.setRevoked(true));
    }

    @Transactional(readOnly = true)
    public UserView me(Long userId) {
        return users.findById(userId).map(UserView::of).orElseThrow(() -> new ApiException.Unauthorized("Authentication required"));
    }

    private LoginResult issue(User user) {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        RefreshToken rt = new RefreshToken();
        rt.setUserId(user.getId());
        rt.setTokenHash(sha256(raw));
        rt.setCreatedAt(Instant.now());
        rt.setExpiresAt(Instant.now().plus(props.jwt().refreshTtl()));
        refreshTokens.save(rt);

        TokenResponse body = new TokenResponse(jwt.createAccessToken(user), "Bearer", jwt.accessTtlSeconds(), UserView.of(user));
        return new LoginResult(body, raw);
    }

    static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
