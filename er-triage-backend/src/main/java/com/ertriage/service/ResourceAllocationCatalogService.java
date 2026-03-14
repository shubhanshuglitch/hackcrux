package com.ertriage.service;

import com.ertriage.dto.ResourceRoomDTO;
import com.ertriage.dto.ResourceZoneDTO;
import com.ertriage.model.Patient;
import com.ertriage.model.ResourceRoom;
import com.ertriage.model.ResourceZone;
import com.ertriage.repository.PatientRepository;
import com.ertriage.repository.ResourceRoomRepository;
import com.ertriage.repository.ResourceZoneRepository;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class ResourceAllocationCatalogService {

    private final ResourceZoneRepository resourceZoneRepository;
    private final ResourceRoomRepository resourceRoomRepository;
    private final PatientRepository patientRepository;

    public ResourceAllocationCatalogService(ResourceZoneRepository resourceZoneRepository,
            ResourceRoomRepository resourceRoomRepository,
            PatientRepository patientRepository) {
        this.resourceZoneRepository = resourceZoneRepository;
        this.resourceRoomRepository = resourceRoomRepository;
        this.patientRepository = patientRepository;
    }

    public List<ResourceZoneDTO> getZoneOverview() {
        ensureDefaults();

        List<ResourceZone> zones = resourceZoneRepository.findByActiveTrueOrderByNameAsc();
        Map<String, Patient> occupancyByRoom = patientRepository.findAll().stream()
                .filter(patient -> patient.getAssignedRoom() != null && !patient.getAssignedRoom().isBlank())
                .collect(Collectors.toMap(Patient::getAssignedRoom, patient -> patient, (first, second) -> first));

        Map<String, List<ResourceRoom>> roomsByZone = resourceRoomRepository
                .findByZoneIdInAndActiveTrueOrderByRoomCodeAsc(
                        zones.stream().map(ResourceZone::getId).filter(Objects::nonNull).collect(Collectors.toList()))
                .stream()
                .collect(Collectors.groupingBy(ResourceRoom::getZoneId, LinkedHashMap::new, Collectors.toList()));

        return zones.stream().map(zone -> {
            List<ResourceRoomDTO> roomDtos = roomsByZone.getOrDefault(zone.getId(), List.of()).stream()
                    .map(room -> toRoomDto(room, occupancyByRoom.get(room.getRoomCode())))
                    .collect(Collectors.toList());

            int totalRooms = roomDtos.size();
            int availableRooms = (int) roomDtos.stream().filter(room -> !Boolean.TRUE.equals(room.getOccupied())).count();

            return new ResourceZoneDTO(
                    zone.getId(),
                    zone.getName(),
                    zone.getPriorityLevel(),
                    zone.getDescription(),
                    zone.getActive(),
                    totalRooms,
                    availableRooms,
                    roomDtos);
        }).collect(Collectors.toList());
    }

    public ResourceZoneDTO createZone(String name, String priorityLevel, String description) {
        ensureDefaults();

        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Zone name is required");
        }
        if (priorityLevel == null || priorityLevel.trim().isEmpty()) {
            throw new IllegalArgumentException("Priority level is required");
        }
        if (resourceZoneRepository.existsByNameIgnoreCase(name.trim())) {
            throw new IllegalArgumentException("Zone already exists: " + name.trim());
        }

        ResourceZone zone = new ResourceZone();
        zone.setName(name.trim());
        zone.setPriorityLevel(priorityLevel.trim().toUpperCase());
        zone.setDescription(description == null ? "" : description.trim());
        zone.setActive(true);
        resourceZoneRepository.save(zone);

        return getZoneOverview().stream()
                .filter(item -> item.getId().equals(zone.getId()))
                .findFirst()
                .orElse(new ResourceZoneDTO(zone.getId(), zone.getName(), zone.getPriorityLevel(), zone.getDescription(),
                        zone.getActive(), 0, 0, List.of()));
    }

    public ResourceRoomDTO createRoom(String zoneId, String roomCode, Integer capacity) {
        ensureDefaults();

        if (zoneId == null || zoneId.trim().isEmpty()) {
            throw new IllegalArgumentException("Zone is required");
        }
        ResourceZone zone = resourceZoneRepository.findById(zoneId)
                .orElseThrow(() -> new IllegalArgumentException("Zone not found"));

        if (roomCode == null || roomCode.trim().isEmpty()) {
            throw new IllegalArgumentException("Room code is required");
        }
        if (resourceRoomRepository.existsByRoomCodeIgnoreCase(roomCode.trim())) {
            throw new IllegalArgumentException("Room already exists: " + roomCode.trim());
        }

        ResourceRoom room = new ResourceRoom();
        room.setZoneId(zone.getId());
        room.setRoomCode(roomCode.trim().toUpperCase());
        room.setCapacity(capacity == null || capacity < 1 ? 1 : capacity);
        room.setActive(true);
        resourceRoomRepository.save(room);

        return toRoomDto(room, null);
    }

    public List<ResourceZone> getActiveZones() {
        ensureDefaults();
        return resourceZoneRepository.findByActiveTrueOrderByNameAsc();
    }

    public List<ResourceRoom> getActiveRooms() {
        ensureDefaults();
        return resourceRoomRepository.findByActiveTrueOrderByRoomCodeAsc();
    }

    private ResourceRoomDTO toRoomDto(ResourceRoom room, Patient occupant) {
        return new ResourceRoomDTO(
                room.getId(),
                room.getRoomCode(),
                room.getCapacity(),
                room.getActive(),
                occupant != null,
                occupant == null ? null : occupant.getName());
    }

    private void ensureDefaults() {
        if (resourceZoneRepository.count() > 0 && resourceRoomRepository.count() > 0) {
            return;
        }

        ResourceZone redZone = createDefaultZone("Resuscitation Bay", "RED", "Critical care and emergency response");
        ResourceZone yellowZone = createDefaultZone("Observation Unit", "YELLOW", "Monitored observation and stabilization");
        ResourceZone greenZone = createDefaultZone("Fast Track", "GREEN", "Low-acuity rapid treatment area");

        seedRooms(redZone, List.of("TR-1", "TR-2", "TR-3", "TR-4"));
        seedRooms(yellowZone, List.of("OBS-1", "OBS-2", "OBS-3", "OBS-4", "OBS-5", "OBS-6"));
        seedRooms(greenZone, List.of("FT-1", "FT-2", "FT-3", "FT-4", "FT-5", "FT-6", "FT-7", "FT-8"));
    }

    private ResourceZone createDefaultZone(String name, String priorityLevel, String description) {
        return resourceZoneRepository.findByActiveTrueOrderByNameAsc().stream()
                .filter(zone -> zone.getName().equalsIgnoreCase(name))
                .findFirst()
                .orElseGet(() -> resourceZoneRepository.save(new ResourceZone(null, name, priorityLevel, description, true)));
    }

    private void seedRooms(ResourceZone zone, List<String> roomCodes) {
        for (String roomCode : roomCodes) {
            if (!resourceRoomRepository.existsByRoomCodeIgnoreCase(roomCode)) {
                resourceRoomRepository.save(new ResourceRoom(null, zone.getId(), roomCode, 1, true));
            }
        }
    }
}