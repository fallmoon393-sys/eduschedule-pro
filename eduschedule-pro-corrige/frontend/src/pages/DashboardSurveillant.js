import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const DashboardSurveillant = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [vacations, setVacations] = useState([]);
    const [cahiers, setCahiers] = useState([]);
    const [pointages, setPointages] = useState([]);
    const [onglet, setOnglet] = useState('dashboard');

    const charger = () => {
        api.get('/vacations.php').then(r => setVacations(r.data)).catch(() => {});
        api.get('/cahiers.php').then(r => setCahiers(r.data)).catch(() => {});
        api.get('/pointages.php').then(r => setPointages(r.data)).catch(() => {});
    };

    useEffect(() => { charger(); }, []);

    const handleValider = async (id) => {
        if (!window.confirm('Valider cette fiche de vacation ?')) return;
        try {
            await api.post(`/vacations.php/${id}?action=valider`, { commentaire: 'Validé par le surveillant' });
            alert('✅ Vacation validée !');
            charger();
        } catch (err) {
            alert('Erreur : ' + (err.response?.data?.error || 'inconnue'));
        }
    };

    const getStatutBadge = (statut) => {
        const map = {
            'brouillon':        { cls: 'bg-secondary', label: 'Brouillon' },
            'signe_delegue':    { cls: 'bg-warning text-dark', label: 'Signé (délégué)' },
            'signe_enseignant': { cls: 'bg-info', label: 'Signé (enseignant)' },
            'cloture':          { cls: 'bg-success', label: '🔒 Clôturé' }
        };
        return map[statut] || { cls: 'bg-secondary', label: statut };
    };

    const vacationsAValider = vacations.filter(v => v.statut === 'generee');
    const cahiersNonClotures = cahiers.filter(c => c.statut !== 'cloture');

    return (
        <div>
            <nav className="navbar navbar-dark bg-danger px-4">
                <span className="navbar-brand fw-bold">EduSchedule Pro</span>
                <div className="d-flex align-items-center gap-3">
                    <span className="text-white">👤 {user?.email}</span>
                    <button className="btn btn-outline-light btn-sm" onClick={() => { logout(); navigate('/login'); }}>
                        Déconnexion
                    </button>
                </div>
            </nav>

            <div className="container-fluid mt-4">
                <ul className="nav nav-tabs mb-4">
                    <li className="nav-item">
                        <button className={`nav-link ${onglet === 'dashboard' ? 'active' : ''}`} onClick={() => setOnglet('dashboard')}>
                            🏠 Tableau de bord
                        </button>
                    </li>
                    <li className="nav-item">
                        <button className={`nav-link ${onglet === 'vacations' ? 'active' : ''}`} onClick={() => setOnglet('vacations')}>
                            💰 Vacations
                            {vacationsAValider.length > 0 && <span className="badge bg-danger ms-1">{vacationsAValider.length}</span>}
                        </button>
                    </li>
                    <li className="nav-item">
                        <button className={`nav-link ${onglet === 'cahiers' ? 'active' : ''}`} onClick={() => setOnglet('cahiers')}>
                            📝 Cahiers
                        </button>
                    </li>
                    <li className="nav-item">
                        <button className={`nav-link ${onglet === 'pointages' ? 'active' : ''}`} onClick={() => setOnglet('pointages')}>
                            📋 Pointages
                        </button>
                    </li>
                </ul>

                {/* DASHBOARD */}
                {onglet === 'dashboard' && (
                    <div>
                        <h4 className="mb-4">Tableau de bord — Surveillant</h4>

                        <div className="row g-3 mb-4">
                            <div className="col-md-3">
                                <div className="card text-white bg-warning">
                                    <div className="card-body">
                                        <h6>Fiches à valider</h6>
                                        <h2>{vacationsAValider.length}</h2>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="card text-white bg-secondary">
                                    <div className="card-body">
                                        <h6>Cahiers non clôturés</h6>
                                        <h2>{cahiersNonClotures.length}</h2>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="card text-white bg-success">
                                    <div className="card-body">
                                        <h6>Pointages valides</h6>
                                        <h2>{pointages.filter(p => p.statut === 'valide').length}</h2>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="card text-white bg-danger">
                                    <div className="card-body">
                                        <h6>Retards</h6>
                                        <h2>{pointages.filter(p => p.statut === 'retard').length}</h2>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {vacationsAValider.length > 0 && (
                            <div className="alert alert-warning">
                                ⚠️ <strong>{vacationsAValider.length} fiche(s) de vacation</strong> en attente de votre validation.
                                <button className="btn btn-sm btn-warning ms-3" onClick={() => setOnglet('vacations')}>Voir →</button>
                            </div>
                        )}

                        {/* Retards du jour */}
                        {pointages.filter(p => p.statut === 'retard').length > 0 && (
                            <div className="alert alert-danger">
                                🚨 <strong>{pointages.filter(p => p.statut === 'retard').length} retard(s)</strong> enregistré(s).
                                <button className="btn btn-sm btn-danger ms-3" onClick={() => setOnglet('pointages')}>Voir →</button>
                            </div>
                        )}
                    </div>
                )}

                {/* VACATIONS */}
                {onglet === 'vacations' && (
                    <div>
                        <h4 className="mb-4">💰 Fiches de vacation à valider</h4>
                        <div className="card">
                            <div className="card-body p-0">
                                <table className="table table-hover mb-0">
                                    <thead className="table-dark">
                                        <tr><th>Enseignant</th><th>Période</th><th>Séances</th><th>Montant brut</th><th>Statut</th><th>Action</th></tr>
                                    </thead>
                                    <tbody>
                                        {vacations.length === 0 ? (
                                            <tr><td colSpan="6" className="text-center text-muted py-3">Aucune fiche</td></tr>
                                        ) : vacations.map(v => (
                                            <tr key={v.id}>
                                                <td>{v.nom} {v.prenom}</td>
                                                <td>{MOIS[v.mois - 1]} {v.annee}</td>
                                                <td>{v.nb_seances || 0}</td>
                                                <td className="fw-bold">{parseFloat(v.montant_brut || 0).toLocaleString()} FCFA</td>
                                                <td>
                                                    <span className={`badge ${v.statut === 'approuvee_comptable' ? 'bg-success' : v.statut === 'validee_surveillant' ? 'bg-primary' : 'bg-warning text-dark'}`}>
                                                        {v.statut === 'generee' ? '📄 Générée' : v.statut === 'validee_surveillant' ? '✅ Validée' : '💰 Approuvée'}
                                                    </span>
                                                </td>
                                                <td>
                                                    {v.statut === 'generee' && (
                                                        <button className="btn btn-sm btn-primary" onClick={() => handleValider(v.id)}>
                                                            ✅ Valider
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* CAHIERS */}
                {onglet === 'cahiers' && (
                    <div>
                        <h4 className="mb-4">📝 Cahiers de texte (lecture seule)</h4>
                        <div className="card">
                            <div className="card-body p-0">
                                <table className="table table-hover mb-0">
                                    <thead className="table-dark">
                                        <tr><th>Date</th><th>Matière</th><th>Classe</th><th>Enseignant</th><th>Titre</th><th>Statut</th></tr>
                                    </thead>
                                    <tbody>
                                        {cahiers.length === 0 ? (
                                            <tr><td colSpan="6" className="text-center text-muted py-3">Aucun cahier</td></tr>
                                        ) : cahiers.map(c => {
                                            const { cls, label } = getStatutBadge(c.statut);
                                            return (
                                                <tr key={c.id}>
                                                    <td>{new Date(c.date_creation).toLocaleDateString('fr-FR')}</td>
                                                    <td>{c.matiere}</td>
                                                    <td>{c.classe}</td>
                                                    <td>{c.enseignant_nom} {c.enseignant_prenom}</td>
                                                    <td>{c.titre_cours}</td>
                                                    <td><span className={`badge ${cls}`}>{label}</span></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* POINTAGES */}
                {onglet === 'pointages' && (
                    <div>
                        <h4 className="mb-4">📋 Pointages des enseignants</h4>
                        <div className="card">
                            <div className="card-body p-0">
                                <table className="table table-hover mb-0">
                                    <thead className="table-dark">
                                        <tr><th>Date</th><th>Matière</th><th>Classe</th><th>Enseignant</th><th>Heure prévue</th><th>Statut</th></tr>
                                    </thead>
                                    <tbody>
                                        {pointages.length === 0 ? (
                                            <tr><td colSpan="6" className="text-center text-muted py-3">Aucun pointage</td></tr>
                                        ) : pointages.map(p => (
                                            <tr key={p.id}>
                                                <td>{new Date(p.created_at).toLocaleDateString('fr-FR')}</td>
                                                <td>{p.matiere}</td>
                                                <td>{p.classe}</td>
                                                <td>{p.enseignant}</td>
                                                <td>{p.heure_debut?.substring(0,5)}</td>
                                                <td>
                                                    <span className={`badge ${p.statut === 'valide' ? 'bg-success' : p.statut === 'retard' ? 'bg-warning text-dark' : 'bg-danger'}`}>
                                                        {p.statut === 'valide' ? '✅ Valide' : p.statut === 'retard' ? '⚠️ Retard' : '❌ Absent'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardSurveillant;