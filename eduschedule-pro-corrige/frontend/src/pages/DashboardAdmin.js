import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const MOIS_NOMS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const JOURS_SEMAINE = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
const JOURS_FORM = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
const COULEURS = ['#3498db','#e74c3c','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#34495e'];

const DashboardAdmin = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({ classes: 0, enseignants: 0, matieres: 0, salles: 0 });
    const [creneaux, setCreneaux] = useState([]);
    const [classes, setClasses] = useState([]);
    const [enseignants, setEnseignants] = useState([]);
    const [pointages, setPointages] = useState([]);
    const [cahiers, setCahiers] = useState([]);
    const [vacations, setVacations] = useState([]);
    const [selectedClasse, setSelectedClasse] = useState('');
    const [selectedEnseignant, setSelectedEnseignant] = useState('');
    const [moisActif, setMoisActif] = useState(new Date().getMonth());
    const [annee, setAnnee] = useState(new Date().getFullYear());

    useEffect(() => {
        api.get('/classes.php').then(r => { setClasses(r.data); setStats(s => ({...s, classes: r.data.length})); }).catch(() => {});
        api.get('/enseignants.php').then(r => { setEnseignants(r.data); setStats(s => ({...s, enseignants: r.data.length})); }).catch(() => {});
        api.get('/matieres.php').then(r => setStats(s => ({...s, matieres: r.data.length}))).catch(() => {});
        api.get('/salles.php').then(r => setStats(s => ({...s, salles: r.data.length}))).catch(() => {});
        api.get('/pointages.php').then(r => setPointages(r.data)).catch(() => {});
        api.get('/cahiers.php').then(r => setCahiers(r.data)).catch(() => {});
        api.get('/vacations.php').then(r => setVacations(r.data)).catch(() => {});
    }, []);

    useEffect(() => {
        if (selectedClasse) {
            api.get(`/emploi_temps.php?id_classe=${selectedClasse}`)
                .then(r => {
                    if (r.data?.length > 0) {
                        api.get(`/creneaux.php?id_emploi_temps=${r.data[0].id}`)
                            .then(r2 => setCreneaux(r2.data)).catch(() => {});
                    } else setCreneaux([]);
                }).catch(() => {});
        } else {
            api.get('/creneaux.php').then(r => setCreneaux(r.data)).catch(() => {});
        }
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

    const creneauxFiltres = selectedEnseignant
        ? creneaux.filter(c => String(c.id_enseignant) === String(selectedEnseignant))
        : creneaux;

    const getCreneauxForDay = (date) => {
        if (!date) return [];
        const jourNom = JOURS_FORM[date.getDay() === 0 ? 6 : date.getDay() - 1];
        return creneauxFiltres.filter(c => c.jour === jourNom);
    };

    const getCouleurMatiere = (id_matiere) => COULEURS[(id_matiere - 1) % COULEURS.length];

    const today = new Date();
    const days = getDaysInMonth(moisActif, annee);
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

    const retardsAujourdhui = pointages.filter(p => {
        const d = new Date(p.created_at);
        return d.toDateString() === today.toDateString() && p.statut === 'retard';
    });
    const cahiersEnAttente = cahiers.filter(c => c.statut !== 'cloture');
    const vacationsAValider = vacations.filter(v => v.statut === 'generee');

    return (
        <div>
            <nav className="navbar navbar-dark bg-primary px-4">
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
                    <h4>Tableau de bord — Administrateur</h4>
                    <div className="d-flex gap-2">
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/emploi-temps')}>📅 Emploi du temps</button>
                        <button className="btn btn-outline-success btn-sm" onClick={() => navigate('/qr-code')}>📱 QR Codes</button>
                        <button className="btn btn-outline-dark btn-sm" onClick={() => navigate('/vacations')}>💰 Vacations</button>
                    </div>
                </div>

                {/* KPIs */}
                <div className="row g-3 mb-4">
                    <div className="col-md-3">
                        <div className="card text-white bg-primary">
                            <div className="card-body">
                                <h6>Classes</h6>
                                <h2>{stats.classes}</h2>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card text-white bg-success">
                            <div className="card-body">
                                <h6>Enseignants</h6>
                                <h2>{stats.enseignants}</h2>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card text-white bg-info">
                            <div className="card-body">
                                <h6>Matières</h6>
                                <h2>{stats.matieres}</h2>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card text-white bg-warning">
                            <div className="card-body">
                                <h6>Salles</h6>
                                <h2>{stats.salles}</h2>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Alertes */}
                {retardsAujourdhui.length > 0 && (
                    <div className="alert alert-warning mb-3">
                        ⚠️ <strong>{retardsAujourdhui.length} retard(s)</strong> enregistré(s) aujourd'hui.
                        <button className="btn btn-sm btn-warning ms-3" onClick={() => navigate('/qr-code')}>Voir →</button>
                    </div>
                )}
                {cahiersEnAttente.length > 0 && (
                    <div className="alert alert-info mb-3">
                        📝 <strong>{cahiersEnAttente.length} cahier(s)</strong> non clôturés.
                    </div>
                )}
                {vacationsAValider.length > 0 && (
                    <div className="alert alert-danger mb-3">
                        💰 <strong>{vacationsAValider.length} fiche(s) de vacation</strong> en attente de validation.
                        <button className="btn btn-sm btn-danger ms-3" onClick={() => navigate('/vacations')}>Voir →</button>
                    </div>
                )}

                {/* Filtres calendrier */}
                <div className="card mb-4">
                    <div className="card-body">
                        <div className="row g-3 align-items-end">
                            <div className="col-md-3">
                                <label className="form-label fw-bold">Classe</label>
                                <select className="form-select" value={selectedClasse} onChange={e => setSelectedClasse(e.target.value)}>
                                    <option value="">-- Toutes les classes --</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.libelle}</option>)}
                                </select>
                            </div>
                            <div className="col-md-3">
                                <label className="form-label fw-bold">Enseignant</label>
                                <select className="form-select" value={selectedEnseignant} onChange={e => setSelectedEnseignant(e.target.value)}>
                                    <option value="">-- Tous les enseignants --</option>
                                    {enseignants.map(e => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}
                                </select>
                            </div>
                            <div className="col-md-3">
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
                        <h5 className="mb-0 fw-bold">{MOIS_NOMS[moisActif]} {annee}
                            {selectedEnseignant && <small className="text-muted ms-2 fs-6">— {enseignants.find(e => String(e.id) === String(selectedEnseignant))?.nom}</small>}
                        </h5>
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
                                                <td key={di} style={{ minHeight: '90px', verticalAlign: 'top', backgroundColor: isToday ? '#fff3cd' : date ? 'white' : '#f8f9fa' }}>
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

                {/* Légende */}
                {creneauxFiltres.length > 0 && (
                    <div className="card mb-4">
                        <div className="card-body py-2">
                            <div className="d-flex flex-wrap gap-2 align-items-center">
                                <span className="fw-bold me-2">Légende :</span>
                                {[...new Map(creneauxFiltres.map(c => [c.id_matiere, c])).values()].map(c => (
                                    <span key={c.id_matiere} className="badge px-3 py-2"
                                        style={{backgroundColor: getCouleurMatiere(c.id_matiere)}}>
                                        {c.matiere}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Résumé pointages */}
                <div className="row g-3 mb-4">
                    <div className="col-md-4">
                        <div className="card border-success">
                            <div className="card-body text-center">
                                <h6 className="text-success">✅ Pointages valides</h6>
                                <h3>{pointages.filter(p => p.statut === 'valide').length}</h3>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="card border-warning">
                            <div className="card-body text-center">
                                <h6 className="text-warning">⚠️ Retards</h6>
                                <h3>{pointages.filter(p => p.statut === 'retard').length}</h3>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="card border-danger">
                            <div className="card-body text-center">
                                <h6 className="text-danger">🔒 Cahiers clôturés</h6>
                                <h3>{cahiers.filter(c => c.statut === 'cloture').length}</h3>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardAdmin;