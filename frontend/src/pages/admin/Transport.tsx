import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bus, IndianRupee, Trash2, Plus, Edit2 } from 'lucide-react';

const Transport: React.FC = () => {
    const [activeTab, setActiveTab] = useState('bus-details');

    // State for Bus Details
    const [buses, setBuses] = useState<any[]>(() => {
        const saved = localStorage.getItem('buses');
        return saved ? JSON.parse(saved) : [];
    });

    // Form states
    const [newBus, setNewBus] = useState({ busNo: '', vehicleNo: '', driverName: '', mobile: '', conductorName: '', seats: '', status: 'Active' });

    const [transportStops, setTransportStops] = useState<any[]>([]);
    const [newStop, setNewStop] = useState({ name: '', fee: '' });
    const [editStopId, setEditStopId] = useState<string | null>(null);

    useEffect(() => {
        fetchStops();
    }, []);

    const fetchStops = async () => {
        try {
            const res = await axios.get('/api/admin/transport/stops');
            setTransportStops(res.data);
        } catch (error) {
            console.error('Failed to fetch stops');
        }
    };

    const handleAddTransportStop = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editStopId) {
                const res = await axios.put(`/api/admin/transport/stops/${editStopId}`, {
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
    };

    const handleDeleteStop = async (id: string) => {
        if (!window.confirm('Delete this stop?')) return;
        try {
            await axios.delete(`/api/admin/transport/stops/${id}`);
            setTransportStops(transportStops.filter(s => s.id !== id));
        } catch (error) {
            alert('Failed to delete stop');
        }
    };

    const handleAddBus = (e: React.FormEvent) => {
        e.preventDefault();
        const updated = [...buses, newBus];
        setBuses(updated);
        localStorage.setItem('buses', JSON.stringify(updated));
        setNewBus({ busNo: '', vehicleNo: '', driverName: '', mobile: '', conductorName: '', seats: '', status: 'Active' });
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
                                <button type="submit" className="btn-primary" style={{ marginTop: '1rem', width: 'auto' }}>Add Bus</button>
                            </form>
                            <div className="data-table-container">
                                <table>
                                    <thead><tr><th>Bus No</th><th>Vehicle No</th><th>Driver</th><th>Mobile</th><th>Conductor</th><th>Seats</th><th>Status</th></tr></thead>
                                    <tbody>
                                        {buses.map((bus, idx) => (
                                            <tr key={idx}><td>{bus.busNo}</td><td>{bus.vehicleNo}</td><td>{bus.driverName}</td><td>{bus.mobile}</td><td>{bus.conductorName}</td><td>{bus.seats}</td><td><span className={`badge ${bus.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>{bus.status}</span></td></tr>
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
                </div>
            </div>
        </div>
    );
};

export default Transport;
