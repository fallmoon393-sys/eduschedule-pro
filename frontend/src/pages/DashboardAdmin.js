import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const DashboardAdmin = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [classes, setClasses] = useState([]);
    const [enseignants, setEnseignants] = useState([]);
    const [matieres, setMatieres] = useState([]);

    useEffect(() => {
        api.get('/classes.php').then(res => setClasses(res.data));
        api.get('/enseignants.php').then(res => setEnseignants(res.data));
        api.get('/matieres.php').then(res => setMatieres(res.data));
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div>
            {/* Navbar */}
            <nav className="navbar navbar-dark bg-primary px-4">
                <span className="navbar-brand fw-bold">EduSchedule Pro</span>
                <div className="d-flex align-items-center gap-3">
                    <span className="text-white">👤 {user?.email}</span>
                    <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
                        Déconnexion
                    </button>
                </div>
            </nav>

            <div className="container mt-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
    <h4>Tableau de bord — Administrateur</h4>
    <div className="d-flex gap-2">
        <button className="btn btn-primary" onClick={() => navigate('/emploi-temps')}>
    📅 Emploi du temps
</button>
<button className="btn btn-success" onClick={() => navigate('/qrcode')}>
    📱 QR Codes
</button>
    </div>
</div>

                {/* KPIs */}
                <div className="row g-3 mb-4">
                    <div className="col-md-4">
                        <div className="card text-white bg-primary">
                            <div className="card-body">
                                <h6 className="card-title">Classes</h6>
                                <h2>{classes.length}</h2>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="card text-white bg-success">
                            <div className="card-body">
                                <h6 className="card-title">Enseignants</h6>
                                <h2>{enseignants.length}</h2>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="card text-white bg-warning">
                            <div className="card-body">
                                <h6 className="card-title">Matières</h6>
                                <h2>{matieres.length}</h2>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Liste des enseignants */}
                <div className="card">
                    <div className="card-header bg-white">
                        <h5 className="mb-0">Liste des enseignants</h5>
                    </div>
                    <div className="card-body">
                        <table className="table table-hover">
                            <thead>
                                <tr>
                                    <th>Nom</th>
                                    <th>Prénom</th>
                                    <th>Spécialité</th>
                                    <th>Statut</th>
                                    <th>Taux horaire</th>
                                </tr>
                            </thead>
                            <tbody>
                                {enseignants.map(e => (
                                    <tr key={e.id}>
                                        <td>{e.nom}</td>
                                        <td>{e.prenom}</td>
                                        <td>{e.specialite}</td>
                                        <td>
                                            <span className={`badge ${e.statut === 'permanent' ? 'bg-success' : 'bg-warning'}`}>
                                                {e.statut}
                                            </span>
                                        </td>
                                        <td>{e.taux_horaire} FCFA/h</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardAdmin;