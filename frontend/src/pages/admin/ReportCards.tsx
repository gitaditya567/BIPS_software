import React, { useState, useEffect } from 'react';
import { FileText, Printer, Save } from 'lucide-react';
import './ReportCard.css';

const SUBJECTS = [
    { id: 'hindi', name: 'HINDI', type: 'marks' },
    { id: 'english', name: 'ENGLISH', type: 'marks' },
    { id: 'maths', name: 'MATHS', type: 'marks' },
    { id: 'science', name: 'SCIENCE', type: 'marks' },
    { id: 'social', name: 'SOCIAL SCIENCE / EVS', type: 'marks' },
    { id: 'computer', name: 'COMPUTER', type: 'marks' },
    { id: 'gk', name: 'GENERAL KNOWLEDGE', type: 'marks' },
    { id: 'art', name: 'ART', type: 'grade' },
    { id: 'moral', name: 'MORAL VALUE (GRADE)', type: 'grade' },
    { id: 'phy_edu', name: 'PHYSICAL EDUCATION (GRADE)', type: 'grade' }
];

const PERSONALITY_TRAITS = [
    'Conduct', 'Punctuality', 'Order & Neatness', 'Courtesy & Obedience',
    'Discipline', 'Honesty', 'Responsibility', 'Leadership', 'P.T.M.'
];

const LKG_UKG_SUBJECTS = [
    {
        category: 'English Oral',
        items: ['Conversation', 'Speaking skill', 'Pronounce correctly']
    },
    {
        category: 'English Written',
        items: ['Likes to write', 'Writes correctly', 'Has neat hand writing', 'Forms letter well']
    },
    {
        category: 'Maths Oral',
        items: ['Can count orally', 'Recognizes number']
    },
    {
        category: 'Maths Written',
        items: ['Can write Numbers', 'Question Identification']
    },
    {
        category: 'Hindi Oral',
        items: ['Speak clearly in complete sentence', 'Takes part in conversation', 'Pronounce correctly']
    },
    {
        category: 'Hindi Written',
        items: ['Likes to write', 'Writes Correctly', 'Has neat hand handwriting', 'Form letter well']
    },
    {
        category: 'Environmental Studies',
        items: ['Recognition of colour, Plants etc.', 'Art', 'Interest Colouring']
    },
    {
        category: 'Recites and Sing',
        items: ['Expression and enactment', 'Voice modulation', 'Rhythm']
    },
    {
        category: 'Physical Development',
        items: ['Eating', 'Walking', 'Running', 'Jogging', 'Cutting and tearing', 'Handling', 'Ability to use brush', 'Ability to use crayons']
    },
    {
        category: 'Co-Curriculum Development',
        items: ['Singing', 'Dancing', 'Writing', 'Rhymes & Rhythm', 'Sport Activity']
    },
    {
        category: 'School Activity Development',
        items: ['Green Day Celebration', 'Yellow Day Celebration', 'Red Day Celebration', 'PTM/Attendance']
    }
];

const OVERALL_DEVELOPMENT_TRAITS = [
    'Regularity & Punctuality', 'Honesty', 'Neatness', 'Attitude Value', 'Discipline', 'Attendance', 'P.T.M.'
];

const MOCK_STUDENTS = [
    { id: '1', name: 'Amit Kumar', class: 'VII', sec: 'A', rollNo: '10', srNo: '1234', dob: '2015-05-15', fatherName: 'Mr. Rajesh Kumar', motherName: 'Mrs. Sunita Devi', address: 'Lucknow, UP', mobile: '9876543210' },
    { id: '2', name: 'Rahul Sharma', class: 'UKG', sec: 'B', rollNo: '12', srNo: '1235', dob: '2019-08-20', fatherName: 'Mr. Arvind Sharma', motherName: 'Mrs. Meena Sharma', address: 'Bijnor, UP', mobile: '9888877777' },
    { id: '3', name: 'Priya Singh', class: 'LKG', sec: 'A', rollNo: '5', srNo: '1236', dob: '2020-01-10', fatherName: 'Mr. Sanjay Singh', motherName: 'Mrs. Rekha Singh', address: 'Chandrawal, UP', mobile: '9123456789' }
];

const ReportCards: React.FC = () => {
    // Selection state
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [sessionStart, setSessionStart] = useState('24');
    const [sessionEnd, setSessionEnd] = useState('25');

    // Marks State
    const [marks, setMarks] = useState<any>({});
    
    // Manual "M" Fields State
    const [personality, setPersonality] = useState<any>({});
    const [remarks, setRemarks] = useState({ term1: '', term2: '' });
    const [result, setResult] = useState({
        promotedTo: '',
        detainedIn: '',
        distinctionIn: '',
        reExamIn: '',
        reOpenDate: '',
        reOpenTime: ''
    });

    const [attendance, setAttendance] = useState({ term1: '', term2: '' });
    const [position, setPosition] = useState({ term1: '', term2: '' });

    // LKG/UKG Special State
    const [reportType, setReportType] = useState<'standard' | 'lkg-ukg'>('standard');
    const [studentProfile, setStudentProfile] = useState({
        name: '', classSec: '', rollNo: '', srNo: '', dob: '', 
        height: '', weight: '', fatherName: '', motherName: '', 
        address: '', mobile: ''
    });
    const [lkgMarks, setLkgMarks] = useState<any>({});
    const [overallDev, setOverallDev] = useState<any>({});

    // Mock initial data
    useEffect(() => {
        const initialMarks: any = {};
        SUBJECTS.forEach(sub => {
            initialMarks[sub.id] = { ppt1: '', yearly: '', ppt2: '', annual: '' };
        });
        setMarks(initialMarks);

        const initialPersonality: any = {};
        PERSONALITY_TRAITS.forEach(trait => {
            initialPersonality[trait] = { term1: '', term2: '' };
        });
        setPersonality(initialPersonality);

        const initialLkgMarks: any = {};
        LKG_UKG_SUBJECTS.forEach(cat => {
            cat.items.forEach(item => {
                initialLkgMarks[item] = { ev1: '', ev2: '', overall: '' };
            });
        });
        setLkgMarks(initialLkgMarks);

        const initialOverallDev: any = {};
        OVERALL_DEVELOPMENT_TRAITS.forEach(trait => {
            initialOverallDev[trait] = { term1: '', term2: '', overall: '' };
        });
        setOverallDev(initialOverallDev);
    }, []);

    const handleMarkChange = (subId: string, field: string, val: string) => {
        setMarks({
            ...marks,
            [subId]: { ...marks[subId], [field]: val }
        });
    };

    const handlePersonalityChange = (trait: string, term: string, val: string) => {
        setPersonality({
            ...personality,
            [trait]: { ...personality[trait], [term]: val }
        });
    };

    const calculateTotal = (subId: string, term: number) => {
        const m = marks[subId];
        if (!m) return 0;
        if (term === 1) {
            return (parseInt(m.ppt1) || 0) + (parseInt(m.yearly) || 0);
        } else {
            return (parseInt(m.ppt2) || 0) + (parseInt(m.annual) || 0);
        }
    };

    const calculateGrandTotal = (subId: string) => {
        return calculateTotal(subId, 1) + calculateTotal(subId, 2);
    };

    const calculatePercentage = (term: number) => {
        let totalObtained = 0;
        let totalPossible = 0;
        SUBJECTS.forEach(sub => {
            if (sub.type === 'marks') {
                totalObtained += calculateTotal(sub.id, term);
                totalPossible += 100;
            }
        });
        if (totalPossible === 0) return 0;
        return ((totalObtained / totalPossible) * 100).toFixed(2);
    };

    const printReport = () => {
        window.print();
    };

    return (
        <div className="report-card-container">
            <div className="no-print">
                <h1 style={{ marginBottom: '2rem', fontSize: '1.875rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <FileText className="text-primary" size={32} />
                    Report Card Management
                </h1>

                {/* Selection & Manual Entry Form */}
                <div className="edit-form">
                    <div className="section-title">Step 1: Student Selection & Report Type</div>
                    <div className="form-grid" style={{ marginBottom: '2rem' }}>
                        <div className="form-group">
                            <label>Report Card Type</label>
                            <select 
                                className="form-control" 
                                value={reportType} 
                                onChange={(e) => setReportType(e.target.value as any)}
                            >
                                <option value="standard">Standard (Grade I-VIII)</option>
                                <option value="lkg-ukg">Junior (LKG & UKG)</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Session (e.g. 2024 - 2025)</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                20<input type="text" className="form-control" style={{width: '60px'}} value={sessionStart} onChange={e => setSessionStart(e.target.value)} />
                                - 20<input type="text" className="form-control" style={{width: '60px'}} value={sessionEnd} onChange={e => setSessionEnd(e.target.value)} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Search Student</label>
                            <input 
                                list="student-list" 
                                className="form-control" 
                                placeholder="Type student name..."
                                onChange={(e) => {
                                    const student = MOCK_STUDENTS.find(s => s.name === e.target.value);
                                    if (student) {
                                        setSelectedStudent(student);
                                        setStudentProfile({
                                            name: student.name,
                                            classSec: `${student.class} - ${student.sec}`,
                                            rollNo: (student as any).rollNo || '',
                                            srNo: (student as any).srNo || '',
                                            dob: (student as any).dob || '',
                                            height: '',
                                            weight: '',
                                            fatherName: (student as any).fatherName || '',
                                            motherName: (student as any).motherName || '',
                                            address: (student as any).address || '',
                                            mobile: (student as any).mobile || ''
                                        });
                                        if (student.class === 'LKG' || student.class === 'UKG') {
                                            setReportType('lkg-ukg');
                                        } else {
                                            setReportType('standard');
                                        }
                                    }
                                }}
                            />
                            <datalist id="student-list">
                                {MOCK_STUDENTS.map(s => <option key={s.id} value={s.name} />)}
                            </datalist>
                        </div>
                    </div>

                    {reportType === 'lkg-ukg' && (
                        <>
                            <div className="section-title">Step 2: Student Profile (LKG/UKG)</div>
                            <div className="form-grid" style={{ marginBottom: '2rem' }}>
                                <div className="form-group">
                                    <label>Full Name</label>
                                    <input className="form-control" value={studentProfile.name} onChange={e => setStudentProfile({...studentProfile, name: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>Class & Section</label>
                                    <input className="form-control" value={studentProfile.classSec} onChange={e => setStudentProfile({...studentProfile, classSec: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>Roll No</label>
                                    <input className="form-control" value={studentProfile.rollNo} onChange={e => setStudentProfile({...studentProfile, rollNo: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>SR No</label>
                                    <input className="form-control" value={studentProfile.srNo} onChange={e => setStudentProfile({...studentProfile, srNo: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>DOB</label>
                                    <input type="text" className="form-control" placeholder="DD/MM/YYYY" value={studentProfile.dob} onChange={e => setStudentProfile({...studentProfile, dob: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>Height (cm)</label>
                                    <input className="form-control" value={studentProfile.height} onChange={e => setStudentProfile({...studentProfile, height: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>Weight (kg)</label>
                                    <input className="form-control" value={studentProfile.weight} onChange={e => setStudentProfile({...studentProfile, weight: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>Father's Name</label>
                                    <input className="form-control" value={studentProfile.fatherName} onChange={e => setStudentProfile({...studentProfile, fatherName: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>Mother's Name</label>
                                    <input className="form-control" value={studentProfile.motherName} onChange={e => setStudentProfile({...studentProfile, motherName: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>Address</label>
                                    <input className="form-control" value={studentProfile.address} onChange={e => setStudentProfile({...studentProfile, address: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>Mobile No</label>
                                    <input className="form-control" value={studentProfile.mobile} onChange={e => setStudentProfile({...studentProfile, mobile: e.target.value})} />
                                </div>
                            </div>

                            <div className="section-title">Step 3: Evaluation (EV-1, EV-2, OVERALL)</div>
                            <div className="marks-input-grid">
                                {LKG_UKG_SUBJECTS.map(cat => (
                                    <div key={cat.category} className="stat-card" style={{ display: 'block', border: '1px solid #e5e7eb' }}>
                                        <h4 style={{ marginBottom: '0.75rem', color: '#4f46e5', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.25rem' }}>{cat.category}</h4>
                                        <div style={{ display: 'grid', gap: '1rem' }}>
                                            {cat.items.map(item => (
                                                <div key={item} style={{ borderBottom: '1px solid #f9fafb', paddingBottom: '0.5rem' }}>
                                                    <label style={{fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem'}}>{item}</label>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                                                        <input placeholder="EV-1" className="form-control" style={{fontSize: '0.7rem'}} value={lkgMarks[item]?.ev1 || ''} onChange={e => setLkgMarks({...lkgMarks, [item]: {...lkgMarks[item], ev1: e.target.value}})} />
                                                        <input placeholder="EV-2" className="form-control" style={{fontSize: '0.7rem'}} value={lkgMarks[item]?.ev2 || ''} onChange={e => setLkgMarks({...lkgMarks, [item]: {...lkgMarks[item], ev2: e.target.value}})} />
                                                        <input placeholder="OVERALL" className="form-control" style={{fontSize: '0.7rem'}} value={lkgMarks[item]?.overall || ''} onChange={e => setLkgMarks({...lkgMarks, [item]: {...lkgMarks[item], overall: e.target.value}})} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="section-title" style={{ marginTop: '2rem' }}>Step 4: Overall Development</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                                {OVERALL_DEVELOPMENT_TRAITS.map(trait => (
                                    <div key={trait} className="form-group" style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px' }}>
                                        <label style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>{trait}</label>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <input placeholder="Term 1" className="form-control" value={overallDev[trait]?.term1 || ''} onChange={e => setOverallDev({...overallDev, [trait]: {...overallDev[trait], term1: e.target.value}})} />
                                            <input placeholder="Term 2" className="form-control" value={overallDev[trait]?.term2 || ''} onChange={e => setOverallDev({...overallDev, [trait]: {...overallDev[trait], term2: e.target.value}})} />
                                            <input placeholder="Overall" className="form-control" value={overallDev[trait]?.overall || ''} onChange={e => setOverallDev({...overallDev, [trait]: {...overallDev[trait], overall: e.target.value}})} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {reportType === 'standard' && (
                        <>
                            <div className="section-title">Step 2: Scholastic Marks (Automatic Calculation)</div>
                    <div className="marks-input-grid">
                        {SUBJECTS.map(sub => (
                            <div key={sub.id} className="stat-card" style={{ display: 'block', border: '1px solid #e5e7eb' }}>
                                <h4 style={{ marginBottom: '0.75rem', color: '#4f46e5', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.25rem' }}>{sub.name}</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    {sub.type === 'marks' ? (
                                        <>
                                            <div>
                                                <label style={{fontSize: '0.7rem'}}>PPT-1 (30)</label>
                                                <input className="form-control" value={marks[sub.id]?.ppt1 || ''} onChange={e => handleMarkChange(sub.id, 'ppt1', e.target.value)} />
                                            </div>
                                            <div>
                                                <label style={{fontSize: '0.7rem'}}>Half Yearly (70)</label>
                                                <input className="form-control" value={marks[sub.id]?.yearly || ''} onChange={e => handleMarkChange(sub.id, 'yearly', e.target.value)} />
                                            </div>
                                            <div>
                                                <label style={{fontSize: '0.7rem'}}>PPT-2 (30)</label>
                                                <input className="form-control" value={marks[sub.id]?.ppt2 || ''} onChange={e => handleMarkChange(sub.id, 'ppt2', e.target.value)} />
                                            </div>
                                            <div>
                                                <label style={{fontSize: '0.7rem'}}>Annual Exam (70)</label>
                                                <input className="form-control" value={marks[sub.id]?.annual || ''} onChange={e => handleMarkChange(sub.id, 'annual', e.target.value)} />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div style={{gridColumn: 'span 2'}}>
                                                <label style={{fontSize: '0.7rem'}}>Term 1 Grade</label>
                                                <input className="form-control" value={marks[sub.id]?.ppt1 || ''} onChange={e => handleMarkChange(sub.id, 'ppt1', e.target.value)} />
                                            </div>
                                            <div style={{gridColumn: 'span 2'}}>
                                                <label style={{fontSize: '0.7rem'}}>Term 2 Grade</label>
                                                <input className="form-control" value={marks[sub.id]?.ppt2 || ''} onChange={e => handleMarkChange(sub.id, 'ppt2', e.target.value)} />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="section-title" style={{ marginTop: '2rem' }}>Step 3: Personality Chart (Manual Entries "M")</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                        {PERSONALITY_TRAITS.map(trait => (
                            <div key={trait} className="form-group" style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px' }}>
                                <label style={{ marginBottom: '0.5rem' }}>{trait}</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input placeholder="Term 1" className="form-control" value={personality[trait]?.term1 || ''} onChange={e => handlePersonalityChange(trait, 'term1', e.target.value)} />
                                    <input placeholder="Term 2" className="form-control" value={personality[trait]?.term2 || ''} onChange={e => handlePersonalityChange(trait, 'term2', e.target.value)} />
                                </div>
                            </div>
                        ))}
                    </div>
                    </>
                )}

                    <div className="section-title" style={{ marginTop: '2rem' }}>Step 4: Summary & Result (Manual Entries "M")</div>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Term 1 Attendance</label>
                            <input className="form-control" value={attendance.term1} onChange={e => setAttendance({ ...attendance, term1: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Term 2 Attendance</label>
                            <input className="form-control" value={attendance.term2} onChange={e => setAttendance({ ...attendance, term2: e.target.value })} />
                        </div>
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>1st Term Remarks</label>
                            <textarea className="form-control" rows={2} value={remarks.term1} onChange={e => setRemarks({ ...remarks, term1: e.target.value })} />
                        </div>
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>2nd Term Remarks</label>
                            <textarea className="form-control" rows={2} value={remarks.term2} onChange={e => setRemarks({ ...remarks, term2: e.target.value })} />
                        </div>
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label>Promoted to Class / Status</label>
                            <input className="form-control" value={result.promotedTo} onChange={e => setResult({ ...result, promotedTo: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Distinction Granted In</label>
                            <input className="form-control" value={result.distinctionIn} onChange={e => setResult({ ...result, distinctionIn: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Re-open Date</label>
                            <input type="text" placeholder="e.g. 5th April" className="form-control" value={result.reOpenDate} onChange={e => setResult({ ...result, reOpenDate: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Re-open Time</label>
                            <input type="text" placeholder="e.g. 8:00" className="form-control" value={result.reOpenTime} onChange={e => setResult({ ...result, reOpenTime: e.target.value })} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '3rem', borderTop: '2px solid #f3f4f6', paddingTop: '2rem' }}>
                        <button className="btn-primary" style={{ width: 'auto', padding: '0.75rem 2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#4b5563' }}>
                            <Save size={18} /> Save Progress
                        </button>
                        <button onClick={printReport} className="btn-primary" style={{ width: 'auto', padding: '0.75rem 2rem', backgroundColor: '#4f46e5', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.39)' }}>
                            <Printer size={18} /> Download / Print Report Card
                        </button>
                    </div>
                </div>
            </div>


            {/* PREVIEW AREA */}
            {reportType === 'standard' ? (
                <div id="report-card-printable" className="report-card-preview">
                    <div className="card-header">
                        PROGRESS REPORT (SESSION 20{sessionStart} - 20{sessionEnd})
                    </div>

                    <div className="student-info-row">
                        <div>NAME: <span className="dotted-line" style={{ minWidth: '300px' }}>{selectedStudent?.name || '__________________________'}</span></div>
                        <div>CLASS: <span className="dotted-line" style={{ minWidth: '80px' }}>{selectedStudent?.class || '_________'}</span></div>
                        <div>SEC.: <span className="dotted-line" style={{ minWidth: '80px' }}>{selectedStudent?.sec || '_________'}</span></div>
                    </div>

                    <div className="main-tables-grid">
                        <div className="marks-table-section">
                            <table className="report-table">
                                <thead>
                                    <tr>
                                        <th rowSpan={2}>SCHOLASTIC :</th>
                                        <th colSpan={3}>TERM-1</th>
                                        <th colSpan={3}>TERM-2</th>
                                        <th rowSpan={2}>GRAND TOTAL (200)</th>
                                    </tr>
                                    <tr>
                                        <th>PPT-1 (30)</th>
                                        <th>Half Yearly (70)</th>
                                        <th>TOTAL (100)</th>
                                        <th>PPT-2 (30)</th>
                                        <th>ANNUAL EXAM (70)</th>
                                        <th>TOTAL (100)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {SUBJECTS.map(sub => (
                                        <tr key={sub.id}>
                                            <td className="subject-name">{sub.name}</td>
                                            {sub.type === 'marks' ? (
                                                <>
                                                    <td>{marks[sub.id]?.ppt1}</td>
                                                    <td>{marks[sub.id]?.yearly}</td>
                                                    <td>{calculateTotal(sub.id, 1) || ''}</td>
                                                    <td>{marks[sub.id]?.ppt2}</td>
                                                    <td>{marks[sub.id]?.annual}</td>
                                                    <td>{calculateTotal(sub.id, 2) || ''}</td>
                                                    <td>{calculateGrandTotal(sub.id) || ''}</td>
                                                </>
                                            ) : (
                                                <>
                                                    <td colSpan={3}>Grade: {marks[sub.id]?.ppt1}</td>
                                                    <td colSpan={3}>Grade: {marks[sub.id]?.ppt2}</td>
                                                    <td></td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                    <tr style={{ fontWeight: 'bold' }}>
                                        <td className="subject-name">TOTAL</td>
                                        <td></td>
                                        <td></td>
                                        <td>{SUBJECTS.filter(s=>s.type==='marks').reduce((acc, s)=> acc + calculateTotal(s.id,1), 0) || ''}</td>
                                        <td></td>
                                        <td></td>
                                        <td>{SUBJECTS.filter(s=>s.type==='marks').reduce((acc, s)=> acc + calculateTotal(s.id,2), 0) || ''}</td>
                                        <td>{SUBJECTS.filter(s=>s.type==='marks').reduce((acc, s)=> acc + calculateGrandTotal(s.id), 0) || ''}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="personality-section">
                            <div className="personality-title">Personality Character Chart</div>
                            <table className="report-table personality-table">
                                <thead>
                                    <tr>
                                        <th></th>
                                        <th>TERM 1</th>
                                        <th>TERM 2</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {PERSONALITY_TRAITS.map(trait => (
                                        <tr key={trait}>
                                            <td style={{ textAlign: 'left', fontWeight: 600 }}>{trait}</td>
                                            <td>
                                                <input 
                                                    className="no-border-input" 
                                                    value={personality[trait]?.term1 || ''} 
                                                    onChange={e => handlePersonalityChange(trait, 'term1', e.target.value)}
                                                    placeholder="M"
                                                />
                                            </td>
                                            <td>
                                                <input 
                                                    className="no-border-input" 
                                                    value={personality[trait]?.term2 || ''} 
                                                    onChange={e => handlePersonalityChange(trait, 'term2', e.target.value)}
                                                    placeholder="M"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bottom-sections">
                        <div className="bottom-table-container">
                            <table className="report-table" style={{ height: '100%' }}>
                                <thead>
                                    <tr>
                                        <th></th>
                                        <th>Ist Term</th>
                                        <th>IInd Term</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td>Percentage</td><td>{calculatePercentage(1)}%</td><td>{calculatePercentage(2)}%</td></tr>
                                    <tr><td>Position</td><td><input className="no-border-input" value={position.term1} onChange={e=>setPosition({...position, term1: e.target.value})} /></td><td><input className="no-border-input" value={position.term2} onChange={e=>setPosition({...position, term2: e.target.value})} /></td></tr>
                                    <tr><td>Attendance</td><td><input className="no-border-input" value={attendance.term1} onChange={e=>setAttendance({...attendance, term1: e.target.value})} /></td><td><input className="no-border-input" value={attendance.term2} onChange={e=>setAttendance({...attendance, term2: e.target.value})} /></td></tr>
                                    <tr style={{height: '40px'}}><td>Class Teacher</td><td></td><td></td></tr>
                                    <tr style={{height: '40px'}}><td>Principal</td><td></td><td></td></tr>
                                    <tr style={{height: '40px'}}><td>Parents</td><td></td><td></td></tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="remarks-container">
                            <div className="remarks-title">REMARKS</div>
                            <div className="remarks-row">
                                <b>1st Term</b> <span className="dotted-line" style={{ width: '80%' }}>{remarks.term1}</span>
                            </div>
                            <div className="remarks-row">
                                <b>2nd Term</b> <span className="dotted-line" style={{ width: '80%' }}>{remarks.term2}</span>
                            </div>
                        </div>

                        <div className="result-container">
                            <div className="result-title">RESULT</div>
                            <div style={{ fontSize: '0.8rem', lineHeight: '2' }}>
                                <div>Passed & Promoted to Class <span className="dotted-line" style={{ width: '40%' }}>{result.promotedTo}</span></div>
                                <div>Detained in Class <span className="dotted-line" style={{ width: '60%' }}>{result.detainedIn}</span></div>
                                <div>Distinction granted in <span className="dotted-line" style={{ width: '50%' }}>{result.distinctionIn}</span></div>
                                <div style={{ borderBottom: '1px solid #000', margin: '0.5rem 0' }}></div>
                                <div>Re-exam in <span className="dotted-line" style={{ width: '70%' }}>{result.reExamIn}</span></div>
                                <div>School will re-open on <span className="dotted-line" style={{ width: '40%' }}>{result.reOpenDate}</span></div>
                                <div style={{ textAlign: 'right' }}>at <span className="dotted-line" style={{ width: '40px' }}>{result.reOpenTime}</span> A.M.</div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div id="report-card-printable" className="lkg-report-card">
                    {/* Front Cover & Back Cover Row */}
                    <div className="lkg-page">
                        <div className="lkg-column back-cover">
                            <div className="lkg-section-title">Over all Development</div>
                            <table className="lkg-table">
                                <thead>
                                    <tr>
                                        <th>Regularity & Punctuality</th>
                                        <th>Term I</th>
                                        <th>Term 2</th>
                                        <th>Overall</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {OVERALL_DEVELOPMENT_TRAITS.map(trait => (
                                        <tr key={trait}>
                                            <td style={{textAlign: 'left'}}>{trait}</td>
                                            <td>{overallDev[trait]?.term1}</td>
                                            <td>{overallDev[trait]?.term2}</td>
                                            <td>{overallDev[trait]?.overall}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="lkg-remarks-section">
                                <p><b>Remark :</b></p>
                                <p>Term 1 __________________________________________________</p>
                                <p>Term 2 __________________________________________________</p>
                            </div>

                            <div className="lkg-signs-row">
                                <div>CT. Sign</div>
                                <div>Principal Sign</div>
                                <div>Parent's Sign</div>
                            </div>

                            <div className="lkg-promotion-info">
                                <p>Passed and promoted to ___________________________________</p>
                                <p>School re-opens on _______________________ School Timing are ___________</p>
                            </div>

                            <div className="lkg-grading-info">
                                <div className="grading-box">
                                    <b>Scholastic:</b><br/>
                                    A+ 90%-100% outstanding<br/>
                                    A 75%-89% Excellent<br/>
                                    B 56%-74% Very Good<br/>
                                    C 35%-55% Good<br/>
                                    D Below 35% scope for improvement
                                </div>
                                <div className="grading-box">
                                    <b>Co Scholastic</b><br/>
                                    A+ Outstanding<br/>
                                    A Very Good<br/>
                                    B Good
                                </div>
                            </div>
                        </div>

                        <div className="lkg-column front-cover">
                            <div className="school-header text-center">
                                <div className="school-logo-placeholder">BIPS LOGO</div>
                                <h1 className="school-name">BIMLA INTERNATIONAL PUBLIC SCHOOL</h1>
                                <p className="school-affi">AFFILIATED TO U.P. BOARD</p>
                                <p className="school-addr">MAKHDOOMPUR KAITHI, NEAR CHANDRAWAL BIJNAUR, LUCKNOW</p>
                                <p className="school-mob">Mob. : 9335851877</p>
                                <h2 className="progress-report-title">Progress Report</h2>
                                <p className="academic-session">Academic session 20{sessionStart} to 20{sessionEnd}</p>
                                <p className="class-label">(Class- Nur. - U.K.G.)</p>
                            </div>

                            <div className="student-profile-box">
                                <h3 className="profile-title">STUDENT PROFILE</h3>
                                <div className="profile-grid">
                                    <div className="profile-item full">Name: <span className="dotted">{studentProfile.name}</span></div>
                                    <div className="profile-item">Class & Sec: <span className="dotted">{studentProfile.classSec}</span></div>
                                    <div className="profile-item">D.O.B: <span className="dotted">{studentProfile.dob}</span></div>
                                    <div className="profile-item">Roll.No: <span className="dotted">{studentProfile.rollNo}</span></div>
                                    <div className="profile-item">SR No. : <span className="dotted">{studentProfile.srNo}</span></div>
                                    <div className="profile-item">Height: <span className="dotted">{studentProfile.height}</span></div>
                                    <div className="profile-item">Weight: <span className="dotted">{studentProfile.weight}</span></div>
                                    <div className="profile-item full">Father's Name: <span className="dotted">{studentProfile.fatherName}</span></div>
                                    <div className="profile-item full">Mother's Name: <span className="dotted">{studentProfile.motherName}</span></div>
                                    <div className="profile-item full">Residential Address: <span className="dotted">{studentProfile.address}</span></div>
                                    <div className="profile-item full">Mobile No : <span className="dotted">{studentProfile.mobile}</span></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Inside Sheets Row 1 */}
                    <div className="lkg-page">
                        <div className="lkg-column">
                            <table className="lkg-eval-table">
                                <thead>
                                    <tr className="bg-green">
                                        <th style={{textAlign: 'left'}}>SUBJECT</th>
                                        <th>EV-1</th>
                                        <th>EV-2</th>
                                        <th>OVER ALL</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {LKG_UKG_SUBJECTS.slice(0, 6).map(cat => (
                                        <React.Fragment key={cat.category}>
                                            <tr className="subject-head">
                                                <td colSpan={4} style={{color: '#d32f2f', fontWeight: 'bold'}}>{cat.category}</td>
                                            </tr>
                                            {cat.items.map(item => (
                                                <tr key={item}>
                                                    <td style={{textAlign: 'left', paddingLeft: '1rem'}}>{item}</td>
                                                    <td>{lkgMarks[item]?.ev1}</td>
                                                    <td>{lkgMarks[item]?.ev2}</td>
                                                    <td>{lkgMarks[item]?.overall}</td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="lkg-column">
                            <table className="lkg-eval-table">
                                <thead>
                                    <tr className="bg-green">
                                        <th style={{textAlign: 'left'}}>SUBJECT</th>
                                        <th>EV-1</th>
                                        <th>EV-2</th>
                                        <th>OVER ALL</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {LKG_UKG_SUBJECTS.slice(6).map(cat => (
                                        <React.Fragment key={cat.category}>
                                            <tr className="subject-head">
                                                <td colSpan={4} style={{color: '#d32f2f', fontWeight: 'bold'}}>{cat.category}</td>
                                            </tr>
                                            {cat.items.map(item => (
                                                <tr key={item}>
                                                    <td style={{textAlign: 'left', paddingLeft: '1rem'}}>{item}</td>
                                                    <td>{lkgMarks[item]?.ev1}</td>
                                                    <td>{lkgMarks[item]?.ev2}</td>
                                                    <td>{lkgMarks[item]?.overall}</td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .no-border-input {
                    border: none;
                    width: 100%;
                    text-align: center;
                    font-size: 0.8rem;
                    outline: none;
                    background: transparent;
                }
                .no-border-input:focus {
                    background-color: #f0f9ff;
                }
            `}</style>
        </div>
    );
};

export default ReportCards;
