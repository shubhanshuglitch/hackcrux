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
    const [extractedKeywords, setExtractedKeywords] = useState({ symptoms: [], vitals: [] });
    const recognitionRef = useRef(null);
    const finalTranscriptRef = useRef('');

    const symptomKeywords = ['chest pain', 'fever', 'headache', 'nausea', 'cough', 'shortness of breath', 'dyspnea', 'dizziness', 'vertigo', 'vomiting', 'abdomen pain', 'back pain', 'joint pain', 'muscle pain', 'fatigue', 'weakness', 'chills', 'rash', 'itching', 'burning', 'tingling', 'numbness', 'tremor', 'seizure', 'confusion', 'unconscious', 'difficulty breathing', 'wheezing', 'palpitations', 'arrhythmia', 'bleeding', 'bruise', 'swelling', 'fracture', 'injury', 'wound', 'laceration'];
    const vitalKeywords = ['blood pressure', 'bp', 'heart rate', 'hr', 'pulse', 'respiratory rate', 'rr', 'temperature', 'temp', 'oxygen', 'o2', 'sat', 'saturation', 'glucose', 'blood sugar', 'spo2', 'systolic', 'diastolic', 'bpm', 'mmhg', 'celsius', 'fahrenheit'];

   // Helper function to find the LAST occurrence of a keyword in text
    const findLastOccurrence = (text, keyword) => {
        const lowerText = text.toLowerCase();
        let lastIndex = -1;
        let searchFrom = 0;
        
        while (true) {
            const idx = lowerText.indexOf(keyword, searchFrom);
            if (idx === -1) break;
            lastIndex = idx;
            searchFrom = idx + 1;
        }
        
        return lastIndex;
    };

    // Determine the vital category (e.g., "BP", "HR", "Temperature") from keywords
    const getVitalCategory = (keyword) => {
        const normalized = keyword.toLowerCase();
        if (['bp', 'blood pressure'].includes(normalized)) return 'BP';
        if (['hr', 'heart rate', 'pulse'].includes(normalized)) return 'HR';
        if (['temperature', 'temp'].includes(normalized)) return 'Temperature';
        if (['spo2', 'oxygen', 'o2', 'sat', 'saturation'].includes(normalized)) return 'SpO2';
        if (['rr', 'respiratory rate'].includes(normalized)) return 'RR';
        if (['glucose', 'blood sugar'].includes(normalized)) return 'Glucose';
        return null;
    };

   const extractKeywords = (text) => {
    if (!text.trim()) {
        setExtractedKeywords({ symptoms: [], vitals: [] });
        return;
    }
    const lowerText = text.toLowerCase();
    const foundSymptoms = new Set();
    const foundVitals = new Map(); // Maps vital category to its latest value

    // Step 1 — collect all symptom keyword positions
    const symptomRanges = [];
    symptomKeywords.forEach(keyword => {
        let searchFrom = 0;
        while (true) {
            const idx = lowerText.indexOf(keyword, searchFrom);
            if (idx === -1) break;
            foundSymptoms.add(keyword);
            symptomRanges.push({ start: idx, end: idx + keyword.length });
            searchFrom = idx + 1;
        }
    });

    // Step 2 — extract ONLY the LATEST vital for each vital category
    vitalKeywords.forEach(keyword => {
        // Find the LAST occurrence of this vital keyword (most recent value)
        const keywordIndex = findLastOccurrence(text, keyword);
        if (keywordIndex === -1) return;

        // skip if this keyword position overlaps a symptom range
        const overlapsSymptom = symptomRanges.some(
            r => keywordIndex >= r.start && keywordIndex < r.end
        );
        if (overlapsSymptom) return;

        const afterKeyword = text.substring(keywordIndex + keyword.length).trim();

        // strip leading separators like : = space
        const cleaned = afterKeyword.replace(/^[:\s=]+/, '');

        // match only numeric vital value — digits, slash, dash, dot, percent, degree, letters for units
        // but STOP immediately at any whitespace followed by a non-numeric/non-unit character
        const valueMatch = cleaned.match(/^([\d]+(?:[./\-][\d]+)?(?:\s*(?:mmhg|bpm|%|°c|°f|celsius|fahrenheit|mg\/dl|kg|lbs|cm)?)?)/i);

        if (!valueMatch || !valueMatch[1].trim()) {
            // no numeric value found — skip this vital entirely
            return;
        }

        let value = valueMatch[1].trim();

        // Final guard — remove any trailing symptom words that crept in
        const symptomPattern = symptomKeywords
            .map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('|');
        value = value.replace(new RegExp(`\\s+(${symptomPattern}).*$`, 'i'), '').trim();

        // Only store if value is non-empty and contains at least one digit
        if (value && /\d/.test(value)) {
            // Determine the vital category to avoid duplicates (e.g., "bp" and "blood pressure" are same)
            const category = getVitalCategory(keyword);
            if (category) {
                // Replace any previous value for this category with the latest one
                foundVitals.set(category, `${category}: ${value}`);
            } else {
                // If not a recognized category, use the keyword as the key
                foundVitals.set(keyword, `${keyword}: ${value}`);
            }
        }
    });

    // Step 3 — remove any vital entries whose display value contains a symptom word
    const cleanedVitals = new Map();
    foundVitals.forEach((displayValue, key) => {
        const hasSymptom = symptomKeywords.some(s =>
            displayValue.toLowerCase().includes(s)
        );
        if (!hasSymptom) {
            cleanedVitals.set(key, displayValue);
        }
    });

    setExtractedKeywords({
        symptoms: Array.from(foundSymptoms),
        vitals: Array.from(cleanedVitals.values())
    });
};

    const playRecordingStartTone = async () => {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const audioCtx = new AudioCtx();
            if (audioCtx.state === 'suspended') await audioCtx.resume();

            const now = audioCtx.currentTime;
            const master = audioCtx.createGain();
            const compressor = audioCtx.createDynamicsCompressor();
            compressor.threshold.value = -28;
            compressor.knee.value = 24;
            compressor.ratio.value = 10;
            compressor.attack.value = 0.003;
            compressor.release.value = 0.18;

            master.gain.setValueAtTime(0.0001, now);
            master.gain.exponentialRampToValueAtTime(0.6, now + 0.02);
            master.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);

            master.connect(compressor);
            compressor.connect(audioCtx.destination);

            const notes = [784, 1046, 1318];
            notes.forEach((freq, i) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                const start = now + i * 0.07;
                const end = start + 0.14;
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, start);
                gain.gain.setValueAtTime(0.0001, start);
                gain.gain.exponentialRampToValueAtTime(0.32, start + 0.015);
                gain.gain.exponentialRampToValueAtTime(0.0001, end);
                osc.connect(gain);
                gain.connect(master);
                osc.start(start);
                osc.stop(end + 0.02);
            });

            setTimeout(() => { audioCtx.close().catch(() => {}); }, 500);
        } catch (_) {
            // Keep recording flow even if browser blocks audio.
        }
    };

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
            setStatus(null);
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
            if (event.error === 'aborted') {
                setStatus(null);
                setIsRecording(false);
                return;
            }
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
        setStatus(null);
    };

    const handleRecordToggle = () => {
        if (isRecording) {
            stopRecording();
        } else {
            playRecordingStartTone();
            startRecording();
        }
    };

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
            setExtractedKeywords({ symptoms: [], vitals: [] });
            if (onPatientAdded) onPatientAdded(patient);
        } catch (err) {
            setStatus({ type: 'error', message: `Failed to process: ${err.message}. Is the backend running at localhost:8081?` });
        } finally { setIsSubmitting(false); }
    };

    const handleClear = () => { setTranscript(''); setInterimTranscript(''); finalTranscriptRef.current = ''; setStatus(null); setExtractedKeywords({ symptoms: [], vitals: [] }); };

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

    const HistoryIcon = ({ size = 16 }) => (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
            <path d="M12 6v6l4 2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 12a7 7 0 1 0 2.1-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 4v3h3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );

    const PromptIcon = ({ size = 16 }) => (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
            <path d="M4 5h16v11H8l-4 3V5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 9h8M8 12h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    );

    const StepListenIcon = ({ size = 34 }) => (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
            <path d="M12 3.8a2.8 2.8 0 0 0-2.8 2.8v5.3a2.8 2.8 0 0 0 5.6 0V6.6A2.8 2.8 0 0 0 12 3.8Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M6.2 11.2a5.8 5.8 0 0 0 11.6 0M12 17v2.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M4.8 8.4a8.7 8.7 0 0 0 0 7.2M19.2 8.4a8.7 8.7 0 0 1 0 7.2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.75" />
        </svg>
    );

    const StepExtractIcon = ({ size = 34 }) => (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
            <path d="M7.5 3.8h7.2l3.1 3.2v12.1a1.7 1.7 0 0 1-1.7 1.7H7.5a1.7 1.7 0 0 1-1.7-1.7V5.5a1.7 1.7 0 0 1 1.7-1.7Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M14.7 3.8V7h3.1M9 10h6M9 13h6M9 16h3.8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );

    const StepScoreIcon = ({ size = 34 }) => (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
            <path d="M12 3.8 5.8 6.2v4.9c0 4 2.4 7.7 6.2 9.1 3.8-1.4 6.2-5.1 6.2-9.1V6.2L12 3.8Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            <path d="m9.1 12.3 1.9 1.9 4-4.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );

    return (
        <div className="voice-panel-premium">
            <div className="voice-panel-header-premium">
                <div className="voice-panel-header-content">
                    <div className="voice-panel-icon-premium">
                        <MicIcon size={34} />
                    </div>
                    <div className="voice-panel-heading-block">
                        <h1 className="voice-panel-title-premium">Voice Intelligence for Emergency Care</h1>
                        <p className="voice-panel-subtitle-premium">Real-time patient intake powered by clinical AI</p>
                    </div>
                </div>
                <div className="voice-panel-badge"></div>
            </div>
            <div className="voice-panel-main-premium">
                {!isSupported ? (
                    <div className="speech-warning-premium">
                        <span className="warning-icon">⚠️</span>
                        <span>Web Speech API not supported. Please type patient information manually.</span>
                    </div>
                ) : (
                    <>
                        <div className="voice-panel-grid-premium">
                            <div className="voice-record-card-premium">
                                <div className="card-inner-premium">
                                    <div className="record-header">
                                        <span className="record-header-label"><MicIcon size={16} /> Voice Input</span>
                                    </div>

                                    <div className="language-selector-premium">
                                        <select
                                            id="speech-language"
                                            className="language-select-premium"
                                            value={language}
                                            onChange={(e) => setLanguage(e.target.value)}
                                            disabled={isRecording || isSubmitting}
                                        >
                                            {LANG_OPTIONS.map((option) => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="record-container-premium">
                                        <button
                                            id="record-btn"
                                            className={`record-btn-premium${isRecording ? ' recording' : ''}`}
                                            onClick={handleRecordToggle}
                                            title={isRecording ? 'Stop Recording' : 'Start Recording'}
                                            disabled={isSubmitting}
                                        >
                                            <div className="record-btn-inner">
                                                {isRecording ? <StopIcon size={30} /> : <MicIcon size={34} />}
                                            </div>
                                            {isRecording && (
                                                <div className="record-ripple-container">
                                                    <div className="ripple ripple-1"></div>
                                                    <div className="ripple ripple-2"></div>
                                                    <div className="ripple ripple-3"></div>
                                                </div>
                                            )}
                                        </button>
                                    </div>

                                    <div className="recording-pro-tip">
                                        <span className="pro-tip-icon">💡</span>
                                        <span className="pro-tip-text"><strong>Pro Tip:</strong> Include age, key symptoms, pain level, and duration for best AI triage accuracy.</span>
                                    </div>
                                </div>
                            </div>

                            <div className="voice-right-column">
                                <div className="voice-input-card-premium">
                                    <div className="card-inner-premium">
                                        <div className="input-header">
                                            <span className="input-header-label"><PromptIcon size={16} /> Patient Information</span>
                                        </div>

                                        <textarea id="transcript-input" className={`transcript-box-premium${isRecording ? ' listening' : ''}`}
                                            lang={language}
                                            value={transcript} onChange={e => { setTranscript(e.target.value); extractKeywords(e.target.value); }}
                                            placeholder='Record or type patient details...' rows={7}
                                        />

                                        {isRecording && interimTranscript && (
                                            <div className="interim-note-premium">
                                                <span className="interim-icon">✨</span>
                                                <span>{interimTranscript}</span>
                                            </div>
                                        )}

                                        {(extractedKeywords.symptoms.length > 0 || extractedKeywords.vitals.length > 0) && (
                                            <div className="verification-panel-premium">
                                                <div className="verification-header">
                                                    <span className="verification-title">📋 Detected Keywords</span>
                                                </div>
                                                {extractedKeywords.symptoms.length > 0 && (
                                                    <div className="keyword-section">
                                                        <span className="keyword-category">Symptoms:</span>
                                                        <div className="keyword-tags">
                                                            {extractedKeywords.symptoms.map((symptom, idx) => (
                                                                <span key={idx} className="keyword-tag symptom-tag">{symptom}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {extractedKeywords.vitals.length > 0 && (
                                                    <div className="keyword-section">
                                                        <span className="keyword-category">Vitals:</span>
                                                        <div className="keyword-tags">
                                                            {extractedKeywords.vitals.map((vital, idx) => (
                                                                <span key={idx} className="keyword-tag vital-tag">{vital}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {status && (
                                            <div className={`status-message-premium status-${status.type}`}>
                                                <span className={`status-icon-premium status-${status.type}-icon`}>
                                                    {status.type === 'error' ? '✕' : status.type === 'success' ? '✓' : 'ℹ'}
                                                </span>
                                                <span className="status-text">{status.message}</span>
                                            </div>
                                        )}

                                        <div className="input-actions-row">
                                            <button id="submit-btn" className={`submit-btn-premium compact${isSubmitting ? ' loading' : ''}`}
                                                onClick={handleSubmit} disabled={isSubmitting || !transcript.trim()}>
                                                <div className="submit-btn-content">
                                                    {isSubmitting ? (
                                                        <>
                                                            <div className="spinner-premium"></div>
                                                            <span>Analyzing...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className="btn-icon-premium"><AnalyzeIcon size={16} /></span>
                                                            <span>Analyze & Triage</span>
                                                        </>
                                                    )}
                                                </div>
                                            </button>

                                            <button className="clear-btn-premium compact" onClick={handleClear} disabled={isSubmitting}>
                                                <span className="btn-icon-premium"><ClearIcon size={14} /></span>
                                                <span>CLEAR</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="assessment-steps-strip">
                            <div className="assessment-steps-grid">
                                <article className="assessment-step-card step-one">
                                    <h4>Listen and record</h4>
                                    <div className="assessment-step-icon"><StepListenIcon /></div>
                                    <p>Capture spoken patient details clearly from staff or attendants.</p>
                                </article>
                                <article className="assessment-step-card step-two">
                                    <h4>Extract symptoms</h4>
                                    <div className="assessment-step-icon"><StepExtractIcon /></div>
                                    <p>Convert raw speech into structured symptoms, vitals, and history.</p>
                                </article>
                                <article className="assessment-step-card step-three">
                                    <h4>Set triage priority</h4>
                                    <div className="assessment-step-icon"><StepScoreIcon /></div>
                                    <p>Generate fast urgency guidance for immediate emergency action.</p>
                                </article>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
