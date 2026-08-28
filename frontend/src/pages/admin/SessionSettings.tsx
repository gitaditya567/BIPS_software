import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Play, CheckCircle, AlertTriangle, Layers, Plus, ArrowRight } from 'lucide-react';

interface AcademicSession {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    isDefault: boolean;
}

const SessionSettings: React.FC = () => {
    const [sessions, setSessions] = useState<AcademicSession[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Create Session Form State
    const [newName, setNewName] = useState('');
    const [newStartDate, setNewStartDate] = useState('');
    const [newEndDate, setNewEndDate] = useState('');
    const [newIsDefault, setNewIsDefault] = useState(false);

    // Rollover State
    const [fromSession, setFromSession] = useState('');
    const [toSession, setToSession] = useState('');
    const [isDryRun, setIsDryRun] = useState(true);
    const [rolloverLoading, setRolloverLoading] = useState(false);
    const [rolloverResult, setRolloverResult] = useState<any | null>(null);

    const loadSessions = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/erp-api/sessions');
            setSessions(res.data);
            if (res.data.length > 0) {
                setFromSession(res.data[0].name);
                if (res.data.length > 1) {
                    setToSession(res.data[1].name);
                } else {
                    setToSession(res.data[0].name);
                }
            }
        } catch (error) {
            console.error('Failed to load sessions', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSessions();
    }, []);

    const handleCreateSession = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !newStartDate || !newEndDate) {
            alert('Please fill out all fields.');
            return;
        }

        try {
            await axios.post('/erp-api/sessions', {
                name: newName,
                startDate: newStartDate,
                endDate: newEndDate,
                isDefault: newIsDefault
            });
            setNewName('');
            setNewStartDate('');
            setNewEndDate('');
            setNewIsDefault(false);
            loadSessions();
            window.dispatchEvent(new Event('activeSessionChanged'));
        } catch (error) {
            console.error('Failed to create session', error);
            alert('Failed to create academic session.');
        }
    };

    const handleSetDefault = async (id: string) => {
        try {
            await axios.put(`/erp-api/sessions/${id}/default`);
            loadSessions();
            window.dispatchEvent(new Event('activeSessionChanged'));
        } catch (error) {
            console.error('Failed to set default session', error);
        }
    };

    const handleRunRollover = async () => {
        if (fromSession === toSession) {
            alert('Source and destination sessions cannot be the same!');
            return;
        }

        const confirmMsg = isDryRun 
            ? "Run dry run rollover? No records will be modified." 
            : `⚠️ CRITICAL WARNING: You are running an ACTIVE rollover from ${fromSession} to ${toSession}. All active students in ${fromSession} will be promoted and their outstanding dues rolled over. Proceed?`;

        if (!window.confirm(confirmMsg)) return;

        setRolloverLoading(true);
        setRolloverResult(null);
        try {
            const res = await axios.post('/erp-api/sessions/rollover', {
                fromSession,
                toSession,
                isDryRun
            });
            setRolloverResult(res.data);
            loadSessions();
            window.dispatchEvent(new Event('activeSessionChanged'));
        } catch (error: any) {
            console.error('Rollover failed', error);
            alert(error.response?.data?.error || 'Rollover execution failed');
        } finally {
            setRolloverLoading(false);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', margin: '0 0 0.5rem 0' }}>
                    Academic Session & Rollover Management
                </h1>
                <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0 }}>
                    Configure the active school years, manage system defaults, and perform academic promotions with financial carry-forwards.
                </p>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Loading sessions...</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    
                    {/* Left Column: Sessions List & Create Form */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        
                        {/* List */}
                        <div style={{
                            background: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '16px',
                            padding: '1.5rem',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                        }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Layers size={20} color="#4a90e2" />
                                Registered Academic Sessions
                            </h2>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {sessions.map(session => (
                                    <div key={session.id} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '1rem',
                                        background: '#f8fafc',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '12px',
                                        transition: 'all 0.2s'
                                    }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                                                <span style={{ fontWeight: '700', color: '#1e293b' }}>Session {session.name}</span>
                                                {session.isDefault && (
                                                    <span style={{
                                                        fontSize: '0.7rem',
                                                        fontWeight: '700',
                                                        color: '#15803d',
                                                        background: '#dcfce7',
                                                        padding: '0.15rem 0.5rem',
                                                        borderRadius: '9999px'
                                                    }}>Active Default</span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '1rem' }}>
                                                <span>Start: {new Date(session.startDate).toLocaleDateString()}</span>
                                                <span>End: {new Date(session.endDate).toLocaleDateString()}</span>
                                            </div>
                                        </div>

                                        {!session.isDefault && (
                                            <button
                                                onClick={() => handleSetDefault(session.id)}
                                                style={{
                                                    padding: '0.4rem 0.8rem',
                                                    fontSize: '0.78rem',
                                                    fontWeight: '700',
                                                    color: '#4a90e2',
                                                    background: 'white',
                                                    border: '1px solid #c3dffe',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseOver={e => { e.currentTarget.style.background = '#f0f7ff'; }}
                                                onMouseOut={e => { e.currentTarget.style.background = 'white'; }}
                                            >
                                                Make Default
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Create Session Form */}
                        <div style={{
                            background: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '16px',
                            padding: '1.5rem',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                        }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1.2rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Plus size={20} color="#4a90e2" />
                                Add New Session
                            </h2>

                            <form onSubmit={handleCreateSession} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem' }}>Session Name (e.g. 2025-2026)</label>
                                    <input
                                        type="text"
                                        placeholder="2025-2026"
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none' }}
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem' }}>Start Date</label>
                                        <input
                                            type="date"
                                            value={newStartDate}
                                            onChange={e => setNewStartDate(e.target.value)}
                                            style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem' }}>End Date</label>
                                        <input
                                            type="date"
                                            value={newEndDate}
                                            onChange={e => setNewEndDate(e.target.value)}
                                            style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0' }}>
                                    <input
                                        type="checkbox"
                                        id="newIsDefault"
                                        checked={newIsDefault}
                                        onChange={e => setNewIsDefault(e.target.checked)}
                                        style={{ cursor: 'pointer' }}
                                    />
                                    <label htmlFor="newIsDefault" style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', cursor: 'pointer' }}>Set as system default session immediately</label>
                                </div>

                                <button
                                    type="submit"
                                    style={{
                                        width: '100%',
                                        padding: '0.7rem',
                                        fontSize: '0.9rem',
                                        fontWeight: '700',
                                        color: 'white',
                                        background: '#4a90e2',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 4px 6px rgba(74,144,226,0.2)'
                                    }}
                                >
                                    Create Session
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Right Column: Year-End Rollover Panel */}
                    <div>
                        <div style={{
                            background: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '16px',
                            padding: '1.5rem',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                            height: '100%'
                        }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Play size={20} color="#e53e3e" />
                                Year-End Session Rollover
                            </h2>
                            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.5rem' }}>
                                Transition school records from one academic session to the next. This automatically calculates net outstanding dues, carries them forward as Previous Dues, and promotes active students to their candidate class.
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                {/* Direction Row */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: '#f8fafc',
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0'
                                }}>
                                    <div style={{ width: '45%' }}>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.3rem' }}>Source Session</label>
                                        <select
                                            value={fromSession}
                                            onChange={e => setFromSession(e.target.value)}
                                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700' }}
                                        >
                                            {sessions.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <ArrowRight size={20} color="#94a3b8" />
                                    <div style={{ width: '45%' }}>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.3rem' }}>Destination Session</label>
                                        <select
                                            value={toSession}
                                            onChange={e => setToSession(e.target.value)}
                                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700' }}
                                        >
                                            {sessions.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Dry run option */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.2rem' }}>
                                    <input
                                        type="checkbox"
                                        id="isDryRun"
                                        checked={isDryRun}
                                        onChange={e => setIsDryRun(e.target.checked)}
                                        style={{ cursor: 'pointer' }}
                                    />
                                    <label htmlFor="isDryRun" style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155', cursor: 'pointer' }}>
                                        Dry Run Mode (Simulate calculations without database changes)
                                    </label>
                                </div>

                                {/* Warning Alert */}
                                <div style={{
                                    display: 'flex',
                                    gap: '0.8rem',
                                    background: '#fffbeb',
                                    border: '1px solid #fef3c7',
                                    borderRadius: '12px',
                                    padding: '1rem'
                                }}>
                                    <AlertTriangle size={24} color="#d97706" style={{ flexShrink: 0 }} />
                                    <div>
                                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#b45309', display: 'block', marginBottom: '0.2rem' }}>Critical System Operations Reminder</span>
                                        <span style={{ fontSize: '0.75rem', color: '#d97706', lineHeight: 1.4, display: 'block' }}>
                                            Executing an active rollover is an irreversible transaction. It will modify student classes and carry forward opening dues. Always backup the database or run a Dry Run first.
                                        </span>
                                    </div>
                                </div>

                                {/* Run Button */}
                                <button
                                    onClick={handleRunRollover}
                                    disabled={rolloverLoading}
                                    style={{
                                        width: '100%',
                                        padding: '0.8rem',
                                        fontSize: '0.95rem',
                                        fontWeight: '700',
                                        color: 'white',
                                        background: isDryRun ? '#4a90e2' : '#dc2626',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        boxShadow: isDryRun ? '0 4px 6px rgba(74,144,226,0.2)' : '0 4px 6px rgba(220,38,38,0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    {rolloverLoading ? 'Processing Rollover...' : isDryRun ? 'Run Simulation (Dry Run)' : '🔥 COMMIT ACTIVE ROLLOVER'}
                                </button>

                                {/* Rollover Results Terminal Output */}
                                {rolloverResult && (
                                    <div style={{ marginTop: '1rem' }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.4rem',
                                            marginBottom: '0.5rem',
                                            fontSize: '0.85rem',
                                            fontWeight: '700',
                                            color: '#15803d'
                                        }}>
                                            <CheckCircle size={16} />
                                            Rollover Run Complete {rolloverResult.isDryRun ? '(Dry Run Simulation)' : '(Committed to DB)'}
                                        </div>

                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr',
                                            gap: '0.6rem',
                                            marginBottom: '1rem'
                                        }}>
                                            <div style={{ padding: '0.8rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Processed Students</span>
                                                <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e293b' }}>{rolloverResult.summary.processed}</span>
                                            </div>
                                            <div style={{ padding: '0.8rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Promoted / Graduated</span>
                                                <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e293b' }}>{rolloverResult.summary.promoted} / {rolloverResult.summary.graduated}</span>
                                            </div>
                                            <div style={{ padding: '0.8rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', gridColumn: 'span 2' }}>
                                                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Total Dues Rolled Over (Previous Dues)</span>
                                                <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#dc2626' }}>₹{rolloverResult.summary.totalOutstandingCarried.toLocaleString()}</span>
                                            </div>
                                        </div>

                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.3rem' }}>Execution Log Snippet</label>
                                        <div style={{
                                            fontFamily: 'Courier New, monospace',
                                            fontSize: '0.75rem',
                                            background: '#0f172a',
                                            color: '#38bdf8',
                                            padding: '1rem',
                                            borderRadius: '8px',
                                            maxHeight: '150px',
                                            overflowY: 'auto'
                                        }}>
                                            {rolloverResult.log.map((line: string, i: number) => (
                                                <div key={i}>{line}</div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SessionSettings;
