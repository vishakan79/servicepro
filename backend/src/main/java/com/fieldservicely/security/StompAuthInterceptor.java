package com.fieldservicely.security;

import io.jsonwebtoken.JwtException;
import java.security.Principal;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

/**
 * Authenticates the STOMP CONNECT frame with the same JWT the REST API uses, and limits what each role may subscribe to:
 * the broadcast topic carries every work order, so it is staff-only; personal notifications are per user.
 */
@Component
public class StompAuthInterceptor implements ChannelInterceptor {

    private final JwtService jwt;

    public StompAuthInterceptor(JwtService jwt) {
        this.jwt = jwt;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor acc = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (acc == null || acc.getCommand() == null) return message;

        if (StompCommand.CONNECT.equals(acc.getCommand())) {
            String header = acc.getFirstNativeHeader("Authorization");
            if (header == null || !header.startsWith("Bearer ")) throw new MessagingException("Missing bearer token");
            try {
                AuthUser user = jwt.parse(header.substring(7));
                acc.setUser(new StompPrincipal(user));
            } catch (JwtException | IllegalArgumentException e) {
                throw new MessagingException("Invalid or expired token");
            }
        } else if (StompCommand.SUBSCRIBE.equals(acc.getCommand())) {
            Principal p = acc.getUser();
            if (!(p instanceof StompPrincipal sp)) throw new MessagingException("Not authenticated");
            String dest = acc.getDestination() == null ? "" : acc.getDestination();
            boolean ok = dest.startsWith("/user/queue/") || (dest.startsWith("/topic/") && sp.user().isStaff());
            if (!ok) throw new MessagingException("Subscription not allowed");
        } else if (StompCommand.SEND.equals(acc.getCommand())) {
            // Clients only receive; there are no application destinations to send to.
            throw new MessagingException("Sending is not allowed");
        }
        return message;
    }
}
