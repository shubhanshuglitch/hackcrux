import React, { useState, useRef, useEffect } from 'react';
import { submitPatient } from '../api/patientApi.js';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export default function VoiceCapture({ onPatientAdded }) {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [status, setStatus] = useState(null); // { type: 'info'|'success'|'error', message }
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSupported] = useState(() => !!SpeechRecognition);
    const recognitionRef = useRef(null);

    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const startRecording = () => {
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsRecording(true);
            setStatus({ type: 'info', message: '🎙 Listening... Speak the patient details clearly.' });
        };

        recognition.onresult = (event) => {
            let finalText = '';
            let interimText = '';
            for (let i = 0; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalText += result[0].transcript + ' ';
                } else {
                    interimText += result[0].transcript;
                }
            }
            setTranscript(finalText + interimText);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setIsRecording(false);
            setStatus({ type: 'error', message: `Microphone error: ${event.error}. Please check permissions.` });
        };

        recognition.onend = () => {
            setIsRecording(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    const stopRecording = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setIsRecording(false);
        setStatus({ type: 'info', message: '✅ Recording stopped. Review the transcript and click Analyze & Submit.' });
    };

    const handleRecordToggle = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const handleSubmit = async () => {
        const text = transcript.trim();
        if (!text) {
            setStatus({ type: 'error', message: 'Please record or type patient information before submitting.' });
            return;
        }

        setIsSubmitting(true);
        setStatus({ type: 'info', message: '🧠 AI is analyzing patient data and assigning priority...' });

        try {
            const patient = await submitPatient(text);
            const priorityLabel = { RED: '🔴 Critical', YELLOW: '🟡 Urgent', GREEN: '🟢 Standard' }[patient.priority] || patient.priority;
            setStatus({ type: 'success', message: `✅ Patient added! Priority: ${priorityLabel}` });
            setTranscript('');
            if (onPatientAdded) onPatientAdded(patient);
        } catch (err) {
            setStatus({ type: 'error', message: `Failed to process: ${err.message}. Is the backend running at localhost:8080?` });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClear = () => {
        setTranscript('');
        setStatus(null);
    };

    return (
        <div className="voice-panel">
            {/* LEFT: Record Button */}
            <div className="voice-record-area">
                {!isSupported ? (
                    <div className="speech-warning">⚠️ Web Speech API not supported. Type manually below.</div>
                ) : (
                    <>
                        <button
                            id="record-btn"
                            className={`record-btn${isRecording ? ' recording' : ''}`}
                            onClick={handleRecordToggle}
                            title={isRecording ? 'Stop Recording' : 'Start Recording'}
                        >
                            {isRecording ? '⏹' : '🎙'}
                        </button>
                        <span className="record-btn-label">{isRecording ? 'Recording...' : 'Click to Record'}</span>
                    </>
                )}
            </div>

            {/* MIDDLE: Transcript */}
            <div className="voice-transcript-area">
                <label className="transcript-label" htmlFor="transcript-input">
                    Voice Transcript / Manual Input
                </label>
                <textarea
                    id="transcript-input"
                    className={`transcript-box${isRecording ? ' listening' : ''}`}
                    value={transcript}
                    onChange={e => setTranscript(e.target.value)}
                    placeholder='Start recording or type manually, e.g. "45-year-old male, severe chest pain radiating to left arm, BP 170/110, pulse 118, diaphoretic..."'
                    rows={5}
                />
                {status && (
                    <div className={`status-message${status.type === 'error' ? ' error' : status.type === 'success' ? ' success' : ''}`}>
                        {status.message}
                    </div>
                )}
            </div>

            {/* RIGHT: Actions */}
            <div className="voice-actions">
                <div className="voice-actions-title">Actions</div>
                <button
                    id="submit-btn"
                    className={`submit-btn${isSubmitting ? ' loading' : ''}`}
                    onClick={handleSubmit}
                    disabled={isSubmitting || !transcript.trim()}
                >
                    {isSubmitting ? (
                        <><div className="spinner"></div> Analyzing...</>
                    ) : (
                        '🧠 Analyze & Submit'
                    )}
                </button>
                <button className="clear-btn" onClick={handleClear} disabled={isSubmitting}>
                    🗑 Clear
                </button>
            </div>
        </div>
    );
}
