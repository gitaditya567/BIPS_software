import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PendingFee: React.FC = () => {
    // Form states for filtering
    const [classes, setClasses] = useState<any[]>([]);

    const [feeData, setFeeData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const userRaw = localStorage.getItem('user');
    const user = userRaw ? JSON.parse(userRaw) : null;
    const teacherId = user?.id;

    useEffect(() => {
        if (!teacherId) return;
        const fetchClasses = async () => {
            try {
                const res = await axios.get(`/erp-api/teacher/${teacherId}/classes`);
                setClasses(res.data);
            } catch (err) {
                console.error("Failed to fetch classes", err);
            }
        };
        fetchClasses();
    }, [teacherId]);

    const handleClassChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const uniqueKey = e.target.value;
        const cls = classes.find((c) => c.id === uniqueKey);
        
        if (!cls) {
            setFeeData([]);
            return;
        }


        setLoading(true);
        try {
            const res = await axios.get(`/erp-api/teacher/students/fees?classId=${cls.classId}&sectionId=${cls.sectionId}`);
            setFeeData(res.data);
        } catch (err) {
            console.error("Failed to fetch pending fees", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h1 style={{ marginBottom: '2rem', fontSize: '1.875rem', fontWeight: 800 }}>Pending Fee List</h1>

            {/* Filters */}
            <div className="stat-card" style={{ display: 'block', marginBottom: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                    <div className="form-group">
                        <label>Assigned Class & Section</label>
                        <select className="form-control" onChange={handleClassChange}>
                            <option value="">Select Class & Section</option>
                            {classes.map((cls) => (
                                <option key={cls.id} value={cls.id}>
                                    Class {cls.grade} - {cls.section} ({cls.subject})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Fee Due Table */}
            <div className="data-table-container">
                <div className="table-header">
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Fee Due Record</h2>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>S.No.</th>
                            <th>Student</th>
                            <th>Total Fee</th>
                            <th>Paid</th>
                            <th style={{ color: '#ef4444' }}>Pending</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>Loading fee details...</td>
                            </tr>
                        ) : feeData.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>Select a class or no students found.</td>
                            </tr>
                        ) : feeData.map((data, index) => (
                            <tr key={index}>
                                <td>{index + 1}</td>
                                <td style={{ fontWeight: 'bold' }}>{data.name}</td>
                                <td>₹{data.totalFee.toLocaleString()}</td>
                                <td style={{ color: '#10b981', fontWeight: 600 }}>₹{data.paid.toLocaleString()}</td>
                                <td style={{ color: '#ef4444', fontWeight: 'bold' }}>₹{data.pending.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PendingFee;
