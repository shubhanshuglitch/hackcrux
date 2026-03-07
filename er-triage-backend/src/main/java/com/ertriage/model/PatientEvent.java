package com.ertriage.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "patient_events")
public class PatientEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long patientId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EventType eventType;

    @Column(length = 500)
    private String description;

    private String oldPriority;
    private String newPriority;
    private String performedBy;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    public enum EventType {
        INTAKE, REASSESSMENT, PRIORITY_CHANGE, HANDOFF, DISCHARGE
    }

    public PatientEvent() {
    }

    public PatientEvent(Long patientId, EventType eventType, String description,
            String oldPriority, String newPriority, String performedBy) {
        this.patientId = patientId;
        this.eventType = eventType;
        this.description = description;
        this.oldPriority = oldPriority;
        this.newPriority = newPriority;
        this.performedBy = performedBy;
        this.timestamp = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public Long getPatientId() {
        return patientId;
    }

    public EventType getEventType() {
        return eventType;
    }

    public String getDescription() {
        return description;
    }

    public String getOldPriority() {
        return oldPriority;
    }

    public String getNewPriority() {
        return newPriority;
    }

    public String getPerformedBy() {
        return performedBy;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setPatientId(Long patientId) {
        this.patientId = patientId;
    }

    public void setEventType(EventType eventType) {
        this.eventType = eventType;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public void setOldPriority(String oldPriority) {
        this.oldPriority = oldPriority;
    }

    public void setNewPriority(String newPriority) {
        this.newPriority = newPriority;
    }

    public void setPerformedBy(String performedBy) {
        this.performedBy = performedBy;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
}
