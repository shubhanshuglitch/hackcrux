package com.ertriage.config;

import com.ertriage.model.User;
import com.ertriage.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Arrays;
import java.util.List;

@Configuration
public class DataInitializer {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Bean
    public CommandLineRunner initializeDefaultUsers() {
        return args -> {
            if (userRepository.count() == 0) {
                String defaultPassword = passwordEncoder.encode("password123");
                List<User> defaultUsers = Arrays.asList(
                        User.builder().username("admin").fullName("System Administrator")
                                .email("admin@ertriage.com").password(defaultPassword)
                                .role(User.Role.ADMIN).department("Administration")
                                .active(true).createdAt(java.time.LocalDateTime.now()).build(),
                        User.builder().username("dr.smith").fullName("Dr. Sarah Smith")
                                .email("sarah.smith@hospital.com").password(defaultPassword)
                                .role(User.Role.DOCTOR).department("Emergency Medicine")
                                .active(true).createdAt(java.time.LocalDateTime.now()).build(),
                        User.builder().username("dr.patel").fullName("Dr. Rajesh Patel")
                                .email("rajesh.patel@hospital.com").password(defaultPassword)
                                .role(User.Role.DOCTOR).department("Emergency Medicine")
                                .active(true).createdAt(java.time.LocalDateTime.now()).build(),
                        User.builder().username("nurse.johnson").fullName("Emily Johnson")
                                .email("emily.johnson@hospital.com").password(defaultPassword)
                                .role(User.Role.NURSE).department("Emergency Department")
                                .active(true).createdAt(java.time.LocalDateTime.now()).build(),
                        User.builder().username("nurse.kumar").fullName("Priya Kumar")
                                .email("priya.kumar@hospital.com").password(defaultPassword)
                                .role(User.Role.NURSE).department("Emergency Department")
                                .active(true).createdAt(java.time.LocalDateTime.now()).build(),
                        User.builder().username("reception.admin").fullName("Michael Brown")
                                .email("reception@hospital.com").password(defaultPassword)
                                .role(User.Role.RECEPTIONIST).department("Front Desk")
                                .active(true).createdAt(java.time.LocalDateTime.now()).build());
                userRepository.saveAll(defaultUsers);
                System.out.println("Initialized " + defaultUsers.size() + " default users");
            }
        };
    }
}
