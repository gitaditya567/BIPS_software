const fs = require('fs');
const path = 'frontend/src/pages/admin/Transport_new.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add Edit2 import
content = content.replace(
    /import \{ Bus, IndianRupee, Trash2, Plus \} from 'lucide-react';/,
    `import { Bus, IndianRupee, Trash2, Plus, Edit2 } from 'lucide-react';`
);

// Add editStopId state
content = content.replace(
    /const \[newStop, setNewStop\] = useState\(\{ name: '', fee: '' \}\);/,
    `const [newStop, setNewStop] = useState({ name: '', fee: '' });
    const [editStopId, setEditStopId] = useState<string | null>(null);`
);

// Replace handleAddTransportStop with add/update logic
const handleAddCode = `const handleAddTransportStop = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editStopId) {
                const res = await axios.put(\`/api/admin/transport/stops/\${editStopId}\`, {
                    name: newStop.name,
                    busFare: newStop.fee
                });
                setTransportStops(transportStops.map(s => s.id === editStopId ? res.data : s));
                setEditStopId(null);
                setNewStop({ name: '', fee: '' });
                alert('Transport Fee Updated Successfully!');
            } else {
                const res = await axios.post('/api/admin/transport/stops', {
                    name: newStop.name,
                    km: "",
                    ratePerKm: "",
                    busFare: newStop.fee
                });
                setTransportStops([...transportStops, res.data]);
                setNewStop({ name: '', fee: '' });
                alert('Transport Fee Added Successfully!');
            }
        } catch (error) {
            alert((error as any).response?.data?.error || 'Failed to save transport stop');
        }
    };

    const handleEditStopClick = (stop: any) => {
        setEditStopId(stop.id);
        const fare = stop.busFare ? stop.busFare : stop.fee ? stop.fee : '';
        setNewStop({ name: stop.name, fee: fare.toString() });
    };`;

content = content.replace(
    /const handleAddTransportStop = async \(e: React\.FormEvent\) => \{[\s\S]*?alert\(\(error as any\)\.response\?\.data\?\.error \|\| 'Failed to add transport stop'\);\s*\}\s*\};/,
    handleAddCode
);

// Change "Add Stop Fee" text to dynamic
content = content.replace(
    /<h3 style=\{\{ fontWeight: '800', color: '#1e293b' \}\}>Add Stop Fee<\/h3>/,
    `<h3 style={{ fontWeight: '800', color: '#1e293b' }}>{editStopId ? 'Update Stop Fee' : 'Add Stop Fee'}</h3>`
);

// Change "Save Stop Fee" button to dynamic
content = content.replace(
    /Save Stop Fee/,
    `{editStopId ? 'Update Stop Fee' : 'Save Stop Fee'}`
);

// Add Edit button next to Delete
content = content.replace(
    /<td style=\{\{ padding: '1\.25rem', textAlign: 'center' \}\}>\s*<button\s*style=\{\{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0\.5rem' \}\}\s*onClick=\{\(\) => handleDeleteStop\(stop\.id\)\}\s*>\s*<Trash2 size=\{18\} \/>\s*<\/button>\s*<\/td>/g,
    `<td style={{ padding: '1.25rem', textAlign: 'center' }}>
                                                                <button 
                                                                    style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '0.5rem', marginRight: '0.25rem' }} 
                                                                    onClick={() => handleEditStopClick(stop)}
                                                                >
                                                                    <Edit2 size={18} />
                                                                </button>
                                                                <button 
                                                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem' }} 
                                                                    onClick={() => handleDeleteStop(stop.id)}
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            </td>`
);

fs.writeFileSync(path, content, 'utf8');

// Duplicate logic for Transport.tsx
const path2 = 'frontend/src/pages/admin/Transport.tsx';
if (fs.existsSync(path2)) {
    let content2 = fs.readFileSync(path2, 'utf8');

    content2 = content2.replace(
        /import \{ Bus, IndianRupee, Trash2, Plus \} from 'lucide-react';/,
        `import { Bus, IndianRupee, Trash2, Plus, Edit2 } from 'lucide-react';`
    );

    content2 = content2.replace(
        /const \[newStop, setNewStop\] = useState\(\{ name: '', fee: '' \}\);/,
        `const [newStop, setNewStop] = useState({ name: '', fee: '' });
    const [editStopId, setEditStopId] = useState<string | null>(null);`
    );

    content2 = content2.replace(
        /const handleAddTransportStop = async \(e: React\.FormEvent\) => \{[\s\S]*?alert\(\(error as any\)\.response\?\.data\?\.error \|\| 'Failed to add transport stop'\);\s*\}\s*\};/,
        handleAddCode
    );

    content2 = content2.replace(
        /<h3 style=\{\{ fontWeight: '800', color: '#1e293b' \}\}>Add Stop Fee<\/h3>/,
        `<h3 style={{ fontWeight: '800', color: '#1e293b' }}>{editStopId ? 'Update Stop Fee' : 'Add Stop Fee'}</h3>`
    );

    content2 = content2.replace(
        /Save Stop Fee/,
        `{editStopId ? 'Update Stop Fee' : 'Save Stop Fee'}`
    );

    content2 = content2.replace(
        /<td style=\{\{ padding: '1\.25rem', textAlign: 'center' \}\}>\s*<button\s*style=\{\{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0\.5rem' \}\}\s*onClick=\{\(\) => handleDeleteStop\(stop\.id\)\}\s*>\s*<Trash2 size=\{18\} \/>\s*<\/button>\s*<\/td>/g,
        `<td style={{ padding: '1.25rem', textAlign: 'center' }}>
                                                                <button 
                                                                    style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '0.5rem', marginRight: '0.25rem' }} 
                                                                    onClick={() => handleEditStopClick(stop)}
                                                                >
                                                                    <Edit2 size={18} />
                                                                </button>
                                                                <button 
                                                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem' }} 
                                                                    onClick={() => handleDeleteStop(stop.id)}
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            </td>`
    );

    fs.writeFileSync(path2, content2, 'utf8');
}

console.log('Update edit functionality applied successfully.');
