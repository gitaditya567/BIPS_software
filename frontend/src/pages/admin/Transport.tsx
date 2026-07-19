import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bus, IndianRupee, Trash2, Plus, Edit2, FileText, Search, Filter, Download } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const Transport: React.FC = () => {
    const [activeTab, setActiveTab] = useState('bus-details');

    // State for Bus Details
    const [buses, setBuses] = useState<any[]>(() => {
        const saved = localStorage.getItem('buses');
        return saved ? JSON.parse(saved) : [];
    });

    // Form states
    const [newBus, setNewBus] = useState({ busNo: '', vehicleNo: '', driverName: '', mobile: '', conductorName: '', seats: '', status: 'Active' });
    const [editBusIndex, setEditBusIndex] = useState<number | null>(null);

    const [transportStops, setTransportStops] = useState<any[]>([]);
    const [newStop, setNewStop] = useState({ name: '', fee: '' });
    const [editStopId, setEditStopId] = useState<string | null>(null);

    // Ledger States
    const [ledgerData, setLedgerData] = useState<any>(null);
    const [loadingLedger, setLoadingLedger] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [classFilter, setClassFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    useEffect(() => {
        fetchStops();
    }, []);

    useEffect(() => {
        if (activeTab === 'transport-ledger') {
            fetchLedger();
        }

        const handleSessionChange = () => {
            if (activeTab === 'transport-ledger') {
                fetchLedger();
            }
        };
        window.addEventListener('activeSessionChanged', handleSessionChange);
        return () => {
            window.removeEventListener('activeSessionChanged', handleSessionChange);
        };
    }, [activeTab]);

    const fetchStops = async () => {
        try {
            const res = await axios.get('/erp-api/admin/transport/stops');
            setTransportStops(res.data);
        } catch (error) {
            console.error('Failed to fetch stops');
        }
    };

    const fetchLedger = async () => {
        setLoadingLedger(true);
        try {
            const session = localStorage.getItem('activeSession') || '2024-2025';
            const res = await axios.get(`/erp-api/admin/transport/ledger?session=${session}`);
            setLedgerData(res.data);
        } catch (error) {
            console.error('Failed to fetch transport ledger:', error);
        } finally {
            setLoadingLedger(false);
        }
    };

    const handleAddTransportStop = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editStopId) {
                const res = await axios.put(`/erp-api/admin/transport/stops/${editStopId}`, {
                    name: newStop.name,
                    busFare: newStop.fee
                });
                setTransportStops(transportStops.map(s => s.id === editStopId ? res.data : s));
                setEditStopId(null);
                setNewStop({ name: '', fee: '' });
                alert('Transport Fee Updated Successfully!');
            } else {
                const res = await axios.post('/erp-api/admin/transport/stops', {
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
    };

    const handleDeleteStop = async (id: string) => {
        if (!window.confirm('Delete this stop?')) return;
        try {
            await axios.delete(`/erp-api/admin/transport/stops/${id}`);
            setTransportStops(transportStops.filter(s => s.id !== id));
        } catch (error) {
            alert('Failed to delete stop');
        }
    };

    const handleAddBus = (e: React.FormEvent) => {
        e.preventDefault();
        let updated;
        if (editBusIndex !== null) {
            updated = [...buses];
            updated[editBusIndex] = newBus;
            setEditBusIndex(null);
            alert('Bus Updated Successfully!');
        } else {
            updated = [...buses, newBus];
            alert('Bus Added Successfully!');
        }
        setBuses(updated);
        localStorage.setItem('buses', JSON.stringify(updated));
        setNewBus({ busNo: '', vehicleNo: '', driverName: '', mobile: '', conductorName: '', seats: '', status: 'Active' });
    };

    const handleEditBusClick = (bus: any, index: number) => {
        setEditBusIndex(index);
        setNewBus(bus);
    };

    const handleDeleteBus = (index: number) => {
        if (!window.confirm('Are you sure you want to delete this bus?')) return;
        const updated = buses.filter((_, i) => i !== index);
        setBuses(updated);
        localStorage.setItem('buses', JSON.stringify(updated));
        alert('Bus Deleted Successfully!');
    };

    const uniqueClasses = ledgerData?.students 
        ? Array.from(new Set(ledgerData.students.map((s: any) => s.className))).filter(Boolean)
        : [];

    const filteredStudents = ledgerData?.students?.filter((s: any) => {
        const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              s.admissionNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              s.fatherName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesClass = classFilter === '' || s.className === classFilter;
        
        let matchesStatus = true;
        if (statusFilter === 'Paid') {
            matchesStatus = s.outstanding <= 0;
        } else if (statusFilter === 'Due') {
            matchesStatus = s.outstanding > 0;
        }
        
        return matchesSearch && matchesClass && matchesStatus;
    }) || [];

    const exportTransportExcel = () => {
        if (!ledgerData) return;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Transport Ledger');

        // Styles
        const titleFont = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
        const subtitleFont = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF475569' } };
        const headerFont = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        const dataFont = { name: 'Arial', size: 10 };
        const totalFont = { name: 'Arial', size: 10, bold: true };

        const headerFills: Record<string, any> = {
            metadata: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }, // Slate-800
            expected: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } }, // Blue
            collected: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } }, // Green
            outstanding: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4444' } }, // Red
            months: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF64748B' } } // Slate-500
        };

        const cellFills: Record<string, any> = {
            expected: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } },
            collected: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F4EA' } },
            outstanding: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE8E6' } },
            paidMonth: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F4EA' } },
            dueMonth: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE8E6' } }
        };

        // Title Block (Rows 1-3)
        worksheet.mergeCells('A1:V1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = 'BIPS SENIOR SECONDARY SCHOOL';
        titleCell.font = titleFont;
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        titleCell.fill = headerFills.metadata;
        worksheet.getRow(1).height = 35;

        worksheet.mergeCells('A2:V2');
        const subtitleCell = worksheet.getCell('A2');
        subtitleCell.value = 'Detailed Transport Collection & Outstanding Dues Ledger';
        subtitleCell.font = { ...subtitleFont, size: 12 };
        subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(2).height = 20;

        const activeSessionStr = localStorage.getItem('activeSession') || '2024-2025';
        worksheet.mergeCells('A3:V3');
        const metaCell = worksheet.getCell('A3');
        metaCell.value = `Academic Session: ${activeSessionStr} | Exported on: ${new Date().toLocaleString('en-IN')} | Active Transport Users: ${ledgerData.stats.totalUsers}`;
        metaCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
        metaCell.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(3).height = 18;

        worksheet.addRow([]); // Blank spacer Row 4

        // Headers Row 5
        const headers = [
            'Admission No', 'Student Name', 'Father Name', 'Class', 'Stop Name', 
            'Monthly Fare', 'Yearly Expected', 'Expected Till Now', 'Collected (Net)', 'Outstanding (Due)',
            'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'
        ];

        const headerRow = worksheet.addRow(headers);
        headerRow.height = 28;
        headerRow.eachCell((cell, colNum) => {
            cell.font = headerFont;
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            
            if (colNum <= 5) {
                cell.fill = headerFills.metadata;
            } else if (colNum === 6 || colNum === 7 || colNum === 8) {
                cell.fill = headerFills.expected;
            } else if (colNum === 9) {
                cell.fill = headerFills.collected;
            } else if (colNum === 10) {
                cell.fill = headerFills.outstanding;
            } else {
                cell.fill = headerFills.months;
            }
        });

        // Add Student Rows
        filteredStudents.forEach((row: any) => {
            const dataRow = [
                row.admissionNo,
                row.name,
                row.fatherName,
                row.className,
                row.stopName,
                row.busFare,
                row.expectedYearly,
                row.expectedUpToNow,
                row.collected,
                row.outstanding,
                ...row.months.map((m: any) => m.status === 'paid' ? 'PAID' : m.status === 'pending' ? 'DUE' : '-')
            ];

            const addedRow = worksheet.addRow(dataRow);
            addedRow.height = 20;

            // Apply fonts, alignment, formatting
            addedRow.eachCell((cell, colNum) => {
                cell.font = dataFont;
                if (colNum <= 5) {
                    cell.alignment = { horizontal: 'left', vertical: 'middle' };
                } else if (colNum >= 6 && colNum <= 10) {
                    cell.alignment = { horizontal: 'right', vertical: 'middle' };
                    cell.numFmt = '₹#,##0.00';
                    
                    if (colNum === 6 || colNum === 7 || colNum === 8) {
                        cell.fill = cellFills.expected;
                    } else if (colNum === 9) {
                        cell.fill = cellFills.collected;
                    } else if (colNum === 10) {
                        cell.fill = cellFills.outstanding;
                    }
                } else {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    const statusVal = cell.value;
                    if (statusVal === 'PAID') {
                        cell.fill = cellFills.paidMonth;
                        cell.font = { ...dataFont, color: { argb: 'FF166534' }, bold: true };
                    } else if (statusVal === 'DUE') {
                        cell.fill = cellFills.dueMonth;
                        cell.font = { ...dataFont, color: { argb: 'FF991B1B' }, bold: true };
                    }
                }
            });
        });

        // Grand Total Row
        const totalRowIdx = worksheet.rowCount + 1;
        const totalRowVals = Array(22).fill('');
        totalRowVals[4] = 'GRAND TOTAL';
        
        // Add formulas
        totalRowVals[5] = { formula: `=SUM(F6:F${totalRowIdx - 1})` };
        totalRowVals[6] = { formula: `=SUM(G6:G${totalRowIdx - 1})` };
        totalRowVals[7] = { formula: `=SUM(H6:H${totalRowIdx - 1})` };
        totalRowVals[8] = { formula: `=SUM(I6:I${totalRowIdx - 1})` };
        totalRowVals[9] = { formula: `=SUM(J6:J${totalRowIdx - 1})` };

        const addedTotalRow = worksheet.addRow(totalRowVals);
        addedTotalRow.height = 24;

        addedTotalRow.eachCell((cell, colNum) => {
            cell.font = totalFont;
            if (colNum === 5) {
                cell.alignment = { horizontal: 'right', vertical: 'middle' };
            } else if (colNum >= 6 && colNum <= 10) {
                cell.alignment = { horizontal: 'right', vertical: 'middle' };
                cell.numFmt = '₹#,##0.00';
            }
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }; // Slate-200
        });

        // Double Borders for Grand Total (Accounting Style)
        for (let c = 1; c <= 22; c++) {
            const cell = worksheet.getCell(totalRowIdx, c);
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                bottom: { style: 'double', color: { argb: 'FF1E293B' } }
            };
        }

        // Set column widths
        worksheet.columns.forEach((col, index) => {
            if (index === 0) col.width = 16;
            else if (index === 1) col.width = 24;
            else if (index === 2) col.width = 24;
            else if (index === 3) col.width = 12;
            else if (index === 4) col.width = 22;
            else if (index >= 5 && index <= 9) col.width = 16;
            else col.width = 10; // Month columns
        });

        // Group month columns (K to V)
        for (let colNum = 11; colNum <= 22; colNum++) {
            worksheet.getColumn(colNum).outlineLevel = 1;
        }

        // Freeze Panes
        worksheet.views = [{ state: 'frozen', xSplit: 5, ySplit: 5 }];

        // Write and Save
        workbook.xlsx.writeBuffer().then(buffer => {
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const activeSessionStr = localStorage.getItem('activeSession') || '2024-2025';
            saveAs(blob, `BIPS_Transport_Ledger_${activeSessionStr}_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
        });
    };

    return (
        <div style={{ animation: 'slideUp 0.5s ease-out' }}>
            <h1 style={{ marginBottom: '2rem', fontSize: '1.875rem', fontWeight: 800, color: '#1e293b' }}>Transport Management</h1>

            <div className="stat-card" style={{ display: 'block', marginBottom: '2rem', padding: '0', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#fff' }}>
                <div style={{ display: 'flex', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '0 1.5rem' }}>
                    <div 
                        style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '1rem 1.5rem', cursor: 'pointer', borderBottom: activeTab === 'bus-details' ? '3px solid #4f46e5' : '3px solid transparent', color: activeTab === 'bus-details' ? '#4f46e5' : '#64748b', transition: 'all 0.3s' }}
                        onClick={() => setActiveTab('bus-details')}
                    >
                        <Bus size={18} />
                        <span style={{ fontWeight: '600' }}>Bus Details</span>
                    </div>
                    <div 
                        style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '1rem 1.5rem', cursor: 'pointer', borderBottom: activeTab === 'transport-fees' ? '3px solid #4f46e5' : '3px solid transparent', color: activeTab === 'transport-fees' ? '#4f46e5' : '#64748b', transition: 'all 0.3s' }}
                        onClick={() => setActiveTab('transport-fees')}
                    >
                        <IndianRupee size={18} />
                        <span style={{ fontWeight: '600' }}>Transport Fees</span>
                    </div>
                    <div 
                        style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '1rem 1.5rem', cursor: 'pointer', borderBottom: activeTab === 'transport-ledger' ? '3px solid #4f46e5' : '3px solid transparent', color: activeTab === 'transport-ledger' ? '#4f46e5' : '#64748b', transition: 'all 0.3s' }}
                        onClick={() => setActiveTab('transport-ledger')}
                    >
                        <FileText size={18} />
                        <span style={{ fontWeight: '600' }}>Transport Ledger & Reports</span>
                    </div>
                </div>

                <div style={{ padding: '2.5rem' }}>
                    {activeTab === 'bus-details' && (
                        <div>
                            <h3 style={{ fontWeight: '700', color: '#334155', marginBottom: '1.5rem' }}>Bus Details</h3>
                            <form onSubmit={handleAddBus} style={{ marginBottom: '3rem', backgroundColor: '#f1f5f9', padding: '2rem', borderRadius: '16px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                    <div className="form-group"><label>Bus Number</label><input type="text" className="form-control" value={newBus.busNo} onChange={e => setNewBus({ ...newBus, busNo: e.target.value })} required /></div>
                                    <div className="form-group"><label>Vehicle No</label><input type="text" className="form-control" value={newBus.vehicleNo} onChange={e => setNewBus({ ...newBus, vehicleNo: e.target.value })} required /></div>
                                    <div className="form-group"><label>Driver Name</label><input type="text" className="form-control" value={newBus.driverName} onChange={e => setNewBus({ ...newBus, driverName: e.target.value })} required /></div>
                                    <div className="form-group"><label>Mobile</label><input type="text" className="form-control" value={newBus.mobile} onChange={e => setNewBus({ ...newBus, mobile: e.target.value })} required /></div>
                                    <div className="form-group"><label>Conductor</label><input type="text" className="form-control" value={newBus.conductorName} onChange={e => setNewBus({ ...newBus, conductorName: e.target.value })} required /></div>
                                    <div className="form-group"><label>Seats</label><input type="number" className="form-control" value={newBus.seats} onChange={e => setNewBus({ ...newBus, seats: e.target.value })} required /></div>
                                    <div className="form-group"><label>Status</label><select className="form-control" value={newBus.status} onChange={e => setNewBus({ ...newBus, status: e.target.value })}><option value="Active">Active</option><option value="Inactive">Inactive</option></select></div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                    <button type="submit" className="btn-primary" style={{ width: 'auto' }}>
                                        {editBusIndex !== null ? 'Update Bus' : 'Add Bus'}
                                    </button>
                                    {editBusIndex !== null && (
                                        <button 
                                            type="button" 
                                            className="btn-secondary" 
                                            style={{ width: 'auto', backgroundColor: '#94a3b8', color: 'white', border: 'none', borderRadius: '8px', padding: '0.6rem 1.2rem', fontWeight: 'bold', cursor: 'pointer' }}
                                            onClick={() => {
                                                setEditBusIndex(null);
                                                setNewBus({ busNo: '', vehicleNo: '', driverName: '', mobile: '', conductorName: '', seats: '', status: 'Active' });
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            </form>
                            <div className="data-table-container">
                                <table>
                                    <thead><tr><th>Bus No</th><th>Vehicle No</th><th>Driver</th><th>Mobile</th><th>Conductor</th><th>Seats</th><th>Status</th><th style={{ textAlign: 'center' }}>Actions</th></tr></thead>
                                    <tbody>
                                        {buses.map((bus, idx) => (
                                            <tr key={idx}>
                                                <td>{bus.busNo}</td>
                                                <td>{bus.vehicleNo}</td>
                                                <td>{bus.driverName}</td>
                                                <td>{bus.mobile}</td>
                                                <td>{bus.conductorName}</td>
                                                <td>{bus.seats}</td>
                                                <td><span className={`badge ${bus.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>{bus.status}</span></td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                        <button 
                                                            onClick={() => handleEditBusClick(bus, idx)}
                                                            className="text-blue-600 hover:text-blue-900"
                                                            style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '0.5rem' }}
                                                        >
                                                            <Edit2 size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteBus(idx)}
                                                            className="text-red-600 hover:text-red-900"
                                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem' }}
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'transport-fees' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2.5rem', animation: 'fadeIn 0.4s ease-out' }}>
                            <div className="stat-card" style={{ display: 'block', height: 'fit-content', border: '1px solid #e0e7ff', background: '#f8faff', padding: '2rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                    <div style={{ backgroundColor: '#4f46e5', color: 'white', padding: '0.5rem', borderRadius: '8px' }}><Plus size={20} /></div>
                                    <h3 style={{ fontWeight: '800', color: '#1e293b' }}>{editStopId ? 'Update Stop Fee' : 'Add Stop Fee'}</h3>
                                </div>
                                <form onSubmit={handleAddTransportStop}>
                                    <div className="form-group">
                                        <label style={{ fontWeight: '700', color: '#475569' }}>Stop Name</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            placeholder="e.g. Bijnour Chauraha" 
                                            value={newStop.name} 
                                            onChange={e => setNewStop({...newStop, name: e.target.value})} 
                                            required 
                                        />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label style={{ fontWeight: '700', color: '#475569' }}>Bus Fare (₹)</label>
                                        <input 
                                            type="number" 
                                            className="form-control" 
                                            placeholder="0.00" 
                                            value={newStop.fee} 
                                            onChange={e => setNewStop({...newStop, fee: e.target.value})} 
                                            required 
                                        />
                                    </div>
                                    <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1rem', background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', height: '45px', fontWeight: '700' }}>
                                        {editStopId ? 'Update Stop Fee' : 'Save Stop Fee'}
                                    </button>
                                </form>
                            </div>

                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h3 style={{ margin: 0, fontWeight: '700', color: '#1e293b' }}>Standard Transport Rates</h3>
                                    <div style={{ backgroundColor: '#4f46e5', color: 'white', padding: '0.4rem 1rem', borderRadius: '100px', fontSize: '0.9rem', fontWeight: '700' }}>
                                        Total Stops: {transportStops.length}
                                    </div>
                                </div>
                                <div className="data-table-container" style={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                    <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                                        <table style={{ width: '100%' }}>
                                            <thead>
                                                <tr style={{ backgroundColor: '#f8fafc' }}>
                                                    <th style={{ padding: '1.25rem', color: '#64748b', fontSize: '0.85rem' }}>STOP NAME</th>
                                                    <th style={{ padding: '1.25rem', color: '#64748b', fontSize: '0.85rem', textAlign: 'right' }}>BUS FARE (₹)</th>
                                                    <th style={{ padding: '1.25rem', color: '#64748b', fontSize: '0.85rem', textAlign: 'center' }}>ACTION</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {transportStops.length > 0 ? (
                                                    transportStops.slice().reverse().map((stop) => (
                                                        <tr key={stop.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                                            <td style={{ padding: '1.25rem', fontWeight: '700', color: '#1e293b' }}>{stop.name}</td>
                                                            <td style={{ padding: '1.25rem', textAlign: 'right', fontWeight: '800', color: '#059669', fontSize: '1.1rem' }}>₹{Number(stop.busFare || stop.fee || 0).toLocaleString()}</td>
                                                            <td style={{ padding: '1.25rem', textAlign: 'center' }}>
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
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr><td colSpan={3} style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>No transport rates defined yet.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'transport-ledger' && (
                        <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
                            {/* KPI Widgets */}
                            {ledgerData ? (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                                    gap: '1.5rem',
                                    marginBottom: '2rem'
                                }}>
                                    <div className="stat-card" style={{ display: 'block', borderLeft: '5px solid #3b82f6', backgroundColor: '#f0f9ff' }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Transport Users</div>
                                        <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1e293b', marginTop: '0.5rem' }}>{ledgerData.stats.totalUsers}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '0.25rem', fontWeight: '600' }}>Active Bus Service Users</div>
                                    </div>
                                    <div className="stat-card" style={{ display: 'block', borderLeft: '5px solid #8b5cf6', backgroundColor: '#f5f3ff' }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#4c1d95', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Yearly Expected Fare</div>
                                        <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1e293b', marginTop: '0.5rem' }}>₹{ledgerData.stats.totalExpectedYear.toLocaleString('en-IN')}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#8b5cf6', marginTop: '0.25rem', fontWeight: '600' }}>Total Year projection</div>
                                    </div>
                                    <div className="stat-card" style={{ display: 'block', borderLeft: '5px solid #10b981', backgroundColor: '#ecfdf5' }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#064e3b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Collected (Net)</div>
                                        <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1e293b', marginTop: '0.5rem' }}>₹{ledgerData.stats.totalCollected.toLocaleString('en-IN')}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.25rem', fontWeight: '600' }}>Approved collection</div>
                                    </div>
                                    <div className="stat-card" style={{ display: 'block', borderLeft: '5px solid #ef4444', backgroundColor: '#fef2f2' }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#7f1d1d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Outstanding</div>
                                        <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1e293b', marginTop: '0.5rem' }}>₹{ledgerData.stats.totalOutstanding.toLocaleString('en-IN')}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem', fontWeight: '600' }}>Due up to elapsed months ({ledgerData.elapsedMonths.length} months)</div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Loading stats...</div>
                            )}

                            {/* Filters Bar */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '1rem',
                                marginBottom: '1.5rem',
                                backgroundColor: '#f8fafc',
                                padding: '1.25rem 1.5rem',
                                borderRadius: '14px',
                                border: '1px solid #e2e8f0'
                            }}>
                                <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
                                    <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
                                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            style={{ paddingLeft: '2.5rem', height: '40px', fontSize: '0.9rem' }}
                                            placeholder="Search student or adm no..."
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                        <Filter size={16} style={{ color: '#64748b' }} />
                                        <select 
                                            className="form-control" 
                                            style={{ height: '40px', width: '250px', minWidth: '250px', flexShrink: 0, fontSize: '0.9rem' }}
                                            value={classFilter}
                                            onChange={e => setClassFilter(e.target.value)}
                                        >
                                            <option value="">All Classes</option>
                                            {uniqueClasses.map((c: any) => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div style={{ flexShrink: 0 }}>
                                        <select 
                                            className="form-control" 
                                            style={{ height: '40px', width: '190px', minWidth: '190px', flexShrink: 0, fontSize: '0.9rem' }}
                                            value={statusFilter}
                                            onChange={e => setStatusFilter(e.target.value)}
                                        >
                                            <option value="All">All Statuses</option>
                                            <option value="Paid">Fully Paid (Up to Now)</option>
                                            <option value="Due">Outstanding Dues</option>
                                        </select>
                                    </div>
                                </div>

                                <button 
                                    onClick={exportTransportExcel}
                                    className="btn-primary" 
                                    style={{
                                        width: 'auto',
                                        height: '40px',
                                        backgroundColor: '#10b981',
                                        color: 'white',
                                        fontWeight: '700',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0 1.25rem',
                                        borderRadius: '8px',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Download size={16} />
                                    Export Excel Report
                                </button>
                            </div>

                            {/* Data Table */}
                            {loadingLedger ? (
                                <div style={{ textAlign: 'center', padding: '5rem', color: '#64748b' }}>
                                    <div className="spinner" style={{ margin: '0 auto 1rem', border: '4px solid #f3f3f3', borderTop: '4px solid #4f46e5', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite' }} />
                                    Loading transport ledger data...
                                </div>
                            ) : filteredStudents.length > 0 ? (
                                <div className="data-table-container" style={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflowX: 'auto', maxHeight: '550px', overflowY: 'auto', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                    <table style={{ width: '100%', minWidth: '1100px', borderCollapse: 'separate', borderSpacing: 0 }}>
                                        <thead>
                                            <tr style={{ position: 'sticky', top: 0, zIndex: 10, color: '#475569', fontSize: '0.75rem', fontWeight: '800', letterSpacing: '0.05em' }}>
                                                <th style={{ padding: '1rem 0.75rem', backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>Adm No</th>
                                                <th style={{ padding: '1rem 0.75rem', backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>Student Name</th>
                                                <th style={{ padding: '1rem 0.75rem', backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>Class</th>
                                                <th style={{ padding: '1rem 0.75rem', backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>Stop Name</th>
                                                <th style={{ padding: '1rem 0.75rem', backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'right' }}>Monthly</th>
                                                <th style={{ padding: '1rem 0.75rem', backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'right' }}>Expected (Till Now)</th>
                                                <th style={{ padding: '1rem 0.75rem', backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'right' }}>Collected</th>
                                                <th style={{ padding: '1rem 0.75rem', backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'right' }}>Outstanding</th>
                                                <th style={{ padding: '1rem 0.75rem', backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'center', width: '360px' }}>Month Matrix (Apr - Mar)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredStudents.map((s: any) => (
                                                <tr key={s.studentId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '1rem 0.75rem', color: '#4f46e5', fontWeight: '700' }}>{s.admissionNo}</td>
                                                    <td style={{ padding: '1rem 0.75rem', color: '#1e293b' }}>
                                                        <div style={{ fontWeight: '700' }}>{s.name}</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>F/N: {s.fatherName}</div>
                                                    </td>
                                                    <td style={{ padding: '1rem 0.75rem', fontWeight: '600', color: '#475569' }}>{s.className}</td>
                                                    <td style={{ padding: '1rem 0.75rem', color: '#1e293b' }}>{s.stopName}</td>
                                                    <td style={{ padding: '1rem 0.75rem', textAlign: 'right', fontWeight: '700', color: '#059669' }}>₹{s.busFare.toLocaleString('en-IN')}</td>
                                                    <td style={{ padding: '1rem 0.75rem', textAlign: 'right', fontWeight: '700', color: '#3b82f6' }}>₹{s.expectedUpToNow.toLocaleString('en-IN')}</td>
                                                    <td style={{ padding: '1rem 0.75rem', textAlign: 'right', fontWeight: '700', color: '#10b981' }}>₹{s.collected.toLocaleString('en-IN')}</td>
                                                    <td style={{ padding: '1rem 0.75rem', textAlign: 'right', fontWeight: '800', color: s.outstanding > 0 ? '#ef4444' : '#10b981' }}>
                                                        ₹{s.outstanding.toLocaleString('en-IN')}
                                                    </td>
                                                    <td style={{ padding: '1rem 0.75rem' }}>
                                                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                            {s.months.map((m: any, idx: number) => {
                                                                const isPaid = m.status === 'paid';
                                                                const isPending = m.status === 'pending';
                                                                const shortName = m.month.slice(0, 3);
                                                                
                                                                return (
                                                                    <div 
                                                                        key={idx}
                                                                        title={`${m.month}: ${isPaid ? 'Paid' : isPending ? 'Pending Due' : 'Future Month'} (₹${m.paidAmount || 0})`}
                                                                        style={{
                                                                            width: '26px',
                                                                            height: '24px',
                                                                            borderRadius: '4px',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            fontSize: '0.65rem',
                                                                            fontWeight: '700',
                                                                            backgroundColor: isPaid ? '#dcfce7' : isPending ? '#fee2e2' : '#f1f5f9',
                                                                            color: isPaid ? '#15803d' : isPending ? '#b91c1c' : '#64748b',
                                                                            border: `1px solid ${isPaid ? '#bbf7d0' : isPending ? '#fecaca' : '#cbd5e1'}`,
                                                                            cursor: 'default'
                                                                        }}
                                                                    >
                                                                        {shortName.slice(0, 2)}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8', border: '2px dashed #cbd5e1', borderRadius: '16px' }}>
                                    No students matching the selected transport filter criteria.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Transport;
