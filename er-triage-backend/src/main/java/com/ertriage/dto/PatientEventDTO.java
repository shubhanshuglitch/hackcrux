package com.ertriage.dto;

import java.time.LocalDateTime;

public class PatientEventDTO {
    private Long id;
    private String eventType;
    private String description;
    private String oldPriority;
    private String newPriority;
    private String performedBy;
    private LocalDateTime timestamp;

    public PatientEventDTO() {
    }

    public PatientEventDTO(Long id, String eventType, String description,
            String oldPriority, String newPriority,
            String performedBy, LocalDateTime timestamp) {
        this.id = id;
        this.eventType = eventType;
        this.description = description;
        this.oldPriority = oldPriority;
        this.newPriority = newPriority;
        this.performedBy = performedBy;
        this.timestamp = timestamp;
    }

    public Long getId() {
        return id;
    }

    public String getEventType() {
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

    public void setEventType(String eventType) {
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
