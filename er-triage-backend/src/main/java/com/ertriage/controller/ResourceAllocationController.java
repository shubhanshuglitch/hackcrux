package main.java.com.ertriage.controller;

import com.ertriage.dto.ResourceZoneDTO;
import com.ertriage.service.ResourceAllocationCatalogService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/resource-allocation")
public class ResourceAllocationController {

    private final ResourceAllocationCatalogService resourceAllocationCatalogService;

    public ResourceAllocationController(ResourceAllocationCatalogService resourceAllocationCatalogService) {
        this.resourceAllocationCatalogService = resourceAllocationCatalogService;
    }

    @GetMapping("/zones")
    public ResponseEntity<List<ResourceZoneDTO>> getZones() {
        return ResponseEntity.ok(resourceAllocationCatalogService.getZoneOverview());
    }

    @PostMapping("/zones")
    public ResponseEntity<?> createZone(@RequestBody Map<String, String> body) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(resourceAllocationCatalogService.createZone(
                    body.get("name"),
                    body.get("priorityLevel"),
                    body.get("description")));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/rooms")
    public ResponseEntity<?> createRoom(@RequestBody Map<String, String> body) {
        try {
            Integer capacity = null;
            String capacityValue = body.get("capacity");
            if (capacityValue != null && !capacityValue.isBlank()) {
                capacity = Integer.valueOf(capacityValue.trim());
            }
            return ResponseEntity.status(HttpStatus.CREATED).body(resourceAllocationCatalogService.createRoom(
                    body.get("zoneId"),
                    body.get("roomCode"),
                    capacity));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}