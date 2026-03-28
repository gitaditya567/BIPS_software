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

    // UI State
    const [showPassword, setShowPassword] = useState(false);
    const [classList, setClassList] = useState<any[]>([]);

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
    const [stateLocation, setStateLocation] = useState('');
    const [pincode, setPincode] = useState('');

    // Login Credentials State
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Assignment State
    const [assignClass, setAssignClass] = useState('');
    const [assignSection, setAssignSection] = useState('');
    const [assignSubject, setAssignSubject] = useState('');

    useEffect(() => {
        fetchTeachers();
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        try {
            const res = await axios.get('/api/admin/classes');
            setClassList(res.data);
        } catch (err) {
            console.error('Failed to fetch classes:', err);
        }
    };

    const fetchTeachers = async () => {
        try {
            const res = await axios.get('/api/admin/teachers');
            setTeachers(res.data);
        } catch (err) {
            console.error('Failed to fetch teachers:', err);
        }
    };

    const addTeacher = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation
        if (!teacherName) return alert('Please fill required fields (Teacher Name)');
        if (!editingId && (!username || !password)) return alert('Username and Password are required');
        if (password && password !== confirmPassword) return alert('Passwords do not match');

        setLoading(true);

        try {
            const payload = {
                teacherName, gender, dob, photo, mobile, email, aadhaar,
                qualification, subject, experience, joiningDate, salary, employeeType,
                address, city, stateLocation, pincode, username, password,
                assignClass, assignSection, assignSubject
            };

            if (editingId) {
                await axios.put(`/api/admin/teachers/${editingId}`, payload);
            } else {
                await axios.post('/api/admin/teachers', payload);
            }

            // Reset Form
            resetForm();
            fetchTeachers();
            alert(editingId ? 'Teacher updated successfully!' : 'Teacher registered successfully!');
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to process teacher registration');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setTeacherName(''); setGender(''); setDob(''); setPhoto(''); setMobile('+91 '); setEmail(''); setAadhaar('');
        setQualification(''); setSubject(''); setExperience(''); setJoiningDate(''); setSalary(''); setEmployeeType('');
        setAddress(''); setCity(''); setStateLocation(''); setPincode('');
        setUsername(''); setPassword(''); setConfirmPassword('');
        setAssignClass(''); setAssignSection(''); setAssignSubject('');
        setEditingId(null);
        setActiveTab('basic');
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this teacher?')) {
            try {
                await axios.delete(`/api/admin/teachers/${id}`);
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
        
        const addrParts = t.address ? t.address.split(', ') : [];
        setAddress(addrParts[0] || '');
        setCity(addrParts[1] || '');
        const stateZip = addrParts[2] ? addrParts[2].split(' - ') : [];
        setStateLocation(stateZip[0] || '');
        setPincode(stateZip[1] || '');

        setUsername(t.email === 'N/A' ? '' : t.email);
        setPassword('');
        setConfirmPassword('');
        
        // Populate assignment details from teacher record
        setAssignClass(t.assignClass || '');
        setAssignSubject(t.assignSubject || t.subject || '');

        setActiveTab('basic');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div style={{ padding: '0.5rem' }}>
            <h1 style={{ marginBottom: '2rem', fontSize: '1.875rem', fontWeight: 800 }}>Teacher Management</h1>

            <div style={{ marginBottom: '2rem' }}>
                <div className="stat-card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ marginBottom: '1.5rem', fontWeight: 'bold' }}>{editingId ? 'Edit Teacher' : 'Teacher Registration & Assignment'}</h3>

                    <form onSubmit={addTeacher} style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
                            {[
                                { id: 'basic', label: 'Basic Details' },
                                { id: 'professional', label: 'Professional' },
                                { id: 'address', label: 'Address' },
                                { id: 'account', label: 'Account (Login)' },
                                { id: 'assignment', label: 'Class Assignment' }
                            ].map(tab => (
                                <button 
                                    key={tab.id}
                                    type="button" 
                                    onClick={() => setActiveTab(tab.id)} 
                                    style={{ 
                                        background: 'none', 
                                        border: 'none', 
                                        cursor: 'pointer', 
                                        padding: '0.5rem 1rem', 
                                        fontSize: '1rem', 
                                        fontWeight: activeTab === tab.id ? 'bold' : 'normal', 
                                        color: activeTab === tab.id ? '#2563eb' : '#6b7280', 
                                        borderBottom: activeTab === tab.id ? '2px solid #2563eb' : 'none' 
                                    }}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div style={{ flex: 1, minHeight: '300px' }}>
                            {activeTab === 'basic' && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label>Teacher ID</label>
                                        <input type="text" className="form-control" value={editingId ? 'Editing External ID' : 'Auto Generated'} disabled style={{ backgroundColor: '#f1f5f9' }} />
                                    </div>
                                    <div className="form-group">
                                        <label>Teacher Name</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            value={teacherName} 
                                            onChange={e => {
                                                const val = e.target.value;
                                                setTeacherName(val);
                                                if (!editingId) {
                                                    const generated = val.trim().toLowerCase().replace(/\s+/g, '') + '@BIPS.com';
                                                    setUsername(generated);
                                                    setEmail(generated);
                                                }
                                            }} 
                                            required 
                                        />
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
                                        <label>Mobile Number (Max 10 Digits)</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            value={mobile} 
                                            placeholder="Enter 10 digit number"
                                            onChange={e => {
                                                const val = e.target.value.replace(/\D/g, ''); // digits only
                                                if (val.length <= 10) setMobile(val);
                                            }} 
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Aadhaar Number (Optional)</label>
                                        <input type="text" className="form-control" value={aadhaar} onChange={e => setAadhaar(e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Photo URL / Upload (Optional)</label>
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
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label>Qualification</label>
                                        <input type="text" className="form-control" value={qualification} onChange={e => setQualification(e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Main Subject</label>
                                        <input type="text" className="form-control" value={subject} onChange={e => setSubject(e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Experience (Years)</label>
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
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                        <label>Street Address</label>
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

                            {activeTab === 'account' && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label>Login ID / Username</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            value={username} 
                                            onChange={e => {
                                                setUsername(e.target.value);
                                                setEmail(e.target.value);
                                            }} 
                                            placeholder="Enter unique username"
                                            required={!editingId}
                                        />
                                    </div>
                                    <div className="form-group" style={{ position: 'relative' }}>
                                        <label>{editingId ? 'New Password (Optional)' : 'Password'}</label>
                                        <div style={{ position: 'relative' }}>
                                            <input 
                                                type={showPassword ? 'text' : 'password'} 
                                                className="form-control" 
                                                value={password} 
                                                onChange={e => setPassword(e.target.value)} 
                                                required={!editingId}
                                                placeholder="••••••••"
                                                style={{ paddingRight: '2.5rem' }}
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                style={{ 
                                                    position: 'absolute', 
                                                    right: '10px', 
                                                    top: '50%', 
                                                    transform: 'translateY(-50%)',
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontSize: '1.2rem'
                                                }}
                                            >
                                                {showPassword ? '👁️' : '🙈'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Confirm Password</label>
                                        <input 
                                            type={showPassword ? 'text' : 'password'} 
                                            className="form-control" 
                                            value={confirmPassword} 
                                            onChange={e => setConfirmPassword(e.target.value)} 
                                            required={!editingId}
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'assignment' && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label>Assign to Class</label>
                                        <select className="form-control" value={assignClass} onChange={e => setAssignClass(e.target.value)}>
                                            <option value="">Select Class</option>
                                            {classList.map((c) => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Assign to Section</label>
                                        <select className="form-control" value={assignSection} onChange={e => setAssignSection(e.target.value)}>
                                            <option value="">All Students (Whole Class)</option>
                                            {classList.find(c => c.id === assignClass)?.sections?.map((s: any) => (
                                                <option key={s.id} value={s.name}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Assigned Subject for this Class</label>
                                        <select 
                                            className="form-control" 
                                            value={assignSubject} 
                                            onChange={e => setAssignSubject(e.target.value)}
                                        >
                                            <option value="">Select Subject</option>
                                            <option value="English">English</option>
                                            <option value="Hindi">Hindi</option>
                                            <option value="Math">Math</option>
                                            <option value="Environmental Studies">Environmental Studies</option>
                                            <option value="Science">Science</option>
                                            <option value="Social Science">Social Science</option>
                                            <option value="Computer">Computer</option>
                                            <option value="General Knowledge">General Knowledge</option>
                                            <option value="Art">Art</option>
                                            <option value="Recites and Sing">Recites and Sing</option>
                                            <option value="Physical Development">Physical Development</option>
                                            <option value="School Activity Development">School Activity Development</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '1rem' }}>
                            <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1, padding: '1rem' }}>
                                {loading ? 'Processing...' : (editingId ? 'Update Teacher' : 'Complete Registration & Assignment')}
                            </button>
                            {editingId && (
                                <button type="button" className="btn-danger" onClick={resetForm} style={{ padding: '0 2rem', backgroundColor: '#64748b' }}>
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>

            {/* List */}
            <div className="data-table-container">
                <div className="table-header">
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Teacher Records</h2>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table>
                        <thead>
                            <tr>
                                <th>TEACHER ID</th>
                                <th>NAME</th>
                                <th>EMAIL/ID</th>
                                <th>PHONE</th>
                                <th>MAIN SUBJECT</th>
                                <th>TYPE</th>
                                <th>STATUS</th>
                                <th>ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teachers.length === 0 ? (
                                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>No teachers found</td></tr>
                            ) : teachers.map((t) => (
                                <tr key={t.id}>
                                    <td style={{ fontWeight: 'bold' }}>{t.teacherId}</td>
                                    <td>{t.name}</td>
                                    <td>{t.email}</td>
                                    <td>{t.mobile || 'N/A'}</td>
                                    <td>{t.subject || 'N/A'}</td>
                                    <td>{t.employeeType || 'N/A'}</td>
                                    <td><span className="badge badge-success">Active</span></td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button className="btn-primary" onClick={() => handleEdit(t)} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>Edit</button>
                                            <button className="btn-danger" onClick={() => handleDelete(t.id)} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', backgroundColor: '#ef4444' }}>Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Teachers;
