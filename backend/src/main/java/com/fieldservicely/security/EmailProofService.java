package com.fieldservicely.security;

import com.fieldservicely.config.AppProperties;
import com.fieldservicely.exception.ApiException;
import com.fieldservicely.mail.EmailSender;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/**
 * Proves a person controls an email address with a 6-digit code we mail them. Nothing is stored: the code is an HMAC of the address
 * and a 10-minute time bucket, keyed with the server secret, and the previous bucket is still accepted. Sending and wrong guesses are
 * rate limited per address. A correct code is exchanged for a signed 30-minute proof that registration and password reset accept.
 */
@Service
public class EmailProofService {

    private static final Logger log = LoggerFactory.getLogger(EmailProofService.class);
    private static final long BUCKET_SECONDS = 600;

    private final AppProperties props;
    private final EmailSender sender;
    private final LoginRateLimiter limiter;
    private final JwtService jwt;

    public EmailProofService(AppProperties props, EmailSender sender, LoginRateLimiter limiter, JwtService jwt) {
        this.props = props;
        this.sender = sender;
        this.limiter = limiter;
        this.jwt = jwt;
    }

    public void sendCode(String rawEmail, String ip) {
        String email = norm(rawEmail);
        if (!props.mail().enabled()) throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Email sending is not configured on the server yet.");
        String key = "otp-send:" + email;
        if (limiter.isBlocked(key) || limiter.isBlocked("otp-send-ip:" + ip)) throw new ApiException.TooManyRequests("Too many codes requested. Try again in a few minutes.");
        limiter.recordFailure(key);
        limiter.recordFailure("otp-send-ip:" + ip);
        String code = code(email, bucket());
        try {
            sender.send(email, "Your ServicePro verification code",
                    "Your ServicePro verification code is " + code + ".\n\nIt is valid for 10 minutes. If you did not ask for it, ignore this email.");
        } catch (RuntimeException e) {
            log.error("Could not send verification email: {}", e.getMessage());
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "We could not send the email. Try again in a moment.");
        }
    }

    /** @return a signed proof of the address when the code is right */
    public String verifyCode(String rawEmail, String code) {
        String email = norm(rawEmail);
        String key = "otp-verify:" + email;
        if (limiter.isBlocked(key)) throw new ApiException.TooManyRequests("Too many wrong codes. Request a new code in a few minutes.");
        String given = code == null ? "" : code.replaceAll("\\s", "");
        long b = bucket();
        if (eq(given, code(email, b)) || eq(given, code(email, b - 1))) {
            limiter.reset(key);
            return jwt.createEmailProof(email);
        }
        limiter.recordFailure(key);
        throw new ApiException.Unauthorized("That code is not correct or has expired. Request a new one.");
    }

    /** @return the verified email address, lower-cased */
    public String verifyEmail(String proof) {
        String email = proof == null || proof.isBlank() ? null : jwt.parseEmailProof(proof);
        if (email == null) throw new ApiException.Unauthorized("Email verification failed. Request a new code and try again.");
        return email;
    }

    private static String norm(String e) { return e == null ? "" : e.trim().toLowerCase(); }

    private static long bucket() { return System.currentTimeMillis() / 1000 / BUCKET_SECONDS; }

    private static boolean eq(String a, String b) {
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }

    private String code(String email, long bucket) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(props.jwt().secret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] h = mac.doFinal(("email-otp|" + email + "|" + bucket).getBytes(StandardCharsets.UTF_8));
            int n = ((h[0] & 0x7f) << 24) | ((h[1] & 0xff) << 16) | ((h[2] & 0xff) << 8) | (h[3] & 0xff);
            return String.format("%06d", n % 1_000_000);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
