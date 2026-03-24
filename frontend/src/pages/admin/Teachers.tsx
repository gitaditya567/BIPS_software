import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Teachers: React.FC = () => {
    // Teachers List State
    const [teachers, setTeachers] = useState<any[]>([]);

    // Form Loading State
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Active Tab for Form
    const [activeTab, setActiveTab] = useState('basic');

    // Basic Details
    const [teacherName, setTeacherName] = useState('');
    const [gender, setGender] = useState('');
    const [dob, setDob] = useState('');
    const [photo, setPhoto] = useState('');
    const [mobile, setMobile] = useState('+91 ');
    const [email, setEmail] = useState('');
    const [aadhaar, setAadhaar] = useState('');

    // Professional Details
    const [qualification, setQualification] = useState('');
    const [subject, setSubject] = useState('');
    const [experience, setExperience] = useState('');
    const [joiningDate, setJoiningDate] = useState('');
    const [salary, setSalary] = useState('');
    const [employeeType, setEmployeeType] = useState('');

    // Address
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [stateLocation, setStateLocation] = useState(''); // using stateLocation to avoid React state naming conflict
    const [pincode, setPincode] = useState('');

    // Login Credentials State
    const [loginTeacherId, setLoginTeacherId] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role] = useState('Teacher');
    const [accountStatus, setAccountStatus] = useState('Active');

    // Assignment State
    const [assignTeacherId, setAssignTeacherId] = useState('');
    const [assignClass, setAssignClass] = useState('');
    const [assignSection, setAssignSection] = useState('');
    const [assignSubject, setAssignSubject] = useState('');

    useEffect(() => {
        fetchTeachers();
    }, []);

    const fetchTeachers = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/admin/teachers');
            setTeachers(res.data);
        } catch (err) {
            console.error('Failed to fetch teachers:', err);
        }
    };

    const addTeacher = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!teacherName) return alert('Please fill required fields (Teacher Name)');

        setLoading(true);

        try {
            if (editingId) {
                await axios.put(`http://localhost:5000/api/admin/teachers/${editingId}`, {
                    teacherName, gender, dob, photo, mobile, email, aadhaar,
                    qualification, subject, experience, joiningDate, salary, employeeType,
                    address, city, stateLocation, pincode, username, password
                });
                setEditingId(null);
            } else {
                await axios.post('http://localhost:5000/api/admin/teachers', {
                    teacherName, gender, dob, photo, mobile, email, aadhaar,
                    qualification, subject, experience, joiningDate, salary, employeeType,
                    address, city, stateLocation, pincode, username, password
                });
            }

            // Reset Form Values
            setTeacherName(''); setGender(''); setDob(''); setPhoto(''); setMobile('+91 '); setEmail(''); setAadhaar('');
            setQualification(''); setSubject(''); setExperience(''); setJoiningDate(''); setSalary(''); setEmployeeType('');
            setAddress(''); setCity(''); setStateLocation(''); setPincode('');
            setUsername(''); setPassword(''); setConfirmPassword('');
            setEditingId(null); // Reset editingId after successful add/edit

            setActiveTab('basic');
            fetchTeachers();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to register teacher');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this teacher?')) {
            try {
                await axios.delete(`http://localhost:5000/api/admin/teachers/${id}`);
                fetchTeachers();
            } catch (err) {
                alert('Failed to delete teacher');
            }
        }
    };

    const handleEdit = (t: any) => {
        setEditingId(t.id);
        setTeacherName(t.name);
        setGender(t.gender || '');
        setDob(t.dob || '');
        setPhoto(t.photo || '');
        setMobile(t.mobile || '+91 ');
        setEmail(t.email === 'N/A' ? '' : t.email);
        setAadhaar(t.aadhaar || '');
        setQualification(t.qualification || '');
        setSubject(t.subject || '');
        setExperience(t.experience || '');
        setJoiningDate(t.joiningDate ? new Date(t.joiningDate).toISOString().split('T')[0] : '');
        setSalary(t.salary || '');
        setEmployeeType(t.employeeType || '');
        
        // Handle Address
        const addrParts = t.address ? t.address.split(', ') : [];
        setAddress(addrParts[0] || '');
        setCity(addrParts[1] || '');
        const stateZip = addrParts[2] ? addrParts[2].split(' - ') : [];
        setStateLocation(stateZip[0] || '');
        setPincode(stateZip[1] || '');

        setActiveTab('basic');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div>
            <h1 style={{ marginBottom: '2rem', fontSize: '1.875rem', fontWeight: 800 }}>Teacher Management</h1>

            {/* Add Teacher Card */}
            <div className="stat-card" style={{ display: 'block', marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', fontWeight: 'bold' }}>Teacher Registration</h3>

                <form onSubmit={addTeacher}>
                    <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
                        <button type="button" onClick={() => setActiveTab('basic')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 1rem', fontSize: '1rem', fontWeight: activeTab === 'basic' ? 'bold' : 'normal', color: activeTab === 'basic' ? '#2563eb' : '#6b7280', borderBottom: activeTab === 'basic' ? '2px solid #2563eb' : 'none' }}>Basic Details</button>
                        <button type="button" onClick={() => setActiveTab('professional')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 1rem', fontSize: '1rem', fontWeight: activeTab === 'professional' ? 'bold' : 'normal', color: activeTab === 'professional' ? '#2563eb' : '#6b7280', borderBottom: activeTab === 'professional' ? '2px solid #2563eb' : 'none' }}>Professional Details</button>
                        <button type="button" onClick={() => setActiveTab('address')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 1rem', fontSize: '1rem', fontWeight: activeTab === 'address' ? 'bold' : 'normal', color: activeTab === 'address' ? '#2563eb' : '#6b7280', borderBottom: activeTab === 'address' ? '2px solid #2563eb' : 'none' }}>Address</button>
                    </div>

                    {activeTab === 'basic' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label>Teacher ID</label>
                                <input type="text" className="form-control" value="Auto Generated" disabled style={{ backgroundColor: '#f0f0f0' }} />
                            </div>

                            <div className="form-group">
                                <label>Teacher Name</label>
                                <input type="text" className="form-control" value={teacherName} onChange={e => setTeacherName(e.target.value)} required />
                            </div>

                            <div className="form-group">
                                <label>Gender</label>
                                <select className="form-control" value={gender} onChange={e => setGender(e.target.value)}>
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Date of Birth</label>
                                <input type="date" className="form-control" value={dob} onChange={e => setDob(e.target.value)} />
                            </div>

                            <div className="form-group">
                                <label>Mobile Number (10 Digits)</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={mobile} 
                                    onChange={e => {
                                        const val = e.target.value;
                                        // Keeping the +91 prefix part
                                        if (val.startsWith('+91 ')) {
                                            const num = val.slice(4).replace(/\D/g, '');
                                            if (num.length <= 10) {
                                                setMobile('+91 ' + num);
                                            }
                                        } else if (val.length < 4) {
                                            // Don't allow deleting the prefix
                                            setMobile('+91 ');
                                        }
                                    }} 
                                />
                            </div>

                            <div className="form-group">
                                <label>Email Address (optional)</label>
                                <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} />
                            </div>

                            <div className="form-group">
                                <label>Aadhaar Number (optional)</label>
                                <input type="text" className="form-control" value={aadhaar} onChange={e => setAadhaar(e.target.value)} />
                            </div>

                            <div className="form-group">
                                <label>Photo Upload (optional)</label>
                                <input type="file" className="form-control" accept="image/*" onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => setPhoto(reader.result as string);
                                        reader.readAsDataURL(file);
                                    }
                                }} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'professional' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label>Qualification</label>
                                <input type="text" className="form-control" value={qualification} onChange={e => setQualification(e.target.value)} />
                            </div>

                            <div className="form-group">
                                <label>Subject</label>
                                <input type="text" className="form-control" value={subject} onChange={e => setSubject(e.target.value)} />
                            </div>

                            <div className="form-group">
                                <label>Experience (in years)</label>
                                <input type="text" className="form-control" value={experience} onChange={e => setExperience(e.target.value)} />
                            </div>

                            <div className="form-group">
                                <label>Joining Date</label>
                                <input type="date" className="form-control" value={joiningDate} onChange={e => setJoiningDate(e.target.value)} />
                            </div>

                            <div className="form-group">
                                <label>Salary</label>
                                <input type="text" className="form-control" value={salary} onChange={e => setSalary(e.target.value)} />
                            </div>

                            <div className="form-group">
                                <label>Employee Type</label>
                                <select className="form-control" value={employeeType} onChange={e => setEmployeeType(e.target.value)}>
                                    <option value="">Select Type</option>
                                    <option value="Full time">Full time</option>
                                    <option value="Part time">Part time</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {activeTab === 'address' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label>Address</label>
                                <input type="text" className="form-control" value={address} onChange={e => setAddress(e.target.value)} />
                            </div>

                            <div className="form-group">
                                <label>City</label>
                                <input type="text" className="form-control" value={city} onChange={e => setCity(e.target.value)} />
                            </div>

                            <div className="form-group">
                                <label>State</label>
                                <input type="text" className="form-control" value={stateLocation} onChange={e => setStateLocation(e.target.value)} />
                            </div>

                            <div className="form-group">
                                <label>Pincode</label>
                                <input type="text" className="form-control" value={pincode} onChange={e => setPincode(e.target.value)} />
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            Submit Registration
                        </button>
                    </div>
                </form>
            </div>

            {/* Teacher Login Credentials Card */}
            <div className="stat-card" style={{ display: 'block', marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', fontWeight: 'bold' }}>Teacher Login Credentials</h3>

                <form onSubmit={(e) => { e.preventDefault(); alert('Credentials Saved (Frontend Only)'); }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label>Teacher Name</label>
                            <select className="form-control" value={loginTeacherId} onChange={e => setLoginTeacherId(e.target.value)} required>
                                <option value="">Select Teacher</option>
                                {teachers.map((t, idx) => (
                                    <option key={idx} value={t.teacherId}>{t.name} ({t.teacherId})</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Username</label>
                            <input type="text" className="form-control" value={username} onChange={e => setUsername(e.target.value)} required />
                        </div>

                        <div className="form-group">
                            <label>Password</label>
                            <input type="password" className="form-control" value={password} onChange={e => setPassword(e.target.value)} required />
                        </div>

                        <div className="form-group">
                            <label>Confirm Password</label>
                            <input type="password" className="form-control" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                        </div>

                        <div className="form-group">
                            <label>Role</label>
                            <input type="text" className="form-control" value={role} disabled style={{ backgroundColor: '#f0f0f0' }} />
                        </div>

                        <div className="form-group">
                            <label>Status</label>
                            <select className="form-control" value={accountStatus} onChange={e => setAccountStatus(e.target.value)}>
                                <option value="Active">Active</option>
                                <option value="Disable">Disable</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
                        <button type="submit" className="btn-primary">
                            Save Credentials
                        </button>
                    </div>
                </form>
            </div>

            {/* Class & Subject Assignment Card */}
            <div className="stat-card" style={{ display: 'block', marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', fontWeight: 'bold' }}>Class & Subject Assignment</h3>

                <form onSubmit={(e) => { e.preventDefault(); alert('Assignment Saved (Frontend Only)'); }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label>Teacher Name</label>
                            <select className="form-control" value={assignTeacherId} onChange={e => setAssignTeacherId(e.target.value)} required>
                                <option value="">Select Teacher</option>
                                {teachers.map((t, idx) => (
                                    <option key={idx} value={t.teacherId}>{t.name} ({t.teacherId})</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Class</label>
                            <select className="form-control" value={assignClass} onChange={e => setAssignClass(e.target.value)} required>
                                <option value="">Select Class</option>
                                <option value="1">Class 1</option>
                                <option value="2">Class 2</option>
                                <option value="3">Class 3</option>
                                <option value="4">Class 4</option>
                                <option value="5">Class 5</option>
                                <option value="6">Class 6</option>
                                <option value="7">Class 7</option>
                                <option value="8">Class 8</option>
                                <option value="9">Class 9</option>
                                <option value="10">Class 10</option>
                                <option value="11">Class 11</option>
                                <option value="12">Class 12</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Section</label>
                            <select className="form-control" value={assignSection} onChange={e => setAssignSection(e.target.value)} required>
                                <option value="">Select Section</option>
                                <option value="A">Section A</option>
                                <option value="B">Section B</option>
                                <option value="C">Section C</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Subject</label>
                            <input type="text" className="form-control" value={assignSubject} onChange={e => setAssignSubject(e.target.value)} required placeholder="e.g. Mathematics" />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
                        <button type="submit" className="btn-primary">
                            Assign Subject
                        </button>
                    </div>
                </form>
            </div>

            {/* List */}
            <div className="data-table-container">
                <div className="table-header">
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Teacher Records</h2>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>TEACHER ID</th>
                            <th>NAME</th>
                            <th>EMAIL</th>
                            <th>MOBILE</th>
                            <th>SUBJECT</th>
                            <th>TYPE</th>
                            <th>STATUS</th>
                            <th>ACTION</th>
                        </tr>
                    </thead>
                    <tbody>
                        {teachers.length === 0 ? (
                            <tr><td colSpan={8} style={{ textAlign: 'center' }}>No teachers found</td></tr>
                        ) : teachers.map((t) => (
                            <tr key={t.id}>
                                <td style={{ fontWeight: 'bold' }}>{t.teacherId}</td>
                                <td>{t.name}</td>
                                <td>{t.email}</td>
                                <td>{t.mobile || 'N/A'}</td>
                                <td>{t.subject || 'N/A'}</td>
                                <td>{t.employeeType || 'N/A'}</td>
                                <td><span className="badge badge-success">{t.status}</span></td>
                                <td style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button 
                                        className="btn-primary" 
                                        onClick={() => handleEdit(t)} 
                                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.875rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                    >
                                        Edit
                                    </button>
                                    <button 
                                        className="btn-danger" 
                                        onClick={() => handleDelete(t.id)} 
                                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.875rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Teachers;
