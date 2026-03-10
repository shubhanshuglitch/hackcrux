import React, { useState, useRef, useEffect } from 'react';
import { submitPatient } from '../api/patientApi.js';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const LANG_OPTIONS = [
    { value: 'hi-IN', label: 'Hindi (India) - Hindi' },
    { value: 'en-IN', label: 'English (India)' },
    { value: 'en-US', label: 'English (US)' },
];

export default function VoiceCapture({ onPatientAdded }) {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [status, setStatus] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [language, setLanguage] = useState('hi-IN');
    const [isSupported] = useState(() => !!SpeechRecognition);
    const recognitionRef = useRef(null);
    const finalTranscriptRef = useRef('');

    useEffect(() => {
        return () => { if (recognitionRef.current) recognitionRef.current.stop(); };
    }, []);

    const startRecording = () => {
        if (!SpeechRecognition || isSubmitting) return;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.lang = language;
        finalTranscriptRef.current = transcript.trim();

        recognition.onstart = () => {
            setIsRecording(true);
            const listeningMsg = language === 'hi-IN'
                ? 'Listening in Hindi mode. Speak naturally in Hindi.'
                : 'Listening... Speak patient details clearly. Click stop when done.';
            setStatus({ type: 'info', message: listeningMsg });
        };

        recognition.onresult = (event) => {
            let finalTextChunk = '';
            let interimText = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) finalTextChunk += result[0].transcript + ' ';
                else interimText += result[0].transcript;
            }
            if (finalTextChunk) finalTranscriptRef.current = `${finalTranscriptRef.current} ${finalTextChunk}`.trim();
            const live = `${finalTranscriptRef.current} ${interimText}`.trim();
            setInterimTranscript(interimText);
            setTranscript(live);
        };

        recognition.onerror = (event) => {
            setIsRecording(false);
            setInterimTranscript('');
            const errorMap = {
                'not-allowed': 'Microphone permission denied. Allow mic access in browser settings and retry.',
                'no-speech': 'No speech detected. Please speak closer to the microphone and retry.',
                'audio-capture': 'No microphone detected. Connect a microphone and try again.',
                'network': 'Network issue while using speech service. Check your connection and retry.',
            };
            setStatus({ type: 'error', message: errorMap[event.error] || `Microphone error: ${event.error}` });
        };

        recognition.onend = () => {
            setIsRecording(false);
            setInterimTranscript('');
            setTranscript(finalTranscriptRef.current.trim());
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    const stopRecording = () => {
        if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; }
        setIsRecording(false);
        setInterimTranscript('');
        setStatus({ type: 'info', message: 'Recording stopped. Review transcript and click Analyze & Assign Triage.' });
    };

    const handleRecordToggle = () => { isRecording ? stopRecording() : startRecording(); };

    const handleSubmit = async () => {
        const text = transcript.trim();
        if (!text) { setStatus({ type: 'error', message: 'Please record or type patient information before submitting.' }); return; }
        setIsSubmitting(true);
        setStatus({ type: 'info', message: '🧠 AI is analyzing patient data and assigning priority...' });
        try {
            const patient = await submitPatient(text);
            const priorityLabel = { RED: 'Critical', YELLOW: 'Urgent', GREEN: 'Standard' }[patient.priority] || patient.priority;
            setStatus({ type: 'success', message: `Patient added successfully. Priority: ${priorityLabel}` });
            setTranscript(''); setInterimTranscript(''); finalTranscriptRef.current = '';
            if (onPatientAdded) onPatientAdded(patient);
        } catch (err) {
            setStatus({ type: 'error', message: `Failed to process: ${err.message}. Is the backend running at localhost:8081?` });
        } finally { setIsSubmitting(false); }
    };

    const handleClear = () => { setTranscript(''); setInterimTranscript(''); finalTranscriptRef.current = ''; setStatus(null); };

    const MicIcon = ({ size = 22 }) => (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
            <path d="M12 4a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0V7a3 3 0 0 0-3-3Z" fill="currentColor" />
            <path d="M6 10.5a6 6 0 0 0 12 0M12 16.5V20M9 20h6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    );

    const StopIcon = ({ size = 22 }) => (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
            <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" />
        </svg>
    );

    const AnalyzeIcon = ({ size = 18 }) => (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
            <path d="M8 4h8v4h4v8h-4v4H8v-4H4V8h4V4Z" fill="currentColor" opacity="0.2" />
            <path d="M12 7v10M7 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );

    const ClearIcon = ({ size = 16 }) => (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
            <path d="M5 7h14M9 7V5h6v2M9 10v7M15 10v7M7 7l1 12h8l1-12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );

    return (
        <div className="voice-panel">
            <div className="voice-panel-header">
                <div className="voice-panel-title">
                    <span className="voice-panel-icon"><MicIcon size={24} /></span>
                    Patient Intake Assessment
                </div>
                <div className="voice-panel-subtitle">Record or type patient information for AI-assisted triage</div>
            </div>

            <div className="voice-panel-content">
                <div className="voice-record-area">
                    {!isSupported ? (
                        <div className="speech-warning"><span>⚠️</span><span>Web Speech API not supported. Please type patient information manually.</span></div>
                    ) : (
                        <>
                            <label className="language-label" htmlFor="speech-language">Speech Language</label>
                            <select id="speech-language" className="language-select" value={language}
                                onChange={(e) => setLanguage(e.target.value)} disabled={isRecording || isSubmitting}>
                                {LANG_OPTIONS.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
                            </select>
                            <button id="record-btn" className={`record-btn${isRecording ? ' recording' : ''}`}
                                onClick={handleRecordToggle} title={isRecording ? 'Stop Recording' : 'Start Recording'} disabled={isSubmitting}>
                                {isRecording ? <StopIcon size={30} /> : <MicIcon size={32} />}
                            </button>
                            <span className="record-btn-label">{isRecording ? 'Recording in progress...' : 'Click to Record'}</span>
                            {isRecording && <div className="recording-indicator">● Recording</div>}
                        </>
                    )}
                </div>

                <div className="voice-transcript-area">
                    <label className="transcript-label" htmlFor="transcript-input">Patient Information Input</label>
                    <textarea id="transcript-input" className={`transcript-box${isRecording ? ' listening' : ''}`}
                        lang={language}
                        value={transcript} onChange={e => setTranscript(e.target.value)}
                        placeholder='Example: "45-year-old male, severe chest pain radiating to left arm, shortness of breath. BP 170/110, heart rate 118..."' rows={6} />
                    {isRecording && interimTranscript && (<div className="interim-note">Live speech preview: {interimTranscript}</div>)}
                    {status && (
                        <div className={`status-message status-${status.type}`}>
                            <span className="status-icon">{status.type === 'error' ? '!' : status.type === 'success' ? 'OK' : 'i'}</span>
                            {status.message}
                        </div>
                    )}
                </div>

                <div className="voice-actions">
                    <div className="voice-actions-title">Assessment Actions</div>
                    <button id="submit-btn" className={`submit-btn${isSubmitting ? ' loading' : ''}`}
                        onClick={handleSubmit} disabled={isSubmitting || !transcript.trim()}>
                        {isSubmitting ? (<><div className="spinner"></div> <span>Analyzing...</span></>) : (<><span className="btn-icon"><AnalyzeIcon /></span><span>Analyze & Assign Triage</span></>)}
                    </button>
                    <button className="clear-btn" onClick={handleClear} disabled={isSubmitting}>
                        <span className="btn-icon"><ClearIcon /></span>Clear Input
                    </button>
                </div>
            </div>
        </div>
    );
}
