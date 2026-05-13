import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const MOIS_NOMS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const JOURS_SEMAINE = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const JOURS_FORM = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const COULEURS = ['#3498db','#e74c3c','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#34495e'];

const DashboardDelegue = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [cahiers, setCahiers] = useState([]);
    const [creneaux, setCreneaux] = useState([]);
    const [classes, setClasses] = useState([]);
    const [selectedClasse, setSelectedClasse] = useState('');
    const [moisActif, setMoisActif] = useState(new Date().getMonth());
    const [annee, setAnnee] = useState(new Date().getFullYear());

    useEffect(() => {
        api.get('/cahiers.php').then(r => setCahiers(r.data)).catch(() => {});
        api.get('/classes.php').then(r => setClasses(r.data)).catch(() => {});
    }, []);

    useEffect(() => {
        if (selectedClasse) {
            api.get(`/emploi_temps.php?id_classe=${selectedClasse}`)
                .then(r => {
                    if (r.data && r.data.length > 0) {
                        api.get(`/creneaux.php?id_emploi_temps=${r.data[0].id}`)
                            .then(r2 => setCreneaux(r2.data)).catch(() => {});
                    } else setCreneaux([]);
                }).catch(() => {});
        } else setCreneaux([]);
    }, [selectedClasse]);

    const getDaysInMonth = (month, year) => {
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const offset = firstDay === 0 ? 6 : firstDay - 1;
        const days = [];
        for (let i = 0; i < offset; i++) days.push(null);
        for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
        return days;
    };

    const getCreneauxForDay = (date) => {
        if (!date) return [];
        const jourNom = JOURS_FORM[date.getDay() === 0 ? 6 : date.getDay() - 1];
        return creneaux.filter(c => c.jour === jourNom);
    };

    const getCouleurMatiere = (id_matiere) => COULEURS[(id_matiere - 1) % COULEURS.length];

    const today = new Date();
    const days = getDaysInMonth(moisActif, annee);
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

    return (
        <div>
            <nav className="navbar navbar-dark bg-info px-4">
                <span className="navbar-brand fw-bold">EduSchedule Pro</span>
                <div className="d-flex align-items-center gap-3">
                    <span className="text-white">👤 {user?.email}</span>
                    <button className="btn btn-outline-light btn-sm" onClick={() => { logout(); navigate('/login'); }}>
                        Déconnexion
                    </button>
                </div>
            </nav>

            <div className="container-fluid mt-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h4>Tableau de bord — Délégué</h4>
                    <button className="btn btn-info text-white" onClick={() => navigate('/cahier-texte')}>
                        📝 Cahier de texte
                    </button>
                </div>

                {/* KPIs */}
                <div className="row g-3 mb-4">
                    <div className="col-md-3">
                        <div className="card text-white bg-info">
                            <div className="card-body">
                                <h6 className="card-title">Total cahiers</h6>
                                <h2>{cahiers.length}</h2>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card text-white bg-warning">
                            <div className="card-body">
                                <h6 className="card-title">En attente signature</h6>
                                <h2>{cahiers.filter(c => c.statut === 'brouillon').length}</h2>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card text-white bg-primary">
                            <div className="card-body">
                                <h6 className="card-title">Signés</h6>
                                <h2>{cahiers.filter(c => c.statut === 'signe_delegue' || c.statut === 'signe_enseignant').length}</h2>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card text-white bg-success">
                            <div className="card-body">
                                <h6 className="card-title">Clôturés</h6>
                                <h2>{cahiers.filter(c => c.statut === 'cloture').length}</h2>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filtres */}
                <div className="card mb-4">
                    <div className="card-body">
                        <div className="row g-3 align-items-end">
                            <div className="col-md-4">
                                <label className="form-label fw-bold">Classe</label>
                                <select className="form-select" value={selectedClasse}
                                    onChange={e => setSelectedClasse(e.target.value)}>
                                    <option value="">-- Choisir une classe --</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.libelle}</option>)}
                                </select>
                            </div>
                            <div className="col-md-4">
                                <label className="form-label fw-bold">Année</label>
                                <div className="d-flex gap-2 align-items-center">
                                    <button className="btn btn-outline-secondary btn-sm" onClick={() => setAnnee(a => a - 1)}>◀</button>
                                    <span className="fw-bold fs-5">{annee}</span>
                                    <button className="btn btn-outline-secondary btn-sm" onClick={() => setAnnee(a => a + 1)}>▶</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Calendrier */}
                <div className="card mb-4">
                    <div className="card-header bg-white d-flex justify-content-between align-items-center">
                        <button className="btn btn-outline-primary btn-sm" onClick={() => {
                            if (moisActif === 0) { setMoisActif(11); setAnnee(a => a - 1); }
                            else setMoisActif(m => m - 1);
                        }}>◀ Précédent</button>
                        <h5 className="mb-0 fw-bold">{MOIS_NOMS[moisActif]} {annee}</h5>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => {
                            if (moisActif === 11) { setMoisActif(0); setAnnee(a => a + 1); }
                            else setMoisActif(m => m + 1);
                        }}>Suivant ▶</button>
                    </div>
                    <div className="card-body p-0">
                        <table className="table table-bordered mb-0">
                            <thead className="table-dark">
                                <tr>{JOURS_SEMAINE.map(j => <th key={j} className="text-center py-2">{j}</th>)}</tr>
                            </thead>
                            <tbody>
                                {weeks.map((week, wi) => (
                                    <tr key={wi}>
                                        {week.map((date, di) => {
                                            const isToday = date && date.toDateString() === today.toDateString();
                                            const creneauxDuJour = getCreneauxForDay(date);
                                            return (
                                                <td key={di} style={{ minHeight: '100px', verticalAlign: 'top', backgroundColor: isToday ? '#fff3cd' : date ? 'white' : '#f8f9fa' }}>
                                                    {date && (
                                                        <>
                                                            <div className={`fw-bold mb-1 ${isToday ? 'text-warning' : 'text-muted'}`} style={{fontSize: '0.85rem'}}>
                                                                {isToday ? '⭐ ' : ''}{date.getDate()}
                                                            </div>
                                                            {creneauxDuJour.map((c, i) => (
                                                                <div key={i} className="rounded px-1 mb-1"
                                                                    style={{backgroundColor: getCouleurMatiere(c.id_matiere), color: 'white', fontSize: '0.7rem'}}>
                                                                    <div className="fw-bold">{c.heure_debut?.substring(0,5)} {c.matiere}</div>
                                                                    <div>{c.enseignant}</div>
                                                                    <div>🏫 {c.salle}</div>
                                                                </div>
                                                            ))}
                                                        </>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Derniers cahiers */}
                <div className="card">
                    <div className="card-header bg-white d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">Derniers cahiers de texte</h5>
                        <button className="btn btn-sm btn-info text-white" onClick={() => navigate('/cahier-texte')}>
                            Voir tout →
                        </button>
                    </div>
                    <div className="card-body">
                        {cahiers.length === 0 ? (
                            <p className="text-muted">Aucun cahier pour le moment.</p>
                        ) : (
                            <table className="table table-hover">
                                <thead>
                                    <tr><th>Matière</th><th>Titre</th><th>Date</th><th>Statut</th></tr>
                                </thead>
                                <tbody>
                                    {cahiers.slice(0, 5).map(c => (
                                        <tr key={c.id}>
                                            <td>{c.matiere}</td>
                                            <td>{c.titre_cours}</td>
                                            <td>{new Date(c.date_creation).toLocaleDateString('fr-FR')}</td>
                                            <td>
                                                <span className={`badge ${
                                                    c.statut === 'cloture' ? 'bg-success' :
                                                    c.statut === 'signe_enseignant' ? 'bg-info' :
                                                    c.statut === 'signe_delegue' ? 'bg-warning text-dark' : 'bg-secondary'
                                                }`}>
                                                    {c.statut === 'brouillon' ? 'Brouillon' :
                                                     c.statut === 'signe_delegue' ? 'Signé (délégué)' :
                                                     c.statut === 'signe_enseignant' ? 'Signé (enseignant)' : 'Clôturé'}
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