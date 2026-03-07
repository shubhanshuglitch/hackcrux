package com.ertriage.config;

import com.ertriage.model.User;
import com.ertriage.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.util.Arrays;
import java.util.List;

@Configuration
public class DataInitializer {
    private final UserRepository userRepository;

    public DataInitializer(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Bean
    public CommandLineRunner initializeDefaultUsers() {
        return args -> {
            if (userRepository.count() == 0) {
                List<User> defaultUsers = Arrays.asList(
                        User.builder().username("admin").fullName("System Administrator")
                                .email("admin@ertriage.com").role(User.Role.ADMIN).department("Administration")
                                .active(true).build(),
                        User.builder().username("dr.smith").fullName("Dr. Sarah Smith")
                                .email("sarah.smith@hospital.com").role(User.Role.DOCTOR)
                                .department("Emergency Medicine").active(true).build(),
                        User.builder().username("dr.patel").fullName("Dr. Rajesh Patel")
                                .email("rajesh.patel@hospital.com").role(User.Role.DOCTOR)
                                .department("Emergency Medicine").active(true).build(),
                        User.builder().username("nurse.johnson").fullName("Emily Johnson")
                                .email("emily.johnson@hospital.com").role(User.Role.NURSE)
                                .department("Emergency Department").active(true).build(),
                        User.builder().username("nurse.kumar").fullName("Priya Kumar")
                                .email("priya.kumar@hospital.com").role(User.Role.NURSE)
                                .department("Emergency Department").active(true).build(),
                        User.builder().username("reception.admin").fullName("Michael Brown")
                                .email("reception@hospital.com").role(User.Role.RECEPTIONIST).department("Front Desk")
                                .active(true).build());
                userRepository.saveAll(defaultUsers);
                System.out.println("Initialized " + defaultUsers.size() + " default users");
            }
        };
    }
}
