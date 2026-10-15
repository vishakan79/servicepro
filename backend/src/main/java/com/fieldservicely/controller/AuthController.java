package com.fieldservicely.controller;

import com.fieldservicely.config.AppProperties;
import com.fieldservicely.dto.AuthDtos.LoginRequest;
import com.fieldservicely.dto.AuthDtos.LoginResult;
import com.fieldservicely.dto.AuthDtos.RegisterRequest;
import com.fieldservicely.dto.AuthDtos.RegisterResponse;
import com.fieldservicely.dto.AuthDtos.RegisterStart;
import com.fieldservicely.dto.AuthDtos.TokenResponse;
import com.fieldservicely.dto.AuthDtos.UserView;
import com.fieldservicely.security.CurrentUser;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService auth;
    private final AppProperties props;
    private final RefreshCookie cookie;

    public AuthController(AuthService auth, AppProperties props, RefreshCookie cookie) {
        this.auth = auth;
        this.props = props;
        this.cookie = cookie;
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
