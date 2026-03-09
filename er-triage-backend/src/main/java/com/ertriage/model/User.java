package com.ertriage.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false)
    private String fullName;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(nullable = false)
    private String department;

    @Column(nullable = false)
    private Boolean active;

    private LocalDateTime createdAt;
    private LocalDateTime lastLogin;

    public enum Role {
        ADMIN, DOCTOR, NURSE, RECEPTIONIST
    }

    public User() {
    }

    public User(Long id, String username, String fullName, String email, String password, Role role,
            String department, Boolean active, LocalDateTime createdAt, LocalDateTime lastLogin) {
        this.id = id;
        this.username = username;
        this.fullName = fullName;
        this.email = email;
        this.password = password;
        this.role = role;
        this.department = department;
        this.active = active;
        this.createdAt = createdAt;
        this.lastLogin = lastLogin;
    }

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        if (this.active == null)
            this.active = true;
    }

    public Long getId() {
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

    public String getPassword() {
        return password;
    }

    public Role getRole() {
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

    public void setId(Long id) {
        this.id = id;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public void setLastLogin(LocalDateTime lastLogin) {
        this.lastLogin = lastLogin;
    }

    public static UserBuilder builder() {
        return new UserBuilder();
    }

    public static class UserBuilder {
        private Long id;
        private String username;
        private String fullName;
        private String email;
        private String password;
        private Role role;
        private String department;
        private Boolean active;
        private LocalDateTime createdAt;
        private LocalDateTime lastLogin;

        public UserBuilder id(Long id) {
            this.id = id;
            return this;
        }

        public UserBuilder username(String u) {
            this.username = u;
            return this;
        }

        public UserBuilder fullName(String f) {
            this.fullName = f;
            return this;
        }

        public UserBuilder email(String e) {
            this.email = e;
            return this;
        }

        public UserBuilder password(String p) {
            this.password = p;
            return this;
        }

        public UserBuilder role(Role r) {
            this.role = r;
            return this;
        }

        public UserBuilder department(String d) {
            this.department = d;
            return this;
        }

        public UserBuilder active(Boolean a) {
            this.active = a;
            return this;
        }

        public UserBuilder createdAt(LocalDateTime c) {
            this.createdAt = c;
            return this;
        }

        public UserBuilder lastLogin(LocalDateTime l) {
            this.lastLogin = l;
            return this;
        }

        public User build() {
            return new User(id, username, fullName, email, password, role, department, active, createdAt, lastLogin);
        }
    }
}
