import React, { useEffect } from 'react';

export default function Toast({ message, type = 'success', duration = 3000, onClose }) {
    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(onClose, duration);
            return () => clearTimeout(timer);
        }
    }, [duration]); // ── FIX: Remove onClose from dependency array to prevent timer reset ──

    return (
        <div className={`toast toast-${type}`}>
            <span className="toast-icon">
                {type === 'success' && '✅'}
                {type === 'error' && '❌'}
                {type === 'info' && 'ℹ️'}
            </span>
            <span className="toast-message">{message}</span>
        </div>
    );
}
