package com.ertriage.repository;

import com.ertriage.model.Task;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface TaskRepository extends MongoRepository<Task, String> {
    List<Task> findAllByOrderByCreatedAtDesc();
    List<Task> findByCompletedFalseOrderByCreatedAtDesc();
}
