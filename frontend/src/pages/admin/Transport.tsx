import React, { useState } from 'react';
import { Bus, MapPin, Clock } from 'lucide-react';

const Transport: React.FC = () => {
    const [activeTab, setActiveTab] = useState('bus-timing');

    // State for Bus Details
    const [buses, setBuses] = useState([
        { busNo: 'Bus 1', vehicleNo: 'UP78 AB1234', driverName: 'Ramesh', mobile: '9876543210', conductorName: 'Amit', seats: '40', status: 'Active' },
        { busNo: 'Bus 2', vehicleNo: 'UP78 CD5678', driverName: 'Suresh', mobile: '9765432109', conductorName: 'Rahul', seats: '35', status: 'Active' }
    ]);

    // State for Bus Routes
    const [routes, setRoutes] = useState([
        {
            routeName: 'Route A',
            busNo: 'Bus 1',
            startLocation: 'Kalyanpur',
            endLocation: 'School',
            pickupPoints: [
                { stop: 'Kalyanpur', time: '7:30 AM' },
                { stop: 'Panki', time: '7:45 AM' }
            ]
        },
        {
            routeName: 'Route B',
            busNo: 'Bus 2',
            startLocation: 'Rawatpur',
            endLocation: 'School',
            pickupPoints: [
                { stop: 'Rawatpur', time: '7:35 AM' },
                { stop: 'Gurudev', time: '7:50 AM' }
            ]
        }
    ]);

    // State for Bus Timing (Updated per requirement)
    const [timings, setTimings] = useState([
        { busNo: 'Bus 1', routeName: 'Route A', stopName: 'Kalyanpur', pickupTime: '7:30 AM', dropTime: '2:30 PM' },
        { busNo: 'Bus 1', routeName: 'Route A', stopName: 'Panki', pickupTime: '7:45 AM', dropTime: '2:15 PM' }
    ]);

    // Form states
    const [newBus, setNewBus] = useState({ busNo: '', vehicleNo: '', driverName: '', mobile: '', conductorName: '', seats: '', status: 'Active' });
    const [newRoute, setNewRoute] = useState({ routeName: '', busNo: '', startLocation: '', endLocation: '' });
    const [addedPoints, setAddedPoints] = useState<{ stop: string, time: string }[]>([]);

    // Timing Form State
    const [newTiming, setNewTiming] = useState({
        busNo: '',
        routeName: '',
        stopName: '',
        pickupTime: '',
        dropTime: ''
    });

    // Stop Names constants
    const STOP_NAMES = [
        "C.R.P.F.", "Kaithi from", "Chandrawal", "Kasim Kheda", "Ganesh Shankar Kheda", 
        "Laxman Kheda", "Makhdoompur Kaithi", "Mohini Kheda", "Mullahi Kheda", "Natkur", 
        "Ratauli (Khatola)", "Sariyan", "Shahpur Majhigawan", "Sohawa", "Alakhmanda", 
        "Bhadeswa", "Kurmi", "Khatola", "S.D.K.T", "Ahmad Kheda", "Bahadur Kheda", 
        "Balsing Kheda", "Bhadesuwa", "Bhagat Kheda", "Bhawani Kheda", "Bijnour", 
        "Dhanuwasand", "Himmat Kheda", "Iqbal Kheda", "Jaiti Kheda", "Jalim Kheda", 
        "Kamlapur", "Mahesh Kheda", "Marui", "Mati", "Newawan", "Nurdi Kheda", 
        "Pinwat", "Raheem Nagar", "Raja Kheda", "Rani Kheda"
    ];

    const handleAddBus = (e: React.FormEvent) => {
        e.preventDefault();
        setBuses([...buses, newBus]);
        setNewBus({ busNo: '', vehicleNo: '', driverName: '', mobile: '', conductorName: '', seats: '', status: 'Active' });
    };

    const handleAddRoute = (e: React.FormEvent) => {
        e.preventDefault();
        setRoutes([...routes, { ...newRoute, pickupPoints: addedPoints }]);
        setNewRoute({ routeName: '', busNo: '', startLocation: '', endLocation: '' });
        setAddedPoints([]);
    };

    const handleAddTiming = (e: React.FormEvent) => {
        e.preventDefault();
        setTimings([...timings, newTiming]);
        setNewTiming({ busNo: '', routeName: '', stopName: '', pickupTime: '', dropTime: '' });
    };

    const tabButtonStyle = (tab: string) => ({
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '1rem 1.5rem',
        fontSize: '0.95rem',
        fontWeight: activeTab === tab ? '700' : '500',
        color: activeTab === tab ? '#4f46e5' : '#64748b',
        borderBottom: activeTab === tab ? '3px solid #4f46e5' : '3px solid transparent',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '0.625rem'
    });

    return (
        <div style={{ animation: 'slideUp 0.5s ease-out' }}>
            <h1 style={{ marginBottom: '2rem', fontSize: '1.875rem', fontWeight: 800, color: '#1e293b' }}>Transport Management</h1>

            <div className="stat-card" style={{ display: 'block', marginBottom: '2rem', padding: '0', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#fff' }}>
                <div style={{ display: 'flex', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '0 1.5rem' }}>
                    <button type="button" onClick={() => setActiveTab('bus-details')} style={tabButtonStyle('bus-details')}>
                        <Bus size={18} /> Bus Details
                    </button>
                    <button type="button" onClick={() => setActiveTab('bus-routes')} style={tabButtonStyle('bus-routes')}>
                        <MapPin size={18} /> Bus Routes
                    </button>
                    <button type="button" onClick={() => setActiveTab('bus-timing')} style={tabButtonStyle('bus-timing')}>
                        <Clock size={18} /> Bus Timing
                    </button>
                </div>

                <div style={{ padding: '2.5rem' }}>
                    {activeTab === 'bus-details' && (
                        <div>
                            <h3 style={{ fontWeight: '700', color: '#334155', marginBottom: '1.5rem' }}>School Bus Fleet</h3>
                            <form onSubmit={handleAddBus} style={{ marginBottom: '3rem', backgroundColor: '#f1f5f9', padding: '2rem', borderRadius: '16px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                    <div className="form-group"><label>Bus No</label><input type="text" className="form-control" value={newBus.busNo} onChange={e => setNewBus({ ...newBus, busNo: e.target.value })} required /></div>
                                    <div className="form-group"><label>Vehicle No</label><input type="text" className="form-control" value={newBus.vehicleNo} onChange={e => setNewBus({ ...newBus, vehicleNo: e.target.value })} required /></div>
                                    <div className="form-group"><label>Driver Name</label><input type="text" className="form-control" value={newBus.driverName} onChange={e => setNewBus({ ...newBus, driverName: e.target.value })} required /></div>
                                    <div className="form-group"><label>Mobile</label><input type="text" className="form-control" value={newBus.mobile} onChange={e => setNewBus({ ...newBus, mobile: e.target.value })} required /></div>
                                    <div className="form-group"><label>Seats</label><input type="number" className="form-control" value={newBus.seats} onChange={e => setNewBus({ ...newBus, seats: e.target.value })} required /></div>
                                    <div className="form-group"><label>Status</label><select className="form-control" value={newBus.status} onChange={e => setNewBus({ ...newBus, status: e.target.value })}><option value="Active">Active</option><option value="Inactive">Inactive</option></select></div>
                                </div>
                                <button type="submit" className="btn-primary" style={{ marginTop: '1rem', width: 'auto' }}>Add Bus</button>
                            </form>
                            <div className="data-table-container">
                                <table>
                                    <thead><tr><th>Bus No</th><th>Vehicle No</th><th>Driver</th><th>Mobile</th><th>Seats</th><th>Status</th></tr></thead>
                                    <tbody>
                                        {buses.map((bus, idx) => (
                                            <tr key={idx}><td>{bus.busNo}</td><td>{bus.vehicleNo}</td><td>{bus.driverName}</td><td>{bus.mobile}</td><td>{bus.seats}</td><td><span className={`badge ${bus.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>{bus.status}</span></td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'bus-routes' && (
                        <div>
                            <h3 style={{ fontWeight: '700', color: '#334155', marginBottom: '1.5rem' }}>Bus Routes</h3>
                            <form onSubmit={handleAddRoute} style={{ marginBottom: '3rem', backgroundColor: '#f1f5f9', padding: '2rem', borderRadius: '16px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                    <div className="form-group"><label>Route Name</label><input type="text" className="form-control" value={newRoute.routeName} onChange={e => setNewRoute({ ...newRoute, routeName: e.target.value })} required /></div>
                                    <div className="form-group">
                                        <label>Bus Number</label>
                                        <select className="form-control" value={newRoute.busNo} onChange={e => setNewRoute({ ...newRoute, busNo: e.target.value })} required>
                                            <option value="">Select Bus</option>
                                            {buses.map((b, i) => <option key={i} value={b.busNo}>{b.busNo}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group"><label>Start Location</label><input type="text" className="form-control" value={newRoute.startLocation} onChange={e => setNewRoute({ ...newRoute, startLocation: e.target.value })} required /></div>
                                    <div className="form-group"><label>End Location</label><input type="text" className="form-control" value={newRoute.endLocation} onChange={e => setNewRoute({ ...newRoute, endLocation: e.target.value })} required /></div>
                                </div>
                                <button type="submit" className="btn-primary" style={{ marginTop: '1rem', width: 'auto' }}>Save Route</button>
                            </form>
                            <div className="data-table-container">
                                <table>
                                    <thead><tr><th>Route</th><th>Bus</th><th>Start</th><th>End</th></tr></thead>
                                    <tbody>
                                        {routes.map((route, idx) => (
                                            <tr key={idx}><td>{route.routeName}</td><td>{route.busNo}</td><td>{route.startLocation}</td><td>{route.endLocation}</td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'bus-timing' && (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <div style={{ backgroundColor: '#e0e7ff', color: '#4f46e5', padding: '0.5rem', borderRadius: '8px' }}><Clock size={20} /></div>
                                <h3 style={{ fontWeight: '700', color: '#334155' }}>Manage Bus Schedule</h3>
                            </div>

                            <form onSubmit={handleAddTiming} style={{ marginBottom: '3rem', backgroundColor: '#f8fafc', padding: '2rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                                    <div className="form-group">
                                        <label>Bus Number</label>
                                        <select
                                            className="form-control"
                                            value={newTiming.busNo}
                                            onChange={(e) => setNewTiming({ ...newTiming, busNo: e.target.value })}
                                            required
                                        >
                                            <option value="">Select Bus</option>
                                            {buses.map((b, i) => <option key={i} value={b.busNo}>{b.busNo}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Route</label>
                                        <select
                                            className="form-control"
                                            value={newTiming.routeName}
                                            onChange={(e) => setNewTiming({ ...newTiming, routeName: e.target.value })}
                                            required
                                        >
                                            <option value="">Select Route</option>
                                            {routes.map((r, i) => <option key={i} value={r.routeName}>{r.routeName}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Stop Name</label>
                                        <select
                                            className="form-control"
                                            value={newTiming.stopName}
                                            onChange={(e) => setNewTiming({ ...newTiming, stopName: e.target.value })}
                                            required
                                        >
                                            <option value="">Select Stop</option>
                                            {STOP_NAMES.map((name, idx) => (
                                                <option key={idx} value={name}>{name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Pickup Time</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="7:30 AM"
                                            value={newTiming.pickupTime}
                                            onChange={(e) => setNewTiming({ ...newTiming, pickupTime: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Drop Time</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="2:30 PM"
                                            value={newTiming.dropTime}
                                            onChange={(e) => setNewTiming({ ...newTiming, dropTime: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                                    <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0.875rem 2.5rem', borderRadius: '10px', fontWeight: '600' }}>
                                        Save Schedule
                                    </button>
                                </div>
                            </form>

                            <div className="data-table-container" style={{ border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                <div className="table-header" style={{ borderBottom: '1px solid #f1f5f9', padding: '1.5rem' }}>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>Bus Schedule Table</h2>
                                </div>
                                <table style={{ width: '100%' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f8fafc' }}>
                                            <th style={{ padding: '1.25rem' }}>Bus</th>
                                            <th style={{ padding: '1.25rem' }}>Route</th>
                                            <th style={{ padding: '1.25rem' }}>Stop</th>
                                            <th style={{ padding: '1.25rem' }}>Pickup</th>
                                            <th style={{ padding: '1.25rem' }}>Drop</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {timings.map((timing, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ fontWeight: '700', color: '#4f46e5', padding: '1rem 1.25rem' }}>{timing.busNo}</td>
                                                <td style={{ fontWeight: '500', padding: '1rem 1.25rem' }}>{timing.routeName}</td>
                                                <td style={{ padding: '1rem 1.25rem' }}>{timing.stopName}</td>
                                                <td style={{ padding: '1rem 1.25rem', color: '#059669', fontWeight: '600' }}>{timing.pickupTime}</td>
                                                <td style={{ padding: '1rem 1.25rem', color: '#dc2626', fontWeight: '600' }}>{timing.dropTime}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Transport;
