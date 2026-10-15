package com.fieldservicely.config;

import com.fieldservicely.entity.Role;
import com.fieldservicely.entity.User;
import com.fieldservicely.repository.UserRepository;
import com.fieldservicely.util.PhoneNumbers;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Creates the first ADMIN from BOOTSTRAP_ADMIN_EMAIL / _PHONE / _PASSWORD when that account does not exist yet.
 * The password is hashed with BCrypt and never logged. After the first sign-in the variable can be removed.
 */
@Component
public class AdminBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    private final UserRepository users;
    private final AppProperties props;
    private final PasswordEncoder encoder;

    public AdminBootstrap(UserRepository users, AppProperties props, PasswordEncoder encoder) {
        this.users = users;
        this.props = props;
        this.encoder = encoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        AppProperties.Bootstrap b = props.bootstrap();
        String email = b == null || b.adminEmail() == null ? "" : b.adminEmail().trim().toLowerCase();
        String rawPhone = b == null || b.adminPhone() == null ? "" : b.adminPhone().trim();
        String password = b == null || b.adminPassword() == null ? "" : b.adminPassword();
        if (email.isEmpty() || rawPhone.isEmpty() || password.isEmpty()) {
            if (users.count() == 0) {
                log.warn("No users exist and no first admin is configured. Set BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PHONE (+countrycode...) and BOOTSTRAP_ADMIN_PASSWORD, then restart.");
            }
            return;
        }
        if (password.length() < 8 || password.length() > 72) {
            throw new IllegalStateException("BOOTSTRAP_ADMIN_PASSWORD must be 8 to 72 characters");
        }
        String phone = PhoneNumbers.normalize(rawPhone); // fails startup with a clear message if the number is malformed
        if (users.existsByEmailIgnoreCase(email) || users.existsByPhone(phone)) return;
        User u = new User();
        u.setName(b.adminName() == null || b.adminName().isBlank() ? "Administrator" : b.adminName().trim());
        u.setEmail(email);
        u.setPhone(phone);
        u.setPasswordHash(encoder.encode(password));
        u.setEmailVerified(true);
        u.setPhoneVerified(true);
        u.setRole(Role.ADMIN);
        u.setEnabled(true);
        users.save(u);
        log.info("Created the first admin account for {}. Sign in with that email and the configured password.", email);
    }
}
