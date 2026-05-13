import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { exportVacation } from '../utils/exportPDF';

const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const getStatutInfo = (statut) => {
    const map = {
        'generee':              { cls: 'bg-warning text-dark', label: '📄 Générée' },
        'validee_surveillant':  { cls: 'bg-primary',           label: '✅ Validée (surveillant)' },
        'approuvee_comptable':  { cls: 'bg-success',           label: '💰 Approuvée (comptable)' }
    };
    return map[statut] || { cls: 'bg-secondary', label: statut };
};

const VacationsPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [vacations, setVacations] = useState([]);
    const [enseignants, setEnseignants] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [selectedVacation, setSelectedVacation] = useState(null);
    const [showDetail, setShowDetail] = useState(false);
    const [newVacation, setNewVacation] = useState({
        id_enseignant: '', mois: '', annee: new Date().getFullYear()
    });
    const [loading, setLoading] = useState(false);
    const [selectedEnseignantFilter, setSelectedEnseignantFilter] = useState('');

    const charger = () => {
        api.get('/vacations.php').then(r => setVacations(r.data)).catch(() => {});
    };

    useEffect(() => {
        charger();
        api.get('/enseignants.php').then(r => setEnseignants(r.data)).catch(() => {});
    }, []);

    const handleGenerer = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post('/vacations.php?action=generer', newVacation);
            alert(`✅ Fiche générée !\n${res.data.nb_seances} séance(s) — ${res.data.montant_brut?.toLocaleString()} FCFA`);
            setShowForm(false);
            charger();
        } catch (err) {
            alert('Erreur : ' + (err.response?.data?.error || 'inconnue'));
        }
        setLoading(false);
    };

    const handleValider = async (id) => {
        if (!window.confirm('Valider cette fiche de vacation ?')) return;
        try {
            await api.post(`/vacations.php/${id}?action=valider`, { commentaire: 'Validé' });
            alert('✅ Vacation validée par le surveillant !');
            charger();
        } catch (err) {
            alert('Erreur : ' + (err.response?.data?.error || 'inconnue'));
        }
    };

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

    const handleVoir = async (vacation) => {
        try {
            const res = await api.get(`/vacations.php/${vacation.id}`);
            setSelectedVacation(res.data);
            setShowDetail(true);
            window.scrollTo(0, 0);
        } catch (err) {
            alert('Erreur lors du chargement du détail');
        }
    };

    const totalBrut = vacations.reduce((s, v) => s + parseFloat(v.montant_brut || 0), 0);
    const totalNet  = vacations.reduce((s, v) => s + parseFloat(v.montant_net || 0), 0);

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
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h4>💰 Gestion des Vacations</h4>
                    <div className="d-flex gap-2">
                        <button className="btn btn-secondary" onClick={() => navigate('/dashboard/admin')}>← Retour</button>
                        {(user?.role === 'admin' || user?.role === 'comptable') && (
                            <button className="btn btn-dark" onClick={() => setShowForm(!showForm)}>+ Générer une fiche</button>
                        )}
                    </div>
                </div>

                {/* KPIs */}
                <div className="row g-3 mb-4">
                    <div className="col-md-3">
                        <div className="card text-white bg-warning">
                            <div className="card-body">
                                <h6>Générées</h6>
                                <h2>{vacations.filter(v => v.statut === 'generee').length}</h2>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card text-white bg-primary">
                            <div className="card-body">
                                <h6>Validées (surveillant)</h6>
                                <h2>{vacations.filter(v => v.statut === 'validee_surveillant').length}</h2>
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
                        <div className="card text-white bg-dark">
                            <div className="card-body">
                                <h6>Total net à payer</h6>
                                <h5>{totalNet.toLocaleString()} FCFA</h5>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Formulaire génération */}
                {showForm && (
                    <div className="card mb-4">
                        <div className="card-header bg-dark text-white">
                            <h5 className="mb-0">Générer une fiche de vacation</h5>
                        </div>
                        <div className="card-body">
                            <div className="alert alert-info">
                                ℹ️ La fiche est générée automatiquement à partir des cahiers de texte <strong>clôturés</strong> du mois sélectionné.
                            </div>
                            <form onSubmit={handleGenerer}>
                                <div className="row g-3">
                                    <div className="col-md-4">
                                        <label className="form-label">Enseignant</label>
                                        <select className="form-select" required
                                            value={newVacation.id_enseignant}
                                            onChange={e => setNewVacation({...newVacation, id_enseignant: e.target.value})}>
                                            <option value="">Sélectionner</option>
                                            {enseignants.map(e => (
                                                <option key={e.id} value={e.id}>{e.nom} {e.prenom} — {parseFloat(e.taux_horaire || 0).toLocaleString()} FCFA/h</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label">Mois</label>
                                        <select className="form-select" required
                                            value={newVacation.mois}
                                            onChange={e => setNewVacation({...newVacation, mois: e.target.value})}>
                                            <option value="">Sélectionner</option>
                                            {MOIS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label">Année</label>
                                        <input type="number" className="form-control" required
                                            value={newVacation.annee}
                                            onChange={e => setNewVacation({...newVacation, annee: e.target.value})} />
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <button type="submit" className="btn btn-success me-2" disabled={loading}>
                                        {loading ? '⏳ Génération...' : '✅ Générer'}
                                    </button>
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Détail d'une vacation */}
                {showDetail && selectedVacation && (
                    <div className="card mb-4 border-dark">
                        <div className="card-header bg-dark text-white d-flex justify-content-between">
                            <h5 className="mb-0">📄 Fiche de vacation — {selectedVacation.nom} {selectedVacation.prenom}</h5>
                            <button className="btn btn-sm btn-outline-light" onClick={() => setShowDetail(false)}>✕ Fermer</button>
                        </div>
                        <div className="card-body">
                            <div className="row mb-3">
                                <div className="col-md-4">
                                    <p><strong>Enseignant :</strong> {selectedVacation.nom} {selectedVacation.prenom}</p>
                                    <p><strong>Période :</strong> {MOIS[selectedVacation.mois - 1]} {selectedVacation.annee}</p>
                                    <p><strong>Taux horaire :</strong> {parseFloat(selectedVacation.taux_horaire || 0).toLocaleString()} FCFA/h</p>
                                </div>
                                <div className="col-md-4">
                                    <p><strong>Montant brut :</strong> <span className="fw-bold">{parseFloat(selectedVacation.montant_brut || 0).toLocaleString()} FCFA</span></p>
                                    <p><strong>Montant net :</strong> <span className="fw-bold text-success">{parseFloat(selectedVacation.montant_net || 0).toLocaleString()} FCFA</span></p>
                                    <p><strong>Statut :</strong> <span className={`badge ${getStatutInfo(selectedVacation.statut).cls}`}>{getStatutInfo(selectedVacation.statut).label}</span></p>
                                </div>
                            </div>
                            {selectedVacation.lignes?.length > 0 && (
                                <>
                                    <h6 className="fw-bold mb-2">Détail des séances :</h6>
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
                                                <td colSpan="4" className="text-end fw-bold">Total brut :</td>
                                                <td className="fw-bold">{parseFloat(selectedVacation.montant_brut || 0).toLocaleString()} FCFA</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Liste des vacations */}
                <div className="card mb-3">
                    <div className="card-body py-2">
                        <div className="row g-2 align-items-end">
                            <div className="col-md-4">
                                <label className="form-label fw-bold mb-1">Filtrer par enseignant</label>
                                <select className="form-select form-select-sm" value={selectedEnseignantFilter}
                                    onChange={e => setSelectedEnseignantFilter(e.target.value)}>
                                    <option value="">-- Tous les enseignants --</option>
                                    {enseignants.map(e => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header bg-white">
                        <h5 className="mb-0">Toutes les fiches de vacation</h5>
                    </div>
                    <div className="card-body p-0">
                        {vacations.length === 0 ? (
                            <p className="text-muted p-3">Aucune fiche de vacation pour le moment.</p>
                        ) : (
                            <table className="table table-hover mb-0">
                                <thead className="table-dark">
                                    <tr>
                                        <th>Enseignant</th>
                                        <th>Période</th>
                                        <th>Séances</th>
                                        <th>Montant brut</th>
                                        <th>Montant net</th>
                                        <th>Statut</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(selectedEnseignantFilter 
                            ? vacations.filter(v => String(v.id_enseignant) === String(selectedEnseignantFilter))
                            : vacations).map(v => {
                                        const { cls, label } = getStatutInfo(v.statut);
                                        return (
                                            <tr key={v.id}>
                                                <td>{v.nom} {v.prenom}</td>
                                                <td>{MOIS[v.mois - 1]} {v.annee}</td>
                                                <td>{v.nb_seances || 0}</td>
                                                <td>{parseFloat(v.montant_brut || 0).toLocaleString()} FCFA</td>
                                                <td className="fw-bold text-success">{parseFloat(v.montant_net || 0).toLocaleString()} FCFA</td>
                                                <td><span className={`badge ${cls}`}>{label}</span></td>
                                                <td>
                                                    <button className="btn btn-sm btn-outline-dark me-1" onClick={() => handleVoir(v)}>
                                                        👁️ Détail
                                                    </button>
                                                    <button className="btn btn-sm btn-danger me-1" onClick={async () => {
                                                        const res = await api.get(`/vacations.php/${v.id}`);
                                                        exportVacation(res.data);
                                                    }}>
                                                        📄 PDF
                                                    </button>
                                                    {v.statut === 'generee' && (user?.role === 'surveillant' || user?.role === 'admin') && (
                                                        <button className="btn btn-sm btn-primary me-1" onClick={() => handleValider(v.id)}>
                                                            ✅ Valider
                                                        </button>
                                                    )}
                                                    {v.statut === 'validee_surveillant' && (user?.role === 'comptable' || user?.role === 'admin') && (
                                                        <button className="btn btn-sm btn-success" onClick={() => handleApprouver(v.id)}>
                                                            💰 Approuver
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
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
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VacationsPage;