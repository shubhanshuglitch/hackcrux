import React, { useState, useRef } from 'react';

export default function TaskAssignment({ onAddTask, tasks }) {
  const [showPanel, setShowPanel] = useState(false);
  const [taskInput, setTaskInput] = useState('');
  const [assignTo, setAssignTo] = useState('');
  const [priority, setPriority] = useState('normal');
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const doctors = [
    'Dr. Sarah Johnson',
    'Dr. Rajesh Patel',
    'Dr. Emily Davis'
  ];

  const handleAddTask = (e) => {
    e.preventDefault();
    if (taskInput.trim() && assignTo) {
      onAddTask({
        title: taskInput,
        assignedTo: assignTo,
        priority,
        timestamp: new Date().toLocaleTimeString()
      });
      setTaskInput('');
      setAssignTo('');
      setPriority('normal');
    }
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const formatTime = (time) => {
    if (!time) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSliderChange = (e) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const pendingTasks = tasks.filter(t => !t.completed).length;
  const completedTasks = tasks.filter(t => t.completed).length;

  return (
    <>
      <button 
        className="task-assignment-toggle"
        onClick={() => setShowPanel(!showPanel)}
      >
        <span className="badge-count">{pendingTasks}</span>
        📋 Tasks
      </button>

      {showPanel && (
        <div className="task-assignment-panel">
          <div className="task-assignment-header">
            <h3>Task Assignment</h3>
            <button 
              className="close-btn"
              onClick={() => setShowPanel(false)}
            >×</button>
          </div>

          <div className="task-assignment-content">
            <div className="task-stats">
              <div className="stat">
                <span className="stat-icon">📌</span>
                <span className="stat-count">{pendingTasks}</span>
              </div>
              <div className="stat">
                <span className="stat-icon">✅</span>
                <span className="stat-count">{completedTasks}</span>
              </div>
            </div>

            <form onSubmit={handleAddTask} className="task-assignment-form">
              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Task Description</label>
                  <input
                    type="text"
                    placeholder="Enter task description..."
                    value={taskInput}
                    onChange={(e) => setTaskInput(e.target.value)}
                    className="task-input"
                  />
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select 
                    value={priority} 
                    onChange={(e) => setPriority(e.target.value)}
                    className="priority-select"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Assign To</label>
                <select 
                  value={assignTo} 
                  onChange={(e) => setAssignTo(e.target.value)}
                  className="assign-select"
                >
                  <option value="">Select Doctor</option>
                  {doctors.map(doc => (
                    <option key={doc} value={doc}>{doc}</option>
                  ))}
                </select>
              </div>

              <button type="submit" className="task-submit-btn">
                + Add Task
              </button>
            </form>

            <div className="audio-player">
              <button 
                className="play-btn"
                onClick={handlePlayPause}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>

              <div className="audio-controls">
                <span className="time">{formatTime(currentTime)}</span>
                <input 
                  type="range" 
                  min="0" 
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSliderChange}
                  className="audio-slider"
                />
                <span className="time">{formatTime(duration)}</span>
              </div>

              <button className="speaker-btn">🔊</button>

              <audio 
                ref={audioRef}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
              />
            </div>

            <div className="task-list">
              {tasks.length === 0 ? (
                <p className="empty-state">No tasks yet. Add your first task above.</p>
              ) : (
                tasks.slice(0, 5).map(task => (
                  <div key={task.id} className={`task-item-panel ${task.completed ? 'completed' : ''}`}>
                    <input 
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => {}}
                      className="task-checkbox"
                    />
                    <div className="task-details">
                      <p className="task-title">{task.title}</p>
                      <p className="task-meta">
                        <span className="doctor">👨‍⚕️ {task.assignedTo}</span>
                        <span className="time">🕐 {task.timestamp}</span>
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
