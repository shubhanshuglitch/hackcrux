package com.ertriage.dto;

import com.ertriage.model.Patient;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatientDTO {
    private Long id;
    private String name;
    private Integer age;
    private String symptoms;
    private String vitals;
    private String priority;
    private String rawInput;
    private LocalDateTime timestamp;

    public static PatientDTO fromEntity(Patient patient) {
        return PatientDTO.builder()
                .id(patient.getId())
                .name(patient.getName())
                .age(patient.getAge())
                .symptoms(patient.getSymptoms())
                .vitals(patient.getVitals())
                .priority(patient.getPriority() != null ? patient.getPriority().name() : "GREEN")
                .rawInput(patient.getRawInput())
                .timestamp(patient.getTimestamp())
                .build();
    }
}
