import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SectionCard = ({ title, children }: any) => (
    <div style={{
        backgroundColor: 'white', borderRadius: '20px', padding: '2rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #edf2f7'
    }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#2d3748', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #f0f4f8' }}>
            {title}
        </h3>
        {children}
    </div>
);

const StudentProfile: React.FC = () => {
    const [user, setUser] = useState<any>(() => {
        const userRaw = localStorage.getItem('user');
        return userRaw ? JSON.parse(userRaw) : null;
    });

    useEffect(() => {
        const fetchUserData = async () => {
            if (user?.id) {
                try {
                    const res = await axios.get(`/api/general/user/${user.id}`);
                    if (res.data) {
                        const updatedUser = { ...user, ...res.data, role: user.role }; 
                        setUser(updatedUser);
                        localStorage.setItem('user', JSON.stringify(updatedUser));
                    }
                } catch (err) {
                    console.error("Failed to fetch user data", err);
                }
            }
        };
        fetchUserData();
    }, [user?.id]);

    if (!user) return <div style={{ padding: '2rem' }}>Loading...</div>;

    return (
        <div style={{ fontFamily: "'Inter', sans-serif", padding: '0.5rem 0' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1a202c', marginBottom: '1.5rem' }}>
                Student Details
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <SectionCard title="👤 Personal & Parent Details">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div><label style={{ fontSize: '0.75rem', color: '#718096', textTransform: 'uppercase', fontWeight: 700 }}>Full Name</label><p style={{ margin: '0.2rem 0', fontWeight: '600' }}>{user.studentInfo?.user?.name || user.name}</p></div>
                            <div><label style={{ fontSize: '0.75rem', color: '#718096', textTransform: 'uppercase', fontWeight: 700 }}>SR No (Admission No)</label><p style={{ margin: '0.2rem 0', fontWeight: '800', color: '#2b6cb0' }}>{user.studentInfo?.admissionNo || 'N/A'}</p></div>
                            <div><label style={{ fontSize: '0.75rem', color: '#718096', textTransform: 'uppercase', fontWeight: 700 }}>Date of Birth</label><p style={{ margin: '0.2rem 0' }}>{user.studentInfo?.dateOfBirth || 'N/A'}</p></div>
                            <div><label style={{ fontSize: '0.75rem', color: '#718096', textTransform: 'uppercase', fontWeight: 700 }}>Gender</label><p style={{ margin: '0.2rem 0' }}>{user.studentInfo?.gender || 'N/A'}</p></div>
                            
                            <div style={{ borderTop: '1px solid #edf2f7', gridColumn: 'span 2', paddingTop: '1.5rem', marginBottom: '0.5rem' }}>
                                <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#4a5568' }}>Guardian Information</h4>
                            </div>
                            
                            <div><label style={{ fontSize: '0.75rem', color: '#718096', textTransform: 'uppercase', fontWeight: 700 }}>Father Name</label><p style={{ margin: '0.2rem 0', fontWeight: '600' }}>{user.studentInfo?.fatherName || 'N/A'}</p></div>
                            <div><label style={{ fontSize: '0.75rem', color: '#718096', textTransform: 'uppercase', fontWeight: 700 }}>Mother Name</label><p style={{ margin: '0.2rem 0', fontWeight: '600' }}>{user.studentInfo?.motherName || 'N/A'}</p></div>
                            <div><label style={{ fontSize: '0.75rem', color: '#718096', textTransform: 'uppercase', fontWeight: 700 }}>Father Contact</label><p style={{ margin: '0.2rem 0' }}>{user.studentInfo?.fatherMobile || 'N/A'}</p></div>
                            <div><label style={{ fontSize: '0.75rem', color: '#718096', textTransform: 'uppercase', fontWeight: 700 }}>Address</label><p style={{ margin: '0.2rem 0', fontSize: '0.85rem' }}>{user.studentInfo?.user?.address || 'N/A'}</p></div>
                        </div>
                    </SectionCard>

                    <SectionCard title="🏫 Previous Schooling">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div><label style={{ fontSize: '0.75rem', color: '#718096', textTransform: 'uppercase', fontWeight: 700 }}>Prev. School</label><p style={{ margin: '0.2rem 0' }}>{user.studentInfo?.prevSchoolName || 'N/A'}</p></div>
                            <div><label style={{ fontSize: '0.75rem', color: '#718096', textTransform: 'uppercase', fontWeight: 700 }}>Leaving Reason</label><p style={{ margin: '0.2rem 0' }}>{user.studentInfo?.leavingReason || 'N/A'}</p></div>
                        </div>
                    </SectionCard>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <SectionCard title="🎓 Academic Info">
                            <div style={{ textAlign: 'center', padding: '1.5rem 0', backgroundColor: '#f9f9ff', borderRadius: '16px', border: '1px dashed #cbd5e0', marginBottom: '1.5rem' }}>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#718096' }}>Current Class</p>
                                <h2 style={{ margin: '0.5rem 0', color: '#4a90e2', fontSize: '2.5rem' }}>{user.studentInfo?.class?.name || 'N/A'}</h2>
                                <span style={{ backgroundColor: '#edf2ff', color: '#4451b2', padding: '0.3rem 1rem', borderRadius: '20px', fontWeight: '700', fontSize: '0.8rem' }}>Section {user.studentInfo?.section?.name || 'A'}</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                                <span style={{ color: '#718096', fontSize: '0.9rem' }}>Roll No</span>
                                <span style={{ fontWeight: '700' }}>{user.studentInfo?.rollNumber || 'N/A'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                                <span style={{ color: '#718096', fontSize: '0.9rem' }}>Blood Group</span>
                                <span style={{ fontWeight: '700', color: '#e53e3e' }}>{user.studentInfo?.bloodGroup || 'N/A'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                                <span style={{ color: '#718096', fontSize: '0.9rem' }}>Admission Date</span>
                                <span style={{ fontWeight: '700' }}>{user.studentInfo?.admissionDate ? new Date(user.studentInfo.admissionDate).toLocaleDateString('en-GB') : 'N/A'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#718096', fontSize: '0.9rem' }}>House</span>
                                <span style={{ fontWeight: '700', color: '#38a169' }}>{user.studentInfo?.house || 'N/A'}</span>
                            </div>
                            </div>
                    </SectionCard>

                    {user.studentInfo?.photo && (
                        <SectionCard title="📸 Student Photo">
                            <div style={{ textAlign: 'center' }}>
                                <img src={user.studentInfo.photo} alt="Student" style={{ width: '100%', maxWidth: '200px', borderRadius: '16px', border: '5px solid #fff', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />
                            </div>
                        </SectionCard>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentProfile;
