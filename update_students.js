const fs = require('fs');
const path = 'frontend/src/pages/admin/Students.tsx';
let c = fs.readFileSync(path, 'utf8');

// 1. Add status form state
c = c.replace(
    /const \[sectionId, setSectionId\] = useState\(''\);/,
    `const [sectionId, setSectionId] = useState('');
    const [status, setStatus] = useState('Active');`
);

// 2. Reset status in resetForm()
c = c.replace(
    /setClassId\(''\); setSectionId\(''\);/,
    `setClassId(''); setSectionId(''); setStatus('Active');`
);

// 3. Set status on edit
c = c.replace(
    /setSectionId\(student\.sectionId \|\| ''\), 100\);/,
    `setSectionId(student.sectionId || ''), 100);
        setStatus(student.status || 'Active');`
);

// 4. Update the submit payload logic to remove strict validation
c = c.replace(
    /if \(!firstName \|\| !classId \|\| !sectionId\) return alert\('Please fill required fields'\);/,
    `if (!firstName) return alert('Please enter the First Name, it is required.');`
);

// 5. Submit payloads update
c = c.replace(
    /fatherName, fatherMobile, fatherOccupation, fatherQualification, fatherEmail,/g,
    `fatherName, fatherMobile, fatherOccupation, fatherQualification, fatherEmail, status,`
);

// 6. Remove required from classId select
c = c.replace(
    /<select className="form-control" value=\{classId\} onChange=\{e => setClassId\(e\.target\.value\)\} required>/,
    `<select className="form-control" value={classId} onChange={e => setClassId(e.target.value)}>`
);

// 7. Remove required from sectionId select
c = c.replace(
    /<select className="form-control" value=\{sectionId\} onChange=\{e => setSectionId\(e\.target\.value\)\} required disabled=\{!classId\}>/,
    `<select className="form-control" value={sectionId} onChange={e => setSectionId(e.target.value)} disabled={!classId}>`
);

// 8. Add status dropdown right after the auto generated ID
c = c.replace(
    /<div className="form-group">\s*<label>Student ID<\/label>\s*<input type="text" className="form-control" value="Auto Generated" disabled style=\{\{ backgroundColor: '#f0f0f0' \}\}\s*\/>\s*<\/div>/,
    `<div className="form-group">
                                <label>Student ID</label>
                                <input type="text" className="form-control" value="Auto Generated" disabled style={{ backgroundColor: '#f0f0f0' }} />
                            </div>

                            <div className="form-group">
                                <label>Status</label>
                                <select className="form-control" value={status} onChange={e => setStatus(e.target.value)}>
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>`
);

// 9. Update table to display dynamic status instead of fixed badge
c = c.replace(
    /<td><span className="badge badge-success">Active<\/span><\/td>/g,
    `<td>
                                        <span className={\`badge \${s.status === 'Inactive' ? 'badge-danger' : 'badge-success'}\`}>
                                            {s.status === 'Inactive' ? 'Inactive' : 'Active'}
                                        </span>
                                    </td>`
);

fs.writeFileSync(path, c, 'utf8');
console.log('Frontend script updated');
