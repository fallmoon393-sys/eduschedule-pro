import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { exportVacation } from '../utils/exportPDF';

const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const DashboardComptable = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [vacations, setVacations] = useState([]);
    const [onglet, setOnglet] = useState('dashboard');
    const [selectedVacation, setSelectedVacation] = useState(null);
    const [showDetail, setShowDetail] = useState(false);

    const charger = () => {
        api.get('/vacations.php').then(r => setVacations(r.data)).catch(() => {});
    };

    useEffect(() => { charger(); }, []);

    const handleApprouver = async (id) => {
        const retenues = prompt('Retenues éventuelles (FCFA) :', '0');
        if (retenues === null) return;
        try {
            await api.post(`/vacations.php/${id}?action=approuver`, {
                retenues: parseFloat(retenues) || 0,
                commentaire: 'Approuvé par le comptable'
            });
            alert('✅ Vacation approuvée et bon de paiement émis !');
            charger();
        } catch (err) {
            alert('Erreur : ' + (err.response?.data?.error || 'inconnue'));
        }
    };

    const handleGenerer = async (e) => {
        e.preventDefault();
        const form = e.target;
        try {
            const res = await api.post('/vacations.php?action=generer', {
                id_enseignant: form.id_enseignant.value,
                mois: form.mois.value,
                annee: form.annee.value
            });
            alert(`✅ Fiche générée !\n${res.data.nb_seances} séance(s) — ${res.data.montant_brut?.toLocaleString()} FCFA`);
            charger();
        } catch (err) {
            alert('Erreur : ' + (err.response?.data?.error || 'inconnue'));
        }
    };

    const handleVoir = async (vacation) => {
        try {
            const res = await api.get(`/vacations.php/${vacation.id}`);
            setSelectedVacation(res.data);
            setShowDetail(true);
            window.scrollTo(0, 0);
        } catch (err) {
            alert('Erreur chargement détail');
        }
    };

    const totalBrut = vacations.reduce((s, v) => s + parseFloat(v.montant_brut || 0), 0);
    const totalNet  = vacations.reduce((s, v) => s + parseFloat(v.montant_net || 0), 0);
    const aApprouver = vacations.filter(v => v.statut === 'validee_surveillant');

    return (
        <div>
            <nav className="navbar navbar-dark bg-dark px-4">
                <span className="navbar-brand fw-bold">EduSchedule Pro</span>
                <div className="d-flex align-items-center gap-3">
                    <span className="text-white">👤 {user?.email}</span>
                    <button className="btn btn-outline-light btn-sm" onClick={() => { logout(); navigate('/login'); }}>Déconnexion</button>
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
                            {aApprouver.length > 0 && <span className="badge bg-danger ms-1">{aApprouver.length}</span>}
                        </button>
                    </li>
                </ul>

                {/* DASHBOARD */}
                {onglet === 'dashboard' && (
                    <div>
                        <h4 className="mb-4">Tableau de bord — Comptable</h4>

                        <div className="row g-3 mb-4">
                            <div className="col-md-3">
                                <div className="card text-white bg-warning">
                                    <div className="card-body">
                                        <h6>À approuver</h6>
                                        <h2>{aApprouver.length}</h2>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="card text-white bg-success">
                                    <div className="card-body">
                                        <h6>Approuvées</h6>
                                        <h2>{vacations.filter(v => v.statut === 'approuvee_comptable').length}</h2>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="card text-white bg-primary">
                                    <div className="card-body">
                                        <h6>Total brut</h6>
                                        <h5>{totalBrut.toLocaleString()} FCFA</h5>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="card text-white bg-dark">
                                    <div className="card-body">
                                        <h6>Total net à payer</h6>
                                        <h5>{totalNet.toLocaleString()} FCFA</h5>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {aApprouver.length > 0 && (
                            <div className="alert alert-warning">
                                ⚠️ <strong>{aApprouver.length} fiche(s)</strong> validées par le surveillant en attente de votre approbation.
                                <button className="btn btn-sm btn-warning ms-3" onClick={() => setOnglet('vacations')}>Voir →</button>
                            </div>
                        )}
                    </div>
                )}

                {/* VACATIONS */}
                {onglet === 'vacations' && (
                    <div>
                        <h4 className="mb-4">💰 Fiches de vacation</h4>

                        {/* Détail */}
                        {showDetail && selectedVacation && (
                            <div className="card mb-4 border-dark">
                                <div className="card-header bg-dark text-white d-flex justify-content-between">
                                    <h5 className="mb-0">📄 {selectedVacation.nom} {selectedVacation.prenom} — {MOIS[selectedVacation.mois - 1]} {selectedVacation.annee}</h5>
                                    <button className="btn btn-sm btn-outline-light" onClick={() => setShowDetail(false)}>✕</button>
                                </div>
                                <div className="card-body">
                                    <div className="row mb-3">
                                        <div className="col-md-6">
                                            <p><strong>Taux horaire :</strong> {parseFloat(selectedVacation.taux_horaire || 0).toLocaleString()} FCFA/h</p>
                                            <p><strong>Montant brut :</strong> <span className="fw-bold">{parseFloat(selectedVacation.montant_brut || 0).toLocaleString()} FCFA</span></p>
                                            <p><strong>Montant net :</strong> <span className="fw-bold text-success">{parseFloat(selectedVacation.montant_net || 0).toLocaleString()} FCFA</span></p>
                                        </div>
                                    </div>
                                    {selectedVacation.lignes?.length > 0 && (
                                        <table className="table table-sm table-bordered">
                                            <thead className="table-dark">
                                                <tr><th>Matière</th><th>Classe</th><th>Durée</th><th>Taux</th><th>Montant</th></tr>
                                            </thead>
                                            <tbody>
                                                {selectedVacation.lignes.map((l, i) => (
                                                    <tr key={i}>
                                                        <td>{l.matiere}</td>
                                                        <td>{l.classe}</td>
                                                        <td>{parseFloat(l.duree_heures || 0).toFixed(1)}h</td>
                                                        <td>{parseFloat(l.taux || 0).toLocaleString()} FCFA/h</td>
                                                        <td className="fw-bold">{parseFloat(l.montant || 0).toLocaleString()} FCFA</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr className="table-dark">
                                                    <td colSpan="4" className="text-end fw-bold">Total :</td>
                                                    <td className="fw-bold">{parseFloat(selectedVacation.montant_brut || 0).toLocaleString()} FCFA</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="card">
                            <div className="card-body p-0">
                                <table className="table table-hover mb-0">
                                    <thead className="table-dark">
                                        <tr><th>Enseignant</th><th>Période</th><th>Séances</th><th>Montant brut</th><th>Montant net</th><th>Statut</th><th>Actions</th></tr>
                                    </thead>
                                    <tbody>
                                        {vacations.length === 0 ? (
                                            <tr><td colSpan="7" className="text-center text-muted py-3">Aucune fiche</td></tr>
                                        ) : vacations.map(v => (
                                            <tr key={v.id}>
                                                <td>{v.nom} {v.prenom}</td>
                                                <td>{MOIS[v.mois - 1]} {v.annee}</td>
                                                <td>{v.nb_seances || 0}</td>
                                                <td>{parseFloat(v.montant_brut || 0).toLocaleString()} FCFA</td>
                                                <td className="fw-bold text-success">{parseFloat(v.montant_net || 0).toLocaleString()} FCFA</td>
                                                <td>
                                                    <span className={`badge ${v.statut === 'approuvee_comptable' ? 'bg-success' : v.statut === 'validee_surveillant' ? 'bg-primary' : 'bg-warning text-dark'}`}>
                                                        {v.statut === 'generee' ? '📄 Générée' : v.statut === 'validee_surveillant' ? '✅ Validée' : '💰 Approuvée'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button className="btn btn-sm btn-outline-dark me-1" onClick={() => handleVoir(v)}>👁️</button>
                                                    <button className="btn btn-sm btn-danger me-1" onClick={async () => {
                                                        const res = await api.get(`/vacations.php/${v.id}`);
                                                        exportVacation(res.data);
                                                    }}>📄</button>
                                                    {v.statut === 'validee_surveillant' && (
                                                        <button className="btn btn-sm btn-success" onClick={() => handleApprouver(v.id)}>
                                                            💰 Approuver
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="table-secondary">
                                        <tr>
                                            <td colSpan="3" className="fw-bold text-end">Totaux :</td>
                                            <td className="fw-bold">{totalBrut.toLocaleString()} FCFA</td>
                                            <td className="fw-bold text-success">{totalNet.toLocaleString()} FCFA</td>
                                            <td colSpan="2"></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardComptable;