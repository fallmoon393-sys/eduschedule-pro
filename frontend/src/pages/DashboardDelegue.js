import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const DashboardDelegue = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [cahiers, setCahiers] = useState([]);

    useEffect(() => {
        api.get('/cahiers.php').then(res => setCahiers(res.data));
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div>
            {/* Navbar */}
            <nav className="navbar navbar-dark bg-info px-4">
                <span className="navbar-brand fw-bold">EduSchedule Pro</span>
                <div className="d-flex align-items-center gap-3">
                    <span className="text-white">👤 {user?.email}</span>
                    <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
                        Déconnexion
                    </button>
                </div>
            </nav>

            <div className="container mt-4">
                <h4 className="mb-4"><div className="d-flex justify-content-between align-items-center mb-4">
    <h4>Tableau de bord — Délégué</h4>
    <button className="btn btn-info text-white" onClick={() => navigate('/cahier-texte')}>
        📝 Cahier de texte
    </button>
</div></h4>

                {/* KPIs */}
                <div className="row g-3 mb-4">
                    <div className="col-md-6">
                        <div className="card text-white bg-info">
                            <div className="card-body">
                                <h6 className="card-title">Cahiers de texte</h6>
                                <h2>{cahiers.length}</h2>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="card text-white bg-warning">
                            <div className="card-body">
                                <h6 className="card-title">En attente de signature</h6>
                                <h2>{cahiers.filter(c => c.statut === 'brouillon').length}</h2>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Liste des cahiers */}
                <div className="card">
                    <div className="card-header bg-white">
                        <h5 className="mb-0">Mes cahiers de texte</h5>
                    </div>
                    <div className="card-body">
                        {cahiers.length === 0 ? (
                            <p className="text-muted">Aucun cahier de texte pour le moment.</p>
                        ) : (
                            <table className="table table-hover">
                                <thead>
                                    <tr>
                                        <th>Matière</th>
                                        <th>Enseignant</th>
                                        <th>Titre</th>
                                        <th>Statut</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cahiers.map(c => (
                                        <tr key={c.id}>
                                            <td>{c.matiere}</td>
                                            <td>{c.enseignant_nom} {c.enseignant_prenom}</td>
                                            <td>{c.titre_cours}</td>
                                            <td>
                                                <span className={`badge ${c.statut === 'cloture' ? 'bg-success' : c.statut === 'signe_delegue' ? 'bg-warning' : 'bg-secondary'}`}>
                                                    {c.statut}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardDelegue;