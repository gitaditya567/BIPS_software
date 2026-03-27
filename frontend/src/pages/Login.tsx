import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('ADMIN');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await axios.post('/api/login', {
                email,
                password,
                role
            });

            const { token, user } = response.data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            if (user.role === 'ADMIN' || user.role === 'PRINCIPAL' || user.role === 'ACCOUNTS' || user.role === 'TRANSPORT') navigate('/admin');
            else if (user.role === 'TEACHER') navigate('/teacher');
            else if (user.role === 'PARENT') navigate('/parent');
            else if (user.role === 'STUDENT') navigate('/student');
            else navigate('/');

        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to login. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <img
                        src="/bips-logo.png"
                        alt="BIPS School Logo"
                        style={{
                            width: '110px',
                            height: '110px',
                            objectFit: 'contain',
                            marginBottom: '0.75rem',
                            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.18))'
                        }}
                    />
                    <h1>BIPS ERP</h1>
                    <p>Sign in to your account</p>
                </div>
                {error && <div style={{ color: '#EF4444', backgroundColor: '#FEE2E2', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label htmlFor="role">Login As</label>
                        <select
                            id="role"
                            className="form-control"
                            value={role}
                            onChange={(e) => {
                                const newRole = e.target.value;
                                setRole(newRole);
                                if (newRole === 'PARENT') {
                                    setEmail('BIPS/26/');
                                } else if (email === 'BIPS/26/') {
                                    setEmail('');
                                }
                            }}
                        >
                            <option value="ADMIN">Superadmin (Administrator)</option>
                            <option value="PRINCIPAL">Principal</option>
                            <option value="ACCOUNTS">Accounts</option>
                            <option value="TEACHER">Teacher</option>
                            <option value="TRANSPORT">Transport</option>
                            <option value="PARENT">Parent</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="email">{role === 'PARENT' ? 'SR No' : 'Email'}</label>
                        <input
                            type={role === 'PARENT' ? 'text' : 'email'}
                            id="email"
                            className="form-control"
                            placeholder={role === 'PARENT' ? 'Enter SR No' : 'Enter your email'}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            className="form-control"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
