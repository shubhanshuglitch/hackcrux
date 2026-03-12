package com.ertriage.service;

import com.ertriage.model.User;
import com.ertriage.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public List<User> getActiveUsers() {
        return userRepository.findByActiveTrue();
    }

    public Optional<User> getUserById(String id) {
        return userRepository.findById(id);
    }

    public Optional<User> getUserByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public List<User> getUsersByRole(User.Role role) {
        return userRepository.findByRole(role);
    }

    public List<User> getUsersByDepartment(String department) {
        return userRepository.findByDepartment(department);
    }

    public User createUser(User user) {
        if (userRepository.existsByUsername(user.getUsername()))
            throw new IllegalArgumentException("Username already exists: " + user.getUsername());
        if (userRepository.existsByEmail(user.getEmail()))
            throw new IllegalArgumentException("Email already exists: " + user.getEmail());
        if (user.getPassword() == null || user.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode("password123"));
        } else if (!user.getPassword().startsWith("$2a$")) {
            user.setPassword(passwordEncoder.encode(user.getPassword()));
        }
        if (user.getCreatedAt() == null) {
            user.setCreatedAt(LocalDateTime.now());
        }
        if (user.getActive() == null) {
            user.setActive(true);
        }
        return userRepository.save(user);
    }

    public User updateUser(String id, User updatedUser) {
        User existing = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + id));
        existing.setFullName(updatedUser.getFullName());
        existing.setEmail(updatedUser.getEmail());
        existing.setRole(updatedUser.getRole());
        existing.setDepartment(updatedUser.getDepartment());
        existing.setSpecialization(updatedUser.getSpecialization());
        existing.setActive(updatedUser.getActive());
        return userRepository.save(existing);
    }

    public void deactivateUser(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + id));
        user.setActive(false);
        userRepository.save(user);
    }

    public void deleteUser(String id) {
        if (!userRepository.existsById(id))
            throw new IllegalArgumentException("User not found: " + id);
        userRepository.deleteById(id);
    }
}
