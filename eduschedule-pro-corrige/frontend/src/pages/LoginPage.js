import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const user = await login(email, password);
            if (user.role === 'admin') navigate('/dashboard/admin');
            else if (user.role === 'enseignant') navigate('/dashboard/enseignant');
            else if (user.role === 'delegue') navigate('/dashboard/delegue');
            else if (user.role === 'surveillant') navigate('/dashboard/surveillant');
            else if (user.role === 'comptable') navigate('/dashboard/comptable');
            else navigate('/dashboard');
        } catch (err) {
            setError('Email ou mot de passe incorrect');
        }
        setLoading(false);
    };

    return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
            <div className="card shadow p-4" style={{ width: '400px' }}>
                <div className="text-center mb-4">
                    <h2 className="text-primary fw-bold">EduSchedule Pro</h2>
                    <p className="text-muted">Connectez-vous à votre compte</p>
                </div>
                {error && <div className="alert alert-danger">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            className="form-control"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="votre@email.com"
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Mot de passe</label>
                        <input
                            type="password"
                            className="form-control"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn btn-primary w-100"
                        disabled={loading}
                    >
                        {loading ? 'Connexion...' : 'Se connecter'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;