import React, { useEffect, useMemo, useState } from 'react';
import {
    createResourceRoom,
    createResourceZone,
    fetchResourceZones,
} from '../api/resourceAllocationApi.js';

const PRIORITY_OPTIONS = ['RED', 'YELLOW', 'GREEN'];

const INITIAL_ZONE_FORM = {
    name: '',
    priorityLevel: 'RED',
    description: '',
};

const INITIAL_ROOM_FORM = {
    zoneId: '',
    roomCode: '',
    capacity: '1',
};

export default function ResourceAllocation() {
    const [zones, setZones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [zoneForm, setZoneForm] = useState(INITIAL_ZONE_FORM);
    const [roomForm, setRoomForm] = useState(INITIAL_ROOM_FORM);
    const [submittingZone, setSubmittingZone] = useState(false);
    const [submittingRoom, setSubmittingRoom] = useState(false);

    const totals = useMemo(() => zones.reduce((accumulator, zone) => {
        accumulator.zones += 1;
        accumulator.rooms += zone.totalRooms || 0;
        accumulator.available += zone.availableRooms || 0;
        return accumulator;
    }, { zones: 0, rooms: 0, available: 0 }), [zones]);

    const loadZones = async () => {
        setLoading(true);
        try {
            const data = await fetchResourceZones();
            setZones(Array.isArray(data) ? data : []);
            setError('');
        } catch (err) {
            setError(err.message || 'Failed to load resource allocation data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadZones();
    }, []);

    useEffect(() => {
        if (!roomForm.zoneId && zones.length > 0) {
            setRoomForm((current) => ({ ...current, zoneId: zones[0].id }));
        }
    }, [zones, roomForm.zoneId]);

    const handleZoneSubmit = async (event) => {
        event.preventDefault();
        setSubmittingZone(true);
        setError('');
        setSuccessMessage('');

        try {
            await createResourceZone(zoneForm);
            setZoneForm(INITIAL_ZONE_FORM);
            setSuccessMessage('Zone created successfully.');
            await loadZones();
        } catch (err) {
            setError(err.message || 'Failed to create zone.');
        } finally {
            setSubmittingZone(false);
        }
    };

    const handleRoomSubmit = async (event) => {
        event.preventDefault();
        setSubmittingRoom(true);
        setError('');
        setSuccessMessage('');

        try {
            await createResourceRoom({
                ...roomForm,
                capacity: roomForm.capacity,
            });
            setRoomForm((current) => ({
                ...INITIAL_ROOM_FORM,
                zoneId: current.zoneId || zones[0]?.id || '',
            }));
            setSuccessMessage('Room added successfully.');
            await loadZones();
        } catch (err) {
            setError(err.message || 'Failed to create room.');
        } finally {
            setSubmittingRoom(false);
        }
    };

    return (
        <section className="resource-allocation-shell">
            <div className="resource-allocation-hero">
                <div>
                    <div className="resource-allocation-kicker">Operational Capacity Map</div>
                    <h2 className="resource-allocation-title">Resource Allocation</h2>
                    <p className="resource-allocation-subtitle">
                        Review live zone availability, inspect occupied rooms, and expand capacity without leaving the triage console.
                    </p>
                </div>
                <div className="resource-allocation-summary-grid">
                    <div className="resource-summary-card">
                        <span className="resource-summary-value">{totals.zones}</span>
                        <span className="resource-summary-label">Active Zones</span>
                    </div>
                    <div className="resource-summary-card">
                        <span className="resource-summary-value">{totals.rooms}</span>
                        <span className="resource-summary-label">Tracked Rooms</span>
                    </div>
                    <div className="resource-summary-card accent">
                        <span className="resource-summary-value">{totals.available}</span>
                        <span className="resource-summary-label">Available Now</span>
                    </div>
                </div>
            </div>

            {error ? <div className="resource-banner error">{error}</div> : null}
            {successMessage ? <div className="resource-banner success">{successMessage}</div> : null}

            <div className="resource-allocation-toolbar">
                <button className="resource-refresh-btn" onClick={loadZones} disabled={loading}>
                    {loading ? 'Refreshing...' : 'Refresh Capacity'}
                </button>
            </div>

            <div className="resource-allocation-layout">
                <div className="resource-form-column">
                    <form className="resource-form-card" onSubmit={handleZoneSubmit}>
                        <div className="resource-form-kicker">Add Zone</div>
                        <h3>Expand a care zone</h3>
                        <label>
                            Zone name
                            <input
                                type="text"
                                value={zoneForm.name}
                                onChange={(event) => setZoneForm({ ...zoneForm, name: event.target.value })}
                                placeholder="Neuro Observation"
                                required
                            />
                        </label>
                        <label>
                            Severity band
                            <select
                                value={zoneForm.priorityLevel}
                                onChange={(event) => setZoneForm({ ...zoneForm, priorityLevel: event.target.value })}
                            >
                                {PRIORITY_OPTIONS.map((priority) => (
                                    <option key={priority} value={priority}>{priority}</option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Description
                            <textarea
                                value={zoneForm.description}
                                onChange={(event) => setZoneForm({ ...zoneForm, description: event.target.value })}
                                placeholder="Ideal for respiratory monitoring and overflow stabilization."
                                rows="4"
                            />
                        </label>
                        <button className="resource-submit-btn" type="submit" disabled={submittingZone}>
                            {submittingZone ? 'Creating Zone...' : 'Create Zone'}
                        </button>
                    </form>

                    <form className="resource-form-card" onSubmit={handleRoomSubmit}>
                        <div className="resource-form-kicker">Add Room</div>
                        <h3>Attach a room to a zone</h3>
                        <label>
                            Zone
                            <select
                                value={roomForm.zoneId}
                                onChange={(event) => setRoomForm({ ...roomForm, zoneId: event.target.value })}
                                required
                            >
                                {zones.map((zone) => (
                                    <option key={zone.id} value={zone.id}>{zone.name} · {zone.priorityLevel}</option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Room code
                            <input
                                type="text"
                                value={roomForm.roomCode}
                                onChange={(event) => setRoomForm({ ...roomForm, roomCode: event.target.value })}
                                placeholder="OBS-7"
                                required
                            />
                        </label>
                        <label>
                            Capacity
                            <input
                                type="number"
                                min="1"
                                value={roomForm.capacity}
                                onChange={(event) => setRoomForm({ ...roomForm, capacity: event.target.value })}
                                required
                            />
                        </label>
                        <button className="resource-submit-btn" type="submit" disabled={submittingRoom || zones.length === 0}>
                            {submittingRoom ? 'Adding Room...' : 'Add Room'}
                        </button>
                    </form>
                </div>

                <div className="resource-zone-column">
                    {loading ? (
                        <div className="resource-empty-state">Loading live room availability...</div>
                    ) : zones.length === 0 ? (
                        <div className="resource-empty-state">No zones configured yet. Create the first one from the left panel.</div>
                    ) : (
                        <div className="resource-zone-grid">
                            {zones.map((zone) => (
                                <article className="resource-zone-card" key={zone.id}>
                                    <div className="resource-zone-header">
                                        <div>
                                            <div className={`resource-priority-pill ${String(zone.priorityLevel || '').toLowerCase()}`}>
                                                {zone.priorityLevel}
                                            </div>
                                            <h3>{zone.name}</h3>
                                        </div>
                                        <div className="resource-zone-counts">
                                            <strong>{zone.availableRooms}/{zone.totalRooms}</strong>
                                            <span>rooms free</span>
                                        </div>
                                    </div>
                                    <p className="resource-zone-description">
                                        {zone.description || 'No description provided for this zone.'}
                                    </p>
                                    <div className="resource-room-list">
                                        {(zone.rooms || []).map((room) => (
                                            <div className={`resource-room-chip ${room.occupied ? 'occupied' : 'available'}`} key={room.id}>
                                                <div>
                                                    <strong>{room.roomCode}</strong>
                                                    <span>Capacity {room.capacity || 1}</span>
                                                </div>
                                                <div className="resource-room-status">
                                                    <span>{room.occupied ? 'Occupied' : 'Available'}</span>
                                                    <small>{room.currentPatientName || 'Open for assignment'}</small>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}