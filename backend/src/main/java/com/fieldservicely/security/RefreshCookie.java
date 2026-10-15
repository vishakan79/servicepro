package com.fieldservicely.security;

import com.fieldservicely.config.AppProperties;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/** Writes the httpOnly refresh-token cookie, set after every successful OTP sign-in. */
@Component
public class RefreshCookie {

    public static final String NAME = "refresh_token";

    private final AppProperties props;

    public RefreshCookie(AppProperties props) {
        this.props = props;
    }

    public void write(HttpServletResponse res, String value, Duration maxAge) {
        ResponseCookie cookie = ResponseCookie.from(NAME, value)
                .httpOnly(true)
                .secure(props.security().secureCookies())
                .sameSite("Strict")
                .path("/api/auth")
                .maxAge(maxAge)
                .build();
        res.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
