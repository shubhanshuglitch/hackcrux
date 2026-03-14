package com.ertriage;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class ErTriageBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(ErTriageBackendApplication.class, args);
    }
}