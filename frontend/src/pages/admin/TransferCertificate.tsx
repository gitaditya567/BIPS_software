import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Printer, Search, GraduationCap } from 'lucide-react';

interface TCRecord {
    id: string;
    studentName: string;
    admissionNo: string;
    withdrawalNo: string;
    tcNo: string;
    sRegisterNo: string;
    className: string;
    leavingDate: string;
    reason: string;
    conduct: string;
    issueDate: string;
    fatherName: string;
    motherName: string;
    occupation: string;
    address: string;
    caste: string;
    lastInstitution: string;
    dob: string;
    dobWords: string;
    aadharNo: string;
}

const TransferCertificate: React.FC = () => {
    const [students, setStudents] = useState<any[]>([]);
    const [tcRecords, setTcRecords] = useState<TCRecord[]>([]);

    const [showPreview, setShowPreview] = useState(false);
    const [selectedTC, setSelectedTC] = useState<TCRecord | null>(null);

    // Form fields
    const [studentName, setStudentName] = useState('');
    const [admissionNo, setAdmissionNo] = useState('');
    const [withdrawalNo, setWithdrawalNo] = useState('');
    const [tcNo, setTcNo] = useState('');
    const [sRegisterNo, setSRegisterNo] = useState('');
    const [className, setClassName] = useState('');
    const [leavingDate, setLeavingDate] = useState('');
    const [reason] = useState('');
    const [conduct] = useState('Satisfactory');
    const [fatherName, setFatherName] = useState('');
    const [motherName, setMotherName] = useState('');
    const [occupation, setOccupation] = useState('');
    const [address, setAddress] = useState('');
    const [caste, setCaste] = useState('');
    const [lastInstitution, setLastInstitution] = useState('');
    const [dob, setDob] = useState('');
    const [dobWords, setDobWords] = useState('');
    const [aadharNo, setAadharNo] = useState('');

    useEffect(() => {
        fetchStudents();
        const saved = localStorage.getItem('tc_records');
        if (saved) setTcRecords(JSON.parse(saved));
    }, []);

    const fetchStudents = async () => {
        try {
            const res = await axios.get('/erp-api/admin/students');
            setStudents(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleGenerateTC = (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentName || !admissionNo) return alert('Fill required fields');

        const newTC: TCRecord = {
            id: Date.now().toString(),
            studentName,
            admissionNo,
            withdrawalNo,
            tcNo: tcNo || `BIPS/TC/${new Date().getFullYear()}/${tcRecords.length + 1}`,
            sRegisterNo,
            className,
            leavingDate,
            reason,
            conduct,
            issueDate: new Date().toISOString().split('T')[0],
            fatherName,
            motherName,
            occupation,
            address,
            caste,
            lastInstitution,
            dob,
            dobWords,
            aadharNo
        };

        const updated = [newTC, ...tcRecords];
        setTcRecords(updated);
        localStorage.setItem('tc_records', JSON.stringify(updated));
        setSelectedTC(newTC);
        setShowPreview(true);
    };

    const renderBoxes = (text: string, count: number) => {
        const chars = text.split('').slice(0, count);
        const boxes = [];
        for (let i = 0; i < count; i++) {
            boxes.push(
                <div key={i} style={{ 
                    width: '25px', 
                    height: '25px', 
                    border: '1px solid black', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 'bold'
                }}>
                    {chars[i] || ''}
                </div>
            );
        }
        return <div style={{ display: 'flex' }}>{boxes}</div>;
    };

    return (
        <div style={{ padding: '1.5rem' }}>
            <div className="no-print">
                <h1 style={{ marginBottom: '2rem', fontSize: '1.875rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <GraduationCap className="text-primary" size={32} />
                    Transfer Certificate Management
                </h1>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) 1.5fr', gap: '2rem' }}>
                    {/* TC Form */}
                    <div className="stat-card" style={{ display: 'block', height: 'fit-content', padding: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1.5rem', fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Scholar Details</h3>
                        <form onSubmit={handleGenerateTC}>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label>Find Scholar</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        list="tc-students"
                                        type="text"
                                        className="form-control"
                                        placeholder="Name or Admission No..."
                                        value={studentName}
                                        onChange={e => {
                                            setStudentName(e.target.value);
                                            const s = students.find(x => x.name === e.target.value || x.admissionNo === e.target.value);
                                            if (s) {
                                                setAdmissionNo(s.admissionNo);
                                                setClassName(s.className);
                                                setAddress(s.address || '');
                                                setAadharNo(s.aadhaarNumber || '');
                                                setDob(s.dateOfBirth ? s.dateOfBirth.replace(/-/g, '') : '');
                                            }
                                        }}
                                        required
                                    />
                                    <Search size={16} style={{ position: 'absolute', right: '12px', top: '12px', color: '#9ca3af' }} />
                                    <datalist id="tc-students">
                                        {students.map(s => <option key={s.id} value={s.name}>{s.admissionNo}</option>)}
                                    </datalist>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div className="form-group">
                                    <label>Adm. No</label>
                                    <input type="text" className="form-control" value={admissionNo} onChange={e => setAdmissionNo(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Withdrawal No</label>
                                    <input type="text" className="form-control" value={withdrawalNo} onChange={e => setWithdrawalNo(e.target.value)} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div className="form-group">
                                    <label>TC No</label>
                                    <input type="text" className="form-control" value={tcNo} onChange={e => setTcNo(e.target.value)} placeholder="Auto-generated" />
                                </div>
                                <div className="form-group">
                                    <label>S. Register No</label>
                                    <input type="text" className="form-control" value={sRegisterNo} onChange={e => setSRegisterNo(e.target.value)} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Caste / Religion</label>
                                <input type="text" className="form-control" value={caste} onChange={e => setCaste(e.target.value)} placeholder="e.g. Hindu (General)" />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div className="form-group">
                                    <label>Father's Name</label>
                                    <input type="text" className="form-control" value={fatherName} onChange={e => setFatherName(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Mother's Name</label>
                                    <input type="text" className="form-control" value={motherName} onChange={e => setMotherName(e.target.value)} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Occupation & Address</label>
                                <input type="text" className="form-control" value={occupation} onChange={e => setOccupation(e.target.value)} placeholder="Occupation" style={{ marginBottom: '0.5rem' }} />
                                <textarea className="form-control" rows={2} value={address} onChange={e => setAddress(e.target.value)} placeholder="Full Address" />
                            </div>

                            <div className="form-group">
                                <label>Date of Birth (DDMMYYYY)</label>
                                <input type="text" className="form-control" value={dob} onChange={e => setDob(e.target.value)} maxLength={8} />
                            </div>

                            <div className="form-group">
                                <label>Date of Birth (in Words)</label>
                                <input type="text" className="form-control" value={dobWords} onChange={e => setDobWords(e.target.value)} />
                            </div>

                            <div className="form-group">
                                <label>Aadhar No</label>
                                <input type="text" className="form-control" value={aadharNo} onChange={e => setAadharNo(e.target.value)} maxLength={12} />
                            </div>

                            <div className="form-group">
                                <label>Last Institution Attended</label>
                                <input type="text" className="form-control" value={lastInstitution} onChange={e => setLastInstitution(e.target.value)} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div className="form-group">
                                    <label>Class</label>
                                    <input type="text" className="form-control" value={className} onChange={e => setClassName(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Leaving Date</label>
                                    <input type="date" className="form-control" value={leavingDate} onChange={e => setLeavingDate(e.target.value)} />
                                </div>
                            </div>

                            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1.5rem', height: '45px', fontWeight: 'bold' }}>
                                Generate & Preview Form
                            </button>
                        </form>
                    </div>

                    {/* Records Table */}
                    <div className="data-table-container">
                        <div className="table-header">
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>History of Issued Forms</h2>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th>Student Name</th>
                                        <th>Adm No</th>
                                        <th>TC No</th>
                                        <th>Issue Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tcRecords.map(tc => (
                                        <tr key={tc.id}>
                                            <td style={{ fontWeight: '600' }}>{tc.studentName}</td>
                                            <td>{tc.admissionNo}</td>
                                            <td>{tc.tcNo}</td>
                                            <td>{new Date(tc.issueDate).toLocaleDateString()}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button onClick={() => { setSelectedTC(tc); setShowPreview(true); }} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }}>View</button>
                                                    <button className="btn-danger" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => {
                                                        const up = tcRecords.filter(x => x.id !== tc.id);
                                                        setTcRecords(up);
                                                        localStorage.setItem('tc_records', JSON.stringify(up));
                                                    }}>Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {tcRecords.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>No records found</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* PREVIEW MODAL */}
            {showPreview && selectedTC && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, overflowY: 'auto', padding: '2rem' }} className="no-print">
                    <div style={{ backgroundColor: 'white', padding: '3rem', cursor: 'default', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)', borderRadius: '4px' }}>
                        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button onClick={() => window.print()} className="btn-primary" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Printer size={18} /> Print Certificate
                            </button>
                            <button onClick={() => setShowPreview(false)} className="btn-secondary" style={{ padding: '0.75rem 1.5rem' }}>Close</button>
                        </div>
                        
                        {/* THE ACTUAL FORM UI START */}
                        <div id="printable-tc" style={{ 
                            width: '210mm', 
                            minHeight: '297mm', 
                            padding: '10mm', 
                            border: '1px solid #ccc', 
                            backgroundColor: 'white',
                            color: 'black',
                            fontFamily: '"Times New Roman", Times, serif'
                        }}>
                            <div style={{ position: 'relative', marginBottom: '1rem', minHeight: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 80px' }}>
                                <img src="/erp/bips-logo.png" alt="BIPS Logo" style={{ position: 'absolute', left: '0', top: '50%', transform: 'translateY(-50%)', width: '70px', height: '70px', objectFit: 'contain' }} />
                                <h2 style={{ textAlign: 'center', margin: '0', textTransform: 'uppercase', fontSize: '22px', fontWeight: 'bold' }}>
                                    Scholar's Register & Transfer Certificate Form
                                </h2>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: '10px', marginBottom: '10px', fontSize: '13px' }}>
                                <div>Adm. No. <span style={{ borderBottom: '1px dashed black', flex: 1, padding: '0 5px' }}>{selectedTC.admissionNo}</span></div>
                                <div>Withdrawal No. <span style={{ borderBottom: '1px dashed black', flex: 1, padding: '0 5px' }}>{selectedTC.withdrawalNo}</span></div>
                                <div>TC. No. <span style={{ borderBottom: '1px dashed black', flex: 1, padding: '0 5px' }}>{selectedTC.tcNo}</span></div>
                                <div>S. Register No. <span style={{ borderBottom: '1px dashed black', flex: 1, padding: '0 5px' }}>{selectedTC.sRegisterNo}</span></div>
                            </div>

                            <div style={{ border: '1px solid black', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', minHeight: '120px' }}>
                                <div style={{ borderRight: '1px solid black', padding: '10px' }}>
                                    <p style={{ margin: '0 0 10px 0', fontSize: '14px', textAlign: 'center', borderBottom: '1px solid black', paddingBottom: '5px' }}>
                                        Name of the Scholar with Caste<br/>if Hindu, Otherwise religion
                                    </p>
                                    <p style={{ fontSize: '16px', fontWeight: 'bold', textAlign: 'center' }}>
                                        {selectedTC.studentName}<br/>
                                        <span style={{ fontSize: '12px', fontWeight: 'normal' }}>({selectedTC.caste})</span>
                                    </p>
                                </div>
                                <div style={{ borderRight: '1px solid black', padding: '10px' }}>
                                    <div style={{ marginBottom: '8px', borderBottom: '1px dashed #777' }}>Father's Name: <b>{selectedTC.fatherName}</b></div>
                                    <div style={{ marginBottom: '8px', borderBottom: '1px dashed #777' }}>Mother's Name: <b>{selectedTC.motherName}</b></div>
                                    <div style={{ marginBottom: '8px', borderBottom: '1px dashed #777' }}>Occupation: <b>{selectedTC.occupation}</b></div>
                                    <div>Address: <span style={{ fontSize: '12px' }}>{selectedTC.address}</span></div>
                                </div>
                                <div style={{ padding: '10px' }}>
                                    <p style={{ margin: '0 0 10px 0', fontSize: '13px', textAlign: 'center', borderBottom: '1px solid black', paddingBottom: '5px' }}>
                                        The last Institution<br/>attended by the Scholar
                                    </p>
                                    <p style={{ fontSize: '13px', textAlign: 'center' }}>{selectedTC.lastInstitution}</p>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '15px', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '14px' }}>Date of Birth (in Figures)</span>
                                    {renderBoxes(selectedTC.dob, 8)}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '14px' }}>Aadhar No.</span>
                                    {renderBoxes(selectedTC.aadharNo, 12)}
                                </div>
                            </div>
                            <div style={{ marginTop: '10px', fontSize: '14px' }}>
                                Date of Birth (in Words) <span style={{ borderBottom: '1px dashed black', padding: '0 10px' }}>{selectedTC.dobWords}</span>
                            </div>

                            <table className="tc-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px', border: '1px solid black' }}>
                                <thead>
                                    <tr>
                                        <th rowSpan={2} style={thStyle}>Class</th>
                                        <th style={thStyle}>Date of Admission</th>
                                        <th style={thStyle}>Date of Promotion</th>
                                        <th style={thStyle}>Date of Removal</th>
                                        <th style={thStyle}>Cause of removal i.e. Non payment of dues removal of family, expulsion etc.</th>
                                        <th rowSpan={2} style={thStyle}>Year</th>
                                        <th rowSpan={2} style={thStyle}>Conduct & Work</th>
                                    </tr>
                                    <tr>
                                        <th style={thStyle}>1</th>
                                        <th style={thStyle}>2</th>
                                        <th style={thStyle}>3</th>
                                        <th style={thStyle}>4</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <StaticRow label="Pre Nursery" />
                                    <StaticRow label="Nursery" />
                                    <StaticRow label="K.G." />
                                    <SectionRow label="Primary" classes={['I', 'II', 'III', 'IV', 'V']} />
                                    <SectionRow label="Secondary" classes={['VI', 'VII', 'VIII', 'IX', 'X']} />
                                    <SectionRow label="Sr. Sec." classes={['XI', 'XII']} />
                                </tbody>
                            </table>

                            <div style={{ marginTop: '20px', fontSize: '12px', display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'flex-start' }}>
                                <div>
                                    <p style={{ margin: '0 0 5px 0' }}>1. Certified the above Scholar's Register has been posted upto date Scholar's leaving as required by the Department Rules.</p>
                                    <p style={{ margin: '0' }}>Note: If Student has been among the first five in the class, this fact should be mentioned in the column of work. In the case of student leaving of the classes IX to XII of the attendance or lecture should be entered at the back of this form.</p>
                                </div>
                                <div style={{ textAlign: 'center', marginTop: '40px', minWidth: '150px' }}>
                                    <p style={{ fontWeight: 'bold' }}>Principal</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; padding: 0 !important; }
                    #printable-tc { border: none !important; box-shadow: none !important; margin: 0 !important; width: 100% !important; padding: 0 !important; }
                }
                .form-control { width: 100%; padding: 0.6rem; border: 1px solid #d1d5db; borderRadius: 0.5rem; outline: none; transition: border 0.2s; }
                .form-control:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); }
                .tc-table th, .tc-table td { border: 1px solid black; padding: 4px; font-size: 11px; text-align: center; }
            `}</style>
        </div>
    );
};

const thStyle: React.CSSProperties = { border: '1px solid black', padding: '4px', fontSize: '10px', backgroundColor: '#f9f9f9' };

const StaticRow: React.FC<{ label: string }> = ({ label }) => (
    <tr style={{ height: '24px' }}>
        <td style={{ fontWeight: 'bold' }}>{label}</td>
        <td></td><td></td><td></td><td></td><td></td><td></td>
    </tr>
);

const SectionRow: React.FC<{ label: string, classes: string[] }> = ({ label, classes }) => (
    <>
        {classes.map((c, i) => (
            <tr key={c} style={{ height: '24px' }}>
                {i === 0 && <td rowSpan={classes.length} style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontWeight: 'bold', fontSize: '10px' }}>{label}</td>}
                <td style={{ textAlign: 'left', paddingLeft: '10px' }}>{i + 1} &nbsp;&nbsp;&nbsp; {c}</td>
                <td></td><td></td><td></td><td></td><td></td><td></td>
            </tr>
        ))}
    </>
);

export default TransferCertificate;
