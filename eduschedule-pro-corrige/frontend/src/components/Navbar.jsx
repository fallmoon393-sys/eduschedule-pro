import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const COULEURS = {
    admin:       'bg-primary',
    enseignant:  'bg-success',
    delegue:     'bg-info',
    surveillant: 'bg-danger',
    comptable:   'bg-dark',
};

const Navbar = ({ liens = [] }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const couleur = COULEURS[user?.role] || 'bg-primary';

    return (
        <nav className={`navbar navbar-dark ${couleur} px-4`}>
            <span className="navbar-brand fw-bold">EduSchedule Pro</span>

            {liens.length > 0 && (
                <div className="d-flex gap-2">
                    {liens.map((lien, i) => (
                        <button
                            key={i}
                            className="btn btn-outline-light btn-sm"
                            onClick={() => navigate(lien.path)}
                        >
                            {lien.label}
                        </button>
                    ))}
                </div>
            )}

            <div className="d-flex align-items-center gap-3">
                <span className="text-white">👤 {user?.email}</span>
                <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
                    Déconnexion
                </button>
            </div>
        </nav>
    );
};

export default Navbar;