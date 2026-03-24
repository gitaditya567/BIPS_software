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

    const userRole = JSON.parse(localStorage.getItem('user') || '{}').role || 'GUEST';
    const isParentOrStudent = userRole === 'PARENT' || userRole === 'STUDENT';

    useEffect(() => {
        fetchNotices();
    }, []);

    const fetchNotices = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/general/notices');
            setNotices(res.data);
        } catch (err) { console.error(err); }
    };

    const handleAddNotice = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost:5000/api/general/notices', {
                title,
                message,
                targetClass: selectedClass,
                section,
                postedBy: 'System' // Or actual user name
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
            await axios.delete(`http://localhost:5000/api/general/notices/${id}`);
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
                            <div className="form-group">
                                <label>Class</label>
                                <select className="form-control" value={selectedClass} onChange={e => setSelectedClass(e.target.value)} required>
                                    <option value="">Select Class</option>
                                    <option value="9">Class 9</option>
                                    <option value="10">Class 10</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Section</label>
                                <select className="form-control" value={section} onChange={e => setSection(e.target.value)} required>
                                    <option value="">Select Section</option>
                                    <option value="A">Section A</option>
                                    <option value="B">Section B</option>
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

            {/* Notice List */}
            <div className="data-table-container">
                <div className="table-header">
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Notice History</h2>
                </div>
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
                            <tr key={index}>
                                <td>{new Date(notice.date).toLocaleDateString()}</td>
                                <td style={{ fontWeight: 600 }}>{notice.title}</td>
                                <td>{notice.class}{notice.section}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.875rem' }} onClick={() => alert(notice.message || 'Viewing Notice...')}>View</button>
                                        {!isParentOrStudent && (
                                            <button className="btn-danger" style={{ padding: '0.3rem 0.6rem', fontSize: '0.875rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }} onClick={() => handleDelete(notice.id)}>Delete</button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Notice;
