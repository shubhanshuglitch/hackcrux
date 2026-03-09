package com.ertriage.repository;

import com.ertriage.model.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PatientRepository extends JpaRepository<Patient, Long> {
    List<Patient> findAllByOrderByPriorityAscTimestampAsc();
    List<Patient> findByNameContainingIgnoreCaseOrSymptomsContainingIgnoreCase(String name, String symptoms);
}
