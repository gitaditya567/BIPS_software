import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotification } from '../../context/NotificationContext';

const Notice: React.FC = () => {
    const { addNotification } = useNotification();
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [section, setSection] = useState('');
    const [notices, setNotices] = useState<any[]>([]);
    const [selectedNotice, setSelectedNotice] = useState<any>(null);

    const userRaw = localStorage.getItem('user');
    const user = userRaw ? JSON.parse(userRaw) : {};
    const userRole = user.role || 'GUEST';
    const teacherId = user.id;

    const isParentOrStudent = userRole === 'PARENT' || userRole === 'STUDENT';
    const [classes, setClasses] = useState<any[]>([]);

    useEffect(() => {
        fetchNotices();
        if (userRole === 'TEACHER' && teacherId) {
            axios.get(`/erp-api/teacher/${teacherId}/classes`)
                .then(res => setClasses(res.data))
                .catch(err => console.error("Failed to fetch teacher classes", err));
        }
    }, [userRole, teacherId]);

    const fetchNotices = async () => {
        try {
            let url = '/erp-api/general/notices';
            if (userRole === 'TEACHER' && teacherId) {
                url += `?authorId=${teacherId}`;
            }
            const res = await axios.get(url);
            setNotices(res.data);
        } catch (err) { console.error(err); }
    };

    const handleAddNotice = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const postedBy = user.name || 'Teacher';
            const res = await axios.post('/erp-api/general/notices', {
                title,
                message,
                targetClass: selectedClass,
                section,
                postedBy,
                authorId: teacherId
            });
            setNotices([res.data, ...notices]);
            setTitle('');
            setMessage('');
            setSelectedClass('');
            setSection('');
            addNotification('notice', 'Notice Added', `"${title}" notice posted successfully.`);
        } catch (err) { alert('Failed to post notice'); }
    };

    const handleDelete = async (id: string) => {
        if (isParentOrStudent) return;
        try {
            await axios.delete(`/erp-api/general/notices/${id}`);
            setNotices(notices.filter(n => n.id !== id));
            alert('Notice Deleted Successfully');
        } catch (err) { alert('Failed to delete notice'); }
    };

    return (
        <div>
            <h1 style={{ marginBottom: '2rem', fontSize: '1.875rem', fontWeight: 800 }}>Notice Board</h1>

            {/* Add Notice Form (Hidden for Parents/Students) */}
            {!isParentOrStudent && (
                <div className="stat-card" style={{ display: 'block', marginBottom: '2rem' }}>
                    <h3 style={{ marginBottom: '1.5rem', fontWeight: 'bold' }}>Add New Notice</h3>
                    <form onSubmit={handleAddNotice}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <div className="form-group">
                                <label>Notice Title</label>
                                <input type="text" className="form-control" value={title} onChange={e => setTitle(e.target.value)} required placeholder="Enter notice title" />
                            </div>
                            <div className="form-group">
                                <label>Attachment (optional)</label>
                                <input type="file" className="form-control" />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Assigned Class & Section</label>
                                <select 
                                    className="form-control" 
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (!val) {
                                            setSelectedClass('');
                                            setSection('');
                                            return;
                                        }
                                        const cls = classes.find(c => c.id === val);
                                        if (cls) {
                                            setSelectedClass(cls.classId);
                                            setSection(cls.section);
                                        }
                                    }} 
                                    required
                                >
                                    <option value="">Select Class & Section</option>
                                    {classes.map(cls => (
                                        <option key={cls.id} value={cls.id}>
                                            Class {cls.grade} - {cls.section}
                                        </option>
                                    ))}
                                    {/* Fallback option if they want to send to ALL or no classes are found, though requirements state they should only send to assigned classes */}
                                </select>
                            </div>
                        </div>
                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label>Message</label>
                            <textarea className="form-control" value={message} onChange={e => setMessage(e.target.value)} required placeholder="Type your message here..." style={{ minHeight: '100px', padding: '0.75rem' }}></textarea>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button type="submit" className="btn-primary">Send Notice</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Notice Split View */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2rem', alignItems: 'start' }}>
                {/* Notice List */}
                <div className="data-table-container" style={{ margin: 0 }}>
                    <div className="table-header">
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Notice History</h2>
                    </div>
                    <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Title</th>
                                    <th>Class</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {notices.map((notice, index) => (
                                    <tr key={index} style={{ backgroundColor: selectedNotice?.id === notice.id ? '#eff6ff' : 'transparent' }}>
                                        <td>{new Date(notice.date).toLocaleDateString()}</td>
                                        <td style={{ fontWeight: 600 }}>{notice.title}</td>
                                        <td>
                                            {notice.class === 'All' || !notice.class ? 'All Classes' : `Class ${notice.className || notice.class}`} {notice.section ? ` Sec: ${notice.section}` : ''}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.875rem' }} onClick={() => setSelectedNotice(notice)}>View</button>
                                                {!isParentOrStudent && (
                                                    <button className="btn-danger" style={{ padding: '0.3rem 0.6rem', fontSize: '0.875rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }} onClick={() => handleDelete(notice.id)}>Delete</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {notices.length === 0 && (
                                    <tr>
                                        <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>No notices available</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Notice Details Board */}
                <div style={{ flex: 1 }}>
                    {selectedNotice ? (
                        <div 
                            style={{ 
                                backgroundColor: '#fef3c7', 
                                border: '1px solid #fcd34d',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                borderRadius: '0.5rem',
                                padding: '2rem 1.5rem',
                                position: 'relative',
                                minHeight: '400px',
                                backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #fcd34d 31px, #fcd34d 32px)',
                                backgroundPositionY: '38px' // Align lines carefully
                            }}
                        >
                            {/* Push Pin */}
                            <div 
                                style={{
                                    position: 'absolute',
                                    top: '-12px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: '24px',
                                    height: '24px',
                                    backgroundColor: '#ef4444',
                                    borderRadius: '50%',
                                    boxShadow: 'inset -3px -3px 6px rgba(0,0,0,0.3), 0 4px 6px rgba(0,0,0,0.4)',
                                    border: '1px solid #b91c1c',
                                    zIndex: 10
                                }}
                            >
                                {/* Pin highlight */}
                                <div style={{ position: 'absolute', top: '4px', left: '4px', width: '6px', height: '6px', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: '50%' }}></div>
                            </div>
                            
                            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1f2937', marginBottom: '0.5rem', textAlign: 'center', fontFamily: 'serif' }}>
                                {selectedNotice.title}
                            </h3>
                            <div style={{ fontSize: '0.875rem', color: '#6b7280', textAlign: 'center', marginBottom: '1.5rem', borderBottom: '2px dashed #f59e0b', paddingBottom: '0.75rem' }}>
                                <strong>Date:</strong> {new Date(selectedNotice.date).toLocaleDateString()} &nbsp;|&nbsp; <strong>By:</strong> {selectedNotice.postedBy || 'Admin'}
                            </div>
                            <div 
                                style={{ 
                                    fontSize: '1.125rem', 
                                    color: '#374151', 
                                    lineHeight: '32px', // Match background gradient
                                    whiteSpace: 'pre-wrap', 
                                    fontFamily: '"Comic Sans MS", "Chalkboard SE", cursive, sans-serif'
                                }}
                            >
                                {selectedNotice.message}
                            </div>
                        </div>
                    ) : (
                        <div 
                            style={{ 
                                backgroundColor: '#f9fafb', 
                                border: '2px dashed #d1d5db', 
                                borderRadius: '0.5rem', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                height: '100%', 
                                minHeight: '400px', 
                                color: '#9ca3af' 
                            }}
                        >
                            <p style={{ fontSize: '1.125rem' }}>Click "View" on any notice to read it here</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Notice;
