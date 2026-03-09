package com.ertriage.controller;

import com.ertriage.model.Patient;
import com.ertriage.model.PatientEvent;
import com.ertriage.repository.PatientEventRepository;
import com.ertriage.repository.PatientRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final PatientRepository patientRepository;
    private final PatientEventRepository eventRepository;

    public AnalyticsController(PatientRepository patientRepository, PatientEventRepository eventRepository) {
        this.patientRepository = patientRepository;
        this.eventRepository = eventRepository;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAnalytics() {
        List<Patient> allPatients = patientRepository.findAll();
        List<PatientEvent> allEvents = eventRepository.findAll();

        Map<String, Object> stats = new LinkedHashMap<>();

        // Total counts
        stats.put("totalPatients", allPatients.size());
        stats.put("totalEvents", allEvents.size());

        // Priority breakdown
        Map<String, Long> priorityCounts = allPatients.stream()
                .filter(p -> p.getPriority() != null)
                .collect(Collectors.groupingBy(p -> p.getPriority().name(), Collectors.counting()));
        stats.put("priorityBreakdown", priorityCounts);

        // Event type breakdown
        Map<String, Long> eventCounts = allEvents.stream()
                .collect(Collectors.groupingBy(e -> e.getEventType().name(), Collectors.counting()));
        stats.put("eventBreakdown", eventCounts);

        // Discharges and handoffs
        long discharges = allEvents.stream()
                .filter(e -> e.getEventType() == PatientEvent.EventType.DISCHARGE).count();
        long handoffs = allEvents.stream()
                .filter(e -> e.getEventType() == PatientEvent.EventType.HANDOFF).count();
        stats.put("discharges", discharges);
        stats.put("handoffs", handoffs);

        // Patients today
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        long patientsToday = allPatients.stream()
                .filter(p -> p.getTimestamp() != null && p.getTimestamp().isAfter(startOfDay))
                .count();
        stats.put("patientsToday", patientsToday);

        // Average age
        OptionalDouble avgAge = allPatients.stream()
                .filter(p -> p.getAge() != null)
                .mapToInt(Patient::getAge)
                .average();
        stats.put("averageAge", avgAge.isPresent() ? Math.round(avgAge.getAsDouble()) : 0);

        // Recent events (last 10)
        List<Map<String, Object>> recentEvents = allEvents.stream()
                .sorted(Comparator.comparing(PatientEvent::getTimestamp).reversed())
                .limit(10)
                .map(e -> {
                    Map<String, Object> ev = new LinkedHashMap<>();
                    ev.put("type", e.getEventType().name());
                    ev.put("description", e.getDescription());
                    ev.put("performedBy", e.getPerformedBy());
                    ev.put("timestamp", e.getTimestamp().toString());
                    return ev;
                })
                .collect(Collectors.toList());
        stats.put("recentEvents", recentEvents);

        return ResponseEntity.ok(stats);
    }
}
