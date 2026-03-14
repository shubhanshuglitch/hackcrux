package com.ertriage.dto;

import java.time.LocalDateTime;
import java.util.List;

public class RecycleBinPatientDTO {
    private String id;
    private PatientDTO patient;
    private List<PatientEventDTO> timeline;
    private LocalDateTime deletedAt;
    private String deleteReason;
    private String deletedBy;
    private LocalDateTime purgeAt;

    public RecycleBinPatientDTO() {
    }

    public RecycleBinPatientDTO(String id, PatientDTO patient, List<PatientEventDTO> timeline,
                                LocalDateTime deletedAt, String deleteReason, String deletedBy,
                                LocalDateTime purgeAt) {
        this.id = id;
        this.patient = patient;
        this.timeline = timeline;
        this.deletedAt = deletedAt;
        this.deleteReason = deleteReason;
        this.deletedBy = deletedBy;
        this.purgeAt = purgeAt;
    }

    public String getId() {
        return id;
    }

    public PatientDTO getPatient() {
        return patient;
    }

    public List<PatientEventDTO> getTimeline() {
        return timeline;
    }

    public LocalDateTime getDeletedAt() {
        return deletedAt;
    }

    public String getDeleteReason() {
        return deleteReason;
    }

    public String getDeletedBy() {
        return deletedBy;
    }

    public LocalDateTime getPurgeAt() {
        return purgeAt;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setPatient(PatientDTO patient) {
        this.patient = patient;
    }

    public void setTimeline(List<PatientEventDTO> timeline) {
        this.timeline = timeline;
    }

    public void setDeletedAt(LocalDateTime deletedAt) {
        this.deletedAt = deletedAt;
    }

    public void setDeleteReason(String deleteReason) {
        this.deleteReason = deleteReason;
    }

    public void setDeletedBy(String deletedBy) {
        this.deletedBy = deletedBy;
    }

    public void setPurgeAt(LocalDateTime purgeAt) {
        this.purgeAt = purgeAt;
    }
}