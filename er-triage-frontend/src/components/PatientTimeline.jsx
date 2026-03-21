import React, { useState } from 'react';

export default function PatientTimeline({ events }) {
    const [expanded, setExpanded] = useState(false);

    if (!events || events.length === 0) return null;

    const formatTime = (ts) => {
        if (!ts) return '';
        return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const typeLabels = {
        INTAKE: '📥 Intake',
        REASSESSMENT: '🔄 Reassessment',
        PRIORITY_CHANGE: '⚡ Priority Changed',
        RESOURCE_ALLOCATION: '🧩 Resource Allocation',
        HANDOFF: '🔀 Handoff',
        DISCHARGE: '🏠 Discharge',
    };

    return (
        <div className="patient-timeline">
            <button className="timeline-toggle" onClick={() => setExpanded(!expanded)}>
                {expanded ? '▾' : '▸'} Timeline ({events.length} event{events.length !== 1 ? 's' : ''})
            </button>
            {expanded && (
                <div className="timeline-events">
                    {events.map((evt, idx) => (
                        <div key={idx} className={`timeline-event type-${evt.eventType}`}>
                            <span className="timeline-event-time">{formatTime(evt.timestamp)}</span>
                            <span className="timeline-event-text">
                                {typeLabels[evt.eventType] || evt.eventType}{evt.description ? ` — ${evt.description}` : ''}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
