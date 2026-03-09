package com.ertriage.controller;

import com.ertriage.model.Task;
import com.ertriage.repository.TaskRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tasks")
@CrossOrigin(origins = "*")
public class TaskController {

    private final TaskRepository taskRepository;

    public TaskController(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    @GetMapping
    public ResponseEntity<List<Task>> getAllTasks() {
        return ResponseEntity.ok(taskRepository.findAllByOrderByCreatedAtDesc());
    }

    @PostMapping
    public ResponseEntity<Task> createTask(@RequestBody Map<String, String> body) {
        String title = body.get("title");
        String priority = body.getOrDefault("priority", "normal");
        if (title == null || title.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        Task task = new Task(title.trim(), Task.Priority.valueOf(priority));
        return ResponseEntity.status(HttpStatus.CREATED).body(taskRepository.save(task));
    }

    @PutMapping("/{id}/complete")
    public ResponseEntity<Task> completeTask(@PathVariable Long id) {
        return taskRepository.findById(id).map(task -> {
            task.setCompleted(true);
            return ResponseEntity.ok(taskRepository.save(task));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable Long id) {
        if (!taskRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        taskRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
