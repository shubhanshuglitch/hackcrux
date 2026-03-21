package com.ertriage.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "resource_zones")
public class ResourceZone {

    @Id
    private String id;

    private String name;
    private String priorityLevel;
    private String description;
    private Boolean active;

    public ResourceZone() {
    }

    public ResourceZone(String id, String name, String priorityLevel, String description, Boolean active) {
        this.id = id;
        this.name = name;
        this.priorityLevel = priorityLevel;
        this.description = description;
        this.active = active;
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
}