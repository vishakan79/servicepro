package com.fieldservicely.dto;

import com.fieldservicely.entity.Role;
import com.fieldservicely.entity.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class AuthDtos {
    private AuthDtos() {}

    /** At least 8 characters with a letter and a digit; 72 is BCrypt's limit. */
    private static final String PASSWORD_RULE = "^(?=.*[A-Za-z])(?=.*[0-9]).{8,72}$";
    private static final String PASSWORD_MSG = "must be 8-72 characters with at least one letter and one digit";

    public record LoginRequest(@NotBlank @Email @Size(max = 160) String email, @NotBlank @Size(max = 72) String password) {}

    /** Step 1 of registration: checks the details are free to use. Nothing is sent. */
    public record RegisterStart(@NotBlank @Size(max = 120) String name, @NotBlank @Email @Size(max = 160) String email,
                                @NotBlank @Size(max = 30) String phone, @NotNull Role role, @Size(max = 300) String address) {}

    /** Step 2: both Firebase proofs (email link and SMS code), the same details, and the password chosen by the person. */
    public record RegisterRequest(@NotBlank @Size(max = 120) String name, @NotBlank @Email @Size(max = 160) String email,
                                  @NotBlank @Size(max = 30) String phone, @NotNull Role role, @Size(max = 300) String address,
                                  @NotBlank @Pattern(regexp = PASSWORD_RULE, message = PASSWORD_MSG) String password,
                                  @NotBlank @Size(max = 4096) String emailIdToken,
                                  @NotBlank @Size(max = 4096) String phoneIdToken) {}

    public record UserView(Long id, String name, String email, String phone, Role role, Long customerId, Long technicianId,
                           boolean enabled, boolean approvalPending) {
        public static UserView of(User u) {
            return new UserView(u.getId(), u.getName(), u.getEmail(), u.getPhone(), u.getRole(), u.getCustomerId(), u.getTechnicianId(),
                    u.isEnabled(), u.isApprovalPending());
        }
    }

    public record TokenResponse(String accessToken, String tokenType, long expiresIn, UserView user) {}

    /** status is ACTIVE (the person can sign in now) or PENDING_APPROVAL (an administrator must approve first). */
    public record RegisterResponse(String status, String message) {}

    /** Internal: the refresh token travels only in an httpOnly cookie, never in the JSON body. */
    public record LoginResult(TokenResponse body, String refreshToken) {}

    /** An administrator adds staff and sets a first password to hand over; the person should change it. */
    public record InviteUser(@NotBlank @Size(max = 120) String name, @NotBlank @Email @Size(max = 160) String email,
                             @NotBlank @Size(max = 30) String phone, @NotNull Role role,
                             @NotBlank @Pattern(regexp = PASSWORD_RULE, message = PASSWORD_MSG) String password) {}
}
