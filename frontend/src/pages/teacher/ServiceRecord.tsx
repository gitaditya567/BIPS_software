import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Calendar, Award } from 'lucide-react';

const ServiceRecord: React.FC = () => {
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const userRaw = localStorage.getItem('user');
                const localUser = userRaw ? JSON.parse(userRaw) : null;
                
                if (localUser?.id) {
                    const response = await axios.get(`/erp-api/general/user/${localUser.id}`);
                    setProfile(response.data);
                }
            } catch (error) {
                console.error('Error fetching service record:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    if (loading) return <div style={{ padding: '2rem' }}>Loading Service Record...</div>;

    const teacher = profile?.teacherInfo;
    const user = profile;

    return (
        <div style={{ animation: 'fadeIn 0.5s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: '#e0e7ff', color: '#4f46e5', borderRadius: '12px' }}>
                    <Calendar size={28} />
                </div>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Service Record</h1>
                    <p style={{ color: '#64748b', marginTop: '0.25rem' }}>Quick overview of your employment details</p>
                </div>
            </div>

            <div className="stat-card" style={{ display: 'block', maxWidth: '600px', border: '1px solid #e2e8f0' }}>
                <div style={{ padding: '1rem 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', marginBottom: '0.75rem' }}>
                            <User size={18} />
                            <span style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Teacher Name</span>
                        </div>
                        <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>{user?.name || 'Loading...'}</p>
                    </div>
                    
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', marginBottom: '0.75rem' }}>
                            <Calendar size={18} />
                            <span style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Joining Date</span>
                        </div>
                        <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                            {teacher?.joiningDate ? new Date(teacher.joiningDate).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                            }) : 'N/A'}
                        </p>
                    </div>
                </div>
                
                <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#ecfdf5', color: '#059669', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 700 }}>
                        <Award size={18} />
                        Active Employee
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ServiceRecord;
