package main.java.com.ertriage.dto;

import java.util.ArrayList;
import java.util.List;

public class ResourceZoneDTO {
    private String id;
    private String name;
    private String priorityLevel;
    private String description;
    private Boolean active;
    private Integer totalRooms;
    private Integer availableRooms;
    private List<ResourceRoomDTO> rooms;

    public ResourceZoneDTO() {
        this.rooms = new ArrayList<>();
    }

    public ResourceZoneDTO(String id, String name, String priorityLevel, String description, Boolean active,
            Integer totalRooms, Integer availableRooms, List<ResourceRoomDTO> rooms) {
        this.id = id;
        this.name = name;
        this.priorityLevel = priorityLevel;
        this.description = description;
        this.active = active;
        this.totalRooms = totalRooms;
        this.availableRooms = availableRooms;
        this.rooms = rooms != null ? rooms : new ArrayList<>();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPriorityLevel() {
        return priorityLevel;
    }

    public void setPriorityLevel(String priorityLevel) {
        this.priorityLevel = priorityLevel;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    public Integer getTotalRooms() {
        return totalRooms;
    }

    public void setTotalRooms(Integer totalRooms) {
        this.totalRooms = totalRooms;
    }

    public Integer getAvailableRooms() {
        return availableRooms;
    }

    public void setAvailableRooms(Integer availableRooms) {
        this.availableRooms = availableRooms;
    }

    public List<ResourceRoomDTO> getRooms() {
        return rooms;
    }

    public void setRooms(List<ResourceRoomDTO> rooms) {
        this.rooms = rooms;
    }
}