import React, { useState } from 'react';
import { useNotification } from '../../context/NotificationContext';

const LeaveApply: React.FC = () => {
    const { addNotification } = useNotification();
    const [leaveType, setLeaveType] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [reason, setReason] = useState('');
    const [history, setHistory] = useState([
        { type: 'Sick Leave', from: '10 Mar', to: '12 Mar', status: 'Pending' },
        { type: 'Casual Leave', from: '05 Feb', to: '05 Feb', status: 'Approved' }
    ]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newLeave = {
            type: leaveType,
            from: new Date(fromDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
            to: new Date(toDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
            status: 'Pending'
        };
        setHistory([newLeave, ...history]);
        setLeaveType('');
        setFromDate('');
        setToDate('');
        setReason('');
        addNotification('leave', 'Leave Applied', `${leaveType} request submitted from ${fromDate} to ${toDate}.`);
    };

    return (
        <div>
            <h1 style={{ marginBottom: '2rem', fontSize: '1.875rem', fontWeight: 800 }}>Apply for Leave</h1>

            {/* Leave Form */}
            <div className="stat-card" style={{ display: 'block', marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', fontWeight: 'bold' }}>Leave Application Form</h3>
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div className="form-group">
                            <label>Leave Type</label>
                            <select className="form-control" value={leaveType} onChange={e => setLeaveType(e.target.value)} required>
                                <option value="">Select Type</option>
                                <option value="Sick Leave">Sick Leave</option>
                                <option value="Casual Leave">Casual Leave</option>
                                <option value="Maternity/Paternity Leave">Maternity/Paternity Leave</option>
                                <option value="Personal Leave">Personal Leave</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>From Date</label>
                            <input type="date" className="form-control" value={fromDate} onChange={e => setFromDate(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label>To Date</label>
                            <input type="date" className="form-control" value={toDate} onChange={e => setToDate(e.target.value)} required />
                        </div>
                    </div>
                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label>Reason for Leave</label>
                        <textarea className="form-control" value={reason} onChange={e => setReason(e.target.value)} required placeholder="Describe the reason for your leave..." style={{ minHeight: '100px', padding: '0.75rem' }}></textarea>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" className="btn-primary">Submit Request</button>
                    </div>
                </form>
            </div>

            {/* Leave History */}
            <div className="data-table-container">
                <div className="table-header">
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Leave History</h2>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Leave Type</th>
                            <th>From</th>
                            <th>To</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.map((item, index) => (
                            <tr key={index}>
                                <td style={{ fontWeight: 600 }}>{item.type}</td>
                                <td>{item.from}</td>
                                <td>{item.to}</td>
                                <td>
                                    <span className={`badge ${item.status === 'Approved' ? 'badge-success' : item.status === 'Pending' ? 'badge-warning' : 'badge-danger'}`}
                                        style={{
                                            backgroundColor: item.status === 'Approved' ? '#10b981' : item.status === 'Pending' ? '#f59e0b' : '#ef4444',
                                            color: 'white',
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '4px',
                                            fontSize: '0.75rem',
                                            fontWeight: 'bold'
                                        }}>
                                        {item.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LeaveApply;
