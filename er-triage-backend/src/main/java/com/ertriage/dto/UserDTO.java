package com.ertriage.dto;

import com.ertriage.model.User;
import java.time.LocalDateTime;

public class UserDTO {
    private String id;
    private String username;
    private String fullName;
    private String email;
    private String role;
    private String department;
    private Boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime lastLogin;

    public UserDTO() {
    }

    public static UserDTO fromEntity(User user) {
        UserDTO dto = new UserDTO();
        dto.id = user.getId();
        dto.username = user.getUsername();
        dto.fullName = user.getFullName();
        dto.email = user.getEmail();
        dto.role = user.getRole().name();
        dto.department = user.getDepartment();
        dto.active = user.getActive();
        dto.createdAt = user.getCreatedAt();
        dto.lastLogin = user.getLastLogin();
        return dto;
    }

    public String getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public String getFullName() {
        return fullName;
    }

    public String getEmail() {
        return email;
    }

    public String getRole() {
        return role;
    }

    public String getDepartment() {
        return department;
    }

    public Boolean getActive() {
        return active;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getLastLogin() {
        return lastLogin;
    }
}
