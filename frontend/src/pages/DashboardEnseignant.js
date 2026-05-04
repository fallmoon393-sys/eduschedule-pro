import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const DashboardEnseignant = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [vacations, setVacations] = useState([]);

    useEffect(() => {
        api.get('/vacations.php').then(res => setVacations(res.data));
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div>
            {/* Navbar */}
            <nav className="navbar navbar-dark bg-success px-4">
                <span className="navbar-brand fw-bold">EduSchedule Pro</span>
                <div className="d-flex align-items-center gap-3">
                    <span className="text-white">👤 {user?.email}</span>
                    <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
                        Déconnexion
                    </button>
                </div>
            </nav>

            <div className="container mt-4">
                <h4 className="mb-4">Tableau de bord — Enseignant</h4>

                {/* KPIs */}
                <div className="row g-3 mb-4">
                    <div className="col-md-6">
                        <div className="card text-white bg-success">
                            <div className="card-body">
                                <h6 className="card-title">Mes fiches de vacation</h6>
                                <h2>{vacations.length}</h2>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="card text-white bg-primary">
                            <div className="card-body">
                                <h6 className="card-title">Statut</h6>
                                <h5>Enseignant actif</h5>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Fiches de vacation */}
                <div className="card">
                    <div className="card-header bg-white">
                        <h5 className="mb-0">Mes fiches de vacation</h5>
                    </div>
                    <div className="card-body">
                        {vacations.length === 0 ? (
                            <p className="text-muted">Aucune fiche de vacation pour le moment.</p>
                        ) : (
                            <table className="table table-hover">
                                <thead>
                                    <tr>
                                        <th>Mois</th>
                                        <th>Année</th>
                                        <th>Montant brut</th>
                                        <th>Montant net</th>
                                        <th>Statut</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vacations.map(v => (
                                        <tr key={v.id}>
                                            <td>{v.mois}</td>
                                            <td>{v.annee}</td>
                                            <td>{v.montant_brut} FCFA</td>
                                            <td>{v.montant_net} FCFA</td>
                                            <td>
                                                <span className="badge bg-info">{v.statut}</span>
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

export default DashboardEnseignant;