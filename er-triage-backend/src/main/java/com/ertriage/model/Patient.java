package com.ertriage.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "patients")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Patient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private Integer age;

    @Column(length = 1000)
    private String symptoms;

    @Column(length = 500)
    private String vitals;

    @Enumerated(EnumType.STRING)
    private Priority priority;

    @Column(length = 2000)
    private String rawInput;

    private LocalDateTime timestamp;

    public enum Priority {
        RED, YELLOW, GREEN
    }

    @PrePersist
    public void prePersist() {
        this.timestamp = LocalDateTime.now();
    }
}
