import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Mail, Phone, Calendar, Briefcase, Award, ShieldCheck, HardDrive } from 'lucide-react';

const ServiceRecord: React.FC = () => {
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const userRaw = localStorage.getItem('user');
                const localUser = userRaw ? JSON.parse(userRaw) : null;
                
                if (localUser?.id) {
                    const response = await axios.get(`/api/general/user/${localUser.id}`);
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

    const teacher = profile?.teacherProfile;
    const user = profile;

    const infoGroups = [
        {
            title: 'Personal Details',
            icon: <User size={20} />,
            items: [
                { label: 'Full Name', value: user?.name, icon: <User size={16} /> },
                { label: 'Gender', value: teacher?.gender, icon: <User size={16} /> },
                { label: 'Date of Birth', value: teacher?.dateOfBirth, icon: <Calendar size={16} /> },
                { label: 'Email', value: user?.email, icon: <Mail size={16} /> },
                { label: 'Mobile', value: user?.phone, icon: <Phone size={16} /> },
                { label: 'Aadhaar No', value: teacher?.aadhaarNumber, icon: <ShieldCheck size={16} /> },
            ]
        },
        {
            title: 'Professional Details',
            icon: <Award size={20} />,
            items: [
                { label: 'Teacher ID', value: teacher?.employeeId, icon: <HardDrive size={16} /> },
                { label: 'Qualification', value: teacher?.qualification, icon: <Award size={16} /> },
                { label: 'Main Subject', value: teacher?.mainSubject, icon: <Briefcase size={16} /> },
                { label: 'Experience', value: teacher?.experience ? `${teacher.experience} Years` : null, icon: <Calendar size={16} /> },
                { label: 'Employee Type', value: teacher?.employeeType, icon: <Briefcase size={16} /> },
                { label: 'Base Salary', value: teacher?.salary ? `₹ ${teacher.salary}` : null, icon: <Briefcase size={16} /> },
            ]
        }
    ];

    return (
        <div style={{ animation: 'fadeIn 0.5s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: '#e0e7ff', color: '#4f46e5', borderRadius: '12px' }}>
                    <HardDrive size={28} />
                </div>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Service Record</h1>
                    <p style={{ color: '#64748b', marginTop: '0.25rem' }}>Official employment history and professional profile</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
                {infoGroups.map((group, idx) => (
                    <div key={idx} className="stat-card" style={{ display: 'block', height: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ color: '#4f46e5' }}>{group.icon}</div>
                            <h3 style={{ fontWeight: '700', fontSize: '1.1rem', color: '#334155', margin: 0 }}>{group.title}</h3>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            {group.items.map((item, i) => (
                                <div key={i}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', marginBottom: '0.5rem' }}>
                                        {item.icon}
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em' }}>{item.label}</span>
                                    </div>
                                    <p style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>{item.value || 'Not Disclosed'}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="data-table-container" style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#334155', margin: 0 }}>Joining & Employment Timeline</h3>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#f8fafc' }}>
                        <tr>
                            <th style={{ textAlign: 'left', padding: '1.25rem 1.5rem', fontSize: '0.875rem', color: '#64748b' }}>Event</th>
                            <th style={{ textAlign: 'left', padding: '1.25rem 1.5rem', fontSize: '0.875rem', color: '#64748b' }}>Date</th>
                            <th style={{ textAlign: 'left', padding: '1.25rem 1.5rem', fontSize: '0.875rem', color: '#64748b' }}>Position</th>
                            <th style={{ textAlign: 'left', padding: '1.25rem 1.5rem', fontSize: '0.875rem', color: '#64748b' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style={{ padding: '1.25rem 1.5rem', fontWeight: 600 }}>Official Appointment</td>
                            <td style={{ padding: '1.25rem 1.5rem' }}>{teacher?.joiningDate ? new Date(teacher.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}</td>
                            <td style={{ padding: '1.25rem 1.5rem', fontWeight: 500 }}>{teacher?.employeeType || 'Teacher'}</td>
                            <td style={{ padding: '1.25rem 1.5rem' }}>
                                <span style={{ backgroundColor: '#ecfdf5', color: '#059669', padding: '0.35rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #10b981' }}>
                                    Current Employee
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ServiceRecord;
