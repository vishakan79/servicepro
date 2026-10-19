package com.fieldservicely.controller;

import com.fieldservicely.config.AppProperties;
import com.fieldservicely.dto.AuthDtos.ChangePasswordRequest;
import com.fieldservicely.dto.AuthDtos.LoginRequest;
import com.fieldservicely.dto.AuthDtos.LoginResult;
import com.fieldservicely.dto.AuthDtos.RegisterRequest;
import com.fieldservicely.dto.AuthDtos.RegisterResponse;
import com.fieldservicely.dto.AuthDtos.RegisterStart;
import com.fieldservicely.dto.AuthDtos.ResetPasswordRequest;
import com.fieldservicely.dto.AuthDtos.TokenResponse;
import com.fieldservicely.dto.AuthDtos.UpdateProfileRequest;
import com.fieldservicely.dto.AuthDtos.UserView;
import com.fieldservicely.security.CurrentUser;
import com.fieldservicely.security.EmailProofService;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import com.fieldservicely.util.ClientIp;
import com.fieldservicely.security.RefreshCookie;
import com.fieldservicely.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.time.Duration;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService auth;
    private final AppProperties props;
    private final RefreshCookie cookie;
    private final EmailProofService emailProof;

    public record EmailSend(@NotBlank @Email @Size(max = 160) String email) {}

    public record EmailVerify(@NotBlank @Email @Size(max = 160) String email, @NotBlank @Size(max = 12) String code) {}

    public AuthController(AuthService auth, AppProperties props, RefreshCookie cookie, EmailProofService emailProof) {
        this.emailProof = emailProof;
        this.auth = auth;
        this.props = props;
        this.cookie = cookie;
    }

    /** Mails a 6-digit code to the address. */
    @PostMapping("/email/send")
    public ResponseEntity<Void> emailSend(@Valid @RequestBody EmailSend req, HttpServletRequest http) {
        emailProof.sendCode(req.email(), ClientIp.of(http));
        return ResponseEntity.noContent().build();
    }

    /** Exchanges the emailed code for a short-lived proof of the address. */
    @PostMapping("/email/verify")
    public java.util.Map<String, String> emailVerify(@Valid @RequestBody EmailVerify req) {
        return java.util.Map.of("proof", emailProof.verifyCode(req.email(), req.code()));
    }

    @PostMapping("/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest req, HttpServletRequest http, HttpServletResponse res) {
        return session(auth.login(req, ClientIp.of(http)), res);
    }

    /** Checks that the role, email and mobile number can be registered. Sends nothing. */
    @PostMapping("/register/start")
    public ResponseEntity<Void> registerStart(@Valid @RequestBody RegisterStart req, HttpServletRequest http) {
        auth.startRegistration(req, ClientIp.of(http));
        return ResponseEntity.noContent().build();
    }

    /** Creates the account once both Firebase proofs (SMS code and email link) check out. The person then signs in normally. */
    @PostMapping("/register")
    public RegisterResponse register(@Valid @RequestBody RegisterRequest req, HttpServletRequest http) {
        return auth.register(req, ClientIp.of(http));
    }

    @PostMapping("/password/reset")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest req, HttpServletRequest http) {
        auth.resetPassword(req, ClientIp.of(http));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/password/change")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest req) {
        auth.changePassword(CurrentUser.require(), req);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/profile")
    public UserView updateProfile(@Valid @RequestBody UpdateProfileRequest req) {
        return auth.updateProfile(CurrentUser.require(), req);
    }

    @PostMapping("/refresh")
    public TokenResponse refresh(@CookieValue(name = RefreshCookie.NAME, required = false) String token, HttpServletResponse res) {
        return session(auth.refresh(token), res);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@CookieValue(name = RefreshCookie.NAME, required = false) String token, HttpServletResponse res) {
        auth.logout(token);
        cookie.write(res, "", Duration.ZERO);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public UserView me() {
        return auth.me(CurrentUser.require().id());
    }

    private TokenResponse session(LoginResult r, HttpServletResponse res) {
        cookie.write(res, r.refreshToken(), props.jwt().refreshTtl());
        return r.body();
    }
}
