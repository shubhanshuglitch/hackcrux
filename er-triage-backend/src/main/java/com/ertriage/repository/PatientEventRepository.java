package com.ertriage.repository;

import com.ertriage.model.PatientEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PatientEventRepository extends JpaRepository<PatientEvent, Long> {
    List<PatientEvent> findByPatientIdOrderByTimestampAsc(Long patientId);

    List<PatientEvent> findByPatientIdInOrderByTimestampAsc(List<Long> patientIds);

    void deleteByPatientId(Long patientId);
}
