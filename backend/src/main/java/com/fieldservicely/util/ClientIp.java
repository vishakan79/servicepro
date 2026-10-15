package com.fieldservicely.util;

import jakarta.servlet.http.HttpServletRequest;
import java.util.regex.Pattern;

/**
 * The caller's address for rate limiting. Behind Vercel and Render the socket peer is always a proxy, so every visitor would
 * share one limit bucket; the real address is the first entry of X-Forwarded-For. A client can forge that header, which only
 * lets it dodge the per-address limit; the per-email, per-phone and per-code limits still apply.
 */
public final class ClientIp {
    private ClientIp() {}

    private static final Pattern PLAUSIBLE = Pattern.compile("^[0-9a-fA-F:.]{3,45}$");

    public static String of(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            String first = xff.split(",")[0].trim();
            if (PLAUSIBLE.matcher(first).matches()) return first;
        }
        return req.getRemoteAddr();
    }
}
