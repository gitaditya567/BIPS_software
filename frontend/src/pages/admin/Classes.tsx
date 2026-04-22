import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Classes: React.FC = () => {
    const [classes, setClasses] = useState<any[]>([]);
    const [newClassName, setNewClassName] = useState('');
    const [newSectionName, setNewSectionName] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        try {
            const res = await axios.get('/erp-api/admin/classes');
            setClasses(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const addClass = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newClassName) return;
        setLoading(true);
        try {
            await axios.post('/erp-api/admin/classes', { name: newClassName });
            setNewClassName('');
            fetchClasses();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const addSection = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSectionName || !selectedClassId) return;
        setLoading(true);
        try {
            await axios.post(`/erp-api/admin/classes/${selectedClassId}/sections`, { name: newSectionName });
            setNewSectionName('');
            setSelectedClassId('');
            fetchClasses();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h1 style={{ marginBottom: '2rem', fontSize: '1.875rem', fontWeight: 800 }}>Manage Classes & Sections</h1>

            <div className="dashboard-grid">
                {/* Add Class Form */}
                <div className="stat-card" style={{ display: 'block' }}>
                    <h3 style={{ marginBottom: '1rem', fontWeight: 'bold' }}>Add New Class</h3>
                    <form onSubmit={addClass}>
                        <div className="form-group">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Class Name (e.g., Grade 10)"
                                value={newClassName}
                                onChange={(e) => setNewClassName(e.target.value)}
                            />
                        </div>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            Add Class
                        </button>
                    </form>
                </div>

                {/* Add Section Form */}
                <div className="stat-card" style={{ display: 'block' }}>
                    <h3 style={{ marginBottom: '1rem', fontWeight: 'bold' }}>Add Section to Class</h3>
                    <form onSubmit={addSection}>
                        <div className="form-group">
                            <select
                                className="form-control"
                                value={selectedClassId}
                                onChange={(e) => setSelectedClassId(e.target.value)}
                            >
                                <option value="">Select a Class</option>
                                {classes.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Section Name (e.g., A, B, Science)"
                                value={newSectionName}
                                onChange={(e) => setNewSectionName(e.target.value)}
                            />
                        </div>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            Add Section
                        </button>
                    </form>
                </div>
            </div>

            {/* List */}
            <div className="data-table-container">
                <div className="table-header">
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Existing Classes</h2>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Class Name</th>
                            <th>Sections</th>
                        </tr>
                    </thead>
                    <tbody>
                        {classes.length === 0 ? (
                            <tr><td colSpan={2} style={{ textAlign: 'center' }}>No classes found</td></tr>
                        ) : classes.map((c) => (
                            <tr key={c.id}>
                                <td style={{ fontWeight: 'bold' }}>{c.name}</td>
                                <td>
                                    {c.sections && c.sections.length > 0
                                        ? c.sections.map((s: any) => <span key={s.id} className="badge badge-success" style={{ marginRight: '0.5rem' }}>{s.name}</span>)
                                        : <span className="text-muted">No sections</span>
                                    }
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Classes;
