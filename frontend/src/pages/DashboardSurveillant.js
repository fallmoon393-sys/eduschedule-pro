import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const DashboardSurveillant = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [vacations, setVacations] = useState([]);
    const [cahiers, setCahiers] = useState([]);

    useEffect(() => {
        api.get('/vacations.php').then(res => setVacations(res.data));
        api.get('/cahiers.php').then(res => setCahiers(res.data));
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div>
            <nav className="navbar navbar-dark bg-danger px-4">
                <span className="navbar-brand fw-bold">EduSchedule Pro</span>
                <div className="d-flex align-items-center gap-3">
                    <span className="text-white">👤 {user?.email}</span>
                    <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
                        Déconnexion
                    </button>
                </div>
            </nav>

            <div className="container mt-4">
                <h4 className="mb-4">Tableau de bord — Surveillant</h4>

                <div className="row g-3 mb-4">
                    <div className="col-md-6">
                        <div className="card text-white bg-danger">
                            <div className="card-body">
                                <h6 className="card-title">Fiches à valider</h6>
                                <h2>{vacations.filter(v => v.statut === 'generee').length}</h2>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="card text-white bg-secondary">
                            <div className="card-body">
                                <h6 className="card-title">Cahiers à contrôler</h6>
                                <h2>{cahiers.filter(c => c.statut !== 'cloture').length}</h2>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Liste des vacations */}
                <div className="card">
                    <div className="card-header bg-white">
                        <h5 className="mb-0">Fiches de vacation à valider</h5>
                    </div>
                    <div className="card-body">
                        {vacations.length === 0 ? (
                            <p className="text-muted">Aucune fiche de vacation pour le moment.</p>
                        ) : (
                            <table className="table table-hover">
                                <thead>
                                    <tr>
                                        <th>Enseignant</th>
                                        <th>Mois</th>
                                        <th>Année</th>
                                        <th>Montant brut</th>
                                        <th>Statut</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vacations.map(v => (
                                        <tr key={v.id}>
                                            <td>{v.nom} {v.prenom}</td>
                                            <td>{v.mois}</td>
                                            <td>{v.annee}</td>
                                            <td>{v.montant_brut} FCFA</td>
                                            <td>
                                                <span className={`badge ${v.statut === 'approuvee_comptable' ? 'bg-success' : v.statut === 'validee_surveillant' ? 'bg-primary' : 'bg-warning'}`}>
                                                    {v.statut}
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

export default DashboardSurveillant;