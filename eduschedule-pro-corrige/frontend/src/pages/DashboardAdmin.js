import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

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
    const [onglet, setOnglet] = useState('calendrier');

    const chartPointagesRef = useRef(null);
    const chartCahiersRef = useRef(null);
    const chartVacationsRef = useRef(null);
    const chartPointagesInstance = useRef(null);
    const chartCahiersInstance = useRef(null);
    const chartVacationsInstance = useRef(null);

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

    // Graphique 1 : Pointages (donut)
    useEffect(() => {
        if (onglet !== 'stats' || !chartPointagesRef.current) return;
        if (chartPointagesInstance.current) chartPointagesInstance.current.destroy();
        const valides = pointages.filter(p => p.statut === 'valide').length;
        const retards = pointages.filter(p => p.statut === 'retard').length;
        const invalides = pointages.filter(p => p.statut === 'invalide').length;
        chartPointagesInstance.current = new Chart(chartPointagesRef.current, {
            type: 'doughnut',
            data: {
                labels: ["A l'heure", 'Retard', 'Invalide'],
                datasets: [{ data: [valides, retards, invalides], backgroundColor: ['#2ecc71','#f39c12','#e74c3c'], borderWidth: 2, borderColor: '#fff' }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 16, font: { size: 13 } } },
                    title: { display: true, text: 'Repartition des pointages', font: { size: 15 } }
                }
            }
        });
        return () => { chartPointagesInstance.current?.destroy(); };
    }, [onglet, pointages]);

    // Graphique 2 : Cahiers (barres)
    useEffect(() => {
        if (onglet !== 'stats' || !chartCahiersRef.current) return;
        if (chartCahiersInstance.current) chartCahiersInstance.current.destroy();
        chartCahiersInstance.current = new Chart(chartCahiersRef.current, {
            type: 'bar',
            data: {
                labels: ['Brouillon', 'Signe (delegue)', 'Cloture'],
                datasets: [{
                    label: 'Cahiers',
                    data: [
                        cahiers.filter(c => c.statut === 'brouillon').length,
                        cahiers.filter(c => c.statut === 'signe_delegue').length,
                        cahiers.filter(c => c.statut === 'cloture').length
                    ],
                    backgroundColor: ['#f39c12','#3498db','#2ecc71'],
                    borderRadius: 6, borderSkipped: false
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, title: { display: true, text: 'Etat des cahiers de texte', font: { size: 15 } } },
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } }
            }
        });
        return () => { chartCahiersInstance.current?.destroy(); };
    }, [onglet, cahiers]);

    // Graphique 3 : Vacations par enseignant (barres horizontales)
    useEffect(() => {
        if (onglet !== 'stats' || !chartVacationsRef.current || vacations.length === 0) return;
        if (chartVacationsInstance.current) chartVacationsInstance.current.destroy();
        const parEnseignant = {};
        vacations.forEach(v => {
            const nom = v.nom + ' ' + v.prenom;
            parEnseignant[nom] = (parEnseignant[nom] || 0) + parseFloat(v.montant_net || 0);
        });
        const sorted = Object.entries(parEnseignant).sort((a, b) => b[1] - a[1]).slice(0, 8);
        chartVacationsInstance.current = new Chart(chartVacationsRef.current, {
            type: 'bar',
            data: {
                labels: sorted.map(([nom]) => nom),
                datasets: [{
                    label: 'Montant net (FCFA)',
                    data: sorted.map(([, m]) => m),
                    backgroundColor: '#9b59b6', borderRadius: 6, borderSkipped: false
                }]
            },
            options: {
                indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, title: { display: true, text: 'Montants nets par enseignant (FCFA)', font: { size: 15 } } },
                scales: {
                    x: { beginAtZero: true, ticks: { callback: v => v.toLocaleString('fr-FR') } },
                    y: { grid: { display: false } }
                }
            }
        });
        return () => { chartVacationsInstance.current?.destroy(); };
    }, [onglet, vacations]);

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
    const tauxPresence = pointages.length > 0
        ? Math.round((pointages.filter(p => p.statut === 'valide').length / pointages.length) * 100)
        : 0;

    return (
        <div>
            <nav className="navbar navbar-dark bg-primary px-4">
                <span className="navbar-brand fw-bold">EduSchedule Pro</span>
                <div className="d-flex align-items-center gap-3">
                    <span className="text-white">👤 {user?.email}</span>
                    <button className="btn btn-outline-light btn-sm" onClick={() => { logout(); navigate('/login'); }}>Déconnexion</button>
                </div>
            </nav>

            <div className="container-fluid mt-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h4>Tableau de bord — Administrateur</h4>
                    <div className="d-flex gap-2">
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/emploi-temps')}>📅 Emploi du temps</button>
                        <button className="btn btn-outline-success btn-sm" onClick={() => navigate('/qrcode')}>📱 QR Codes</button>
                        <button className="btn btn-outline-dark btn-sm" onClick={() => navigate('/vacations')}>💰 Vacations</button>
                    </div>
                </div>

                {/* KPIs */}
                <div className="row g-3 mb-4">
                    {[
                        { label: 'Classes', val: stats.classes, cls: 'bg-primary' },
                        { label: 'Enseignants', val: stats.enseignants, cls: 'bg-success' },
                        { label: 'Matières', val: stats.matieres, cls: 'bg-info' },
                        { label: 'Salles', val: stats.salles, cls: 'bg-warning' },
                    ].map(({ label, val, cls }) => (
                        <div key={label} className="col-md-3">
                            <div className={`card text-white ${cls}`}>
                                <div className="card-body"><h6>{label}</h6><h2>{val}</h2></div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Alertes */}
                {retardsAujourdhui.length > 0 && (
                    <div className="alert alert-warning mb-3">
                        ⚠️ <strong>{retardsAujourdhui.length} retard(s)</strong> enregistré(s) aujourd'hui.
                        <button className="btn btn-sm btn-warning ms-3" onClick={() => navigate('/qrcode')}>Voir →</button>
                    </div>
                )}
                {cahiersEnAttente.length > 0 && <div className="alert alert-info mb-3">📝 <strong>{cahiersEnAttente.length} cahier(s)</strong> non clôturés.</div>}
                {vacationsAValider.length > 0 && (
                    <div className="alert alert-danger mb-3">
                        💰 <strong>{vacationsAValider.length} fiche(s) de vacation</strong> en attente de validation.
                        <button className="btn btn-sm btn-danger ms-3" onClick={() => navigate('/vacations')}>Voir →</button>
                    </div>
                )}

                {/* Onglets */}
                <ul className="nav nav-tabs mb-4">
                    <li className="nav-item">
                        <button className={`nav-link ${onglet === 'calendrier' ? 'active' : ''}`} onClick={() => setOnglet('calendrier')}>📅 Calendrier</button>
                    </li>
                    <li className="nav-item">
                        <button className={`nav-link ${onglet === 'stats' ? 'active' : ''}`} onClick={() => setOnglet('stats')}>📊 Statistiques</button>
                    </li>
                </ul>

                {/* ===== CALENDRIER ===== */}
                {onglet === 'calendrier' && (
                    <>
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
                        <div className="card mb-4">
                            <div className="card-header bg-white d-flex justify-content-between align-items-center">
                                <button className="btn btn-outline-primary btn-sm" onClick={() => {
                                    if (moisActif === 0) { setMoisActif(11); setAnnee(a => a-1); } else setMoisActif(m => m-1);
                                }}>◀ Précédent</button>
                                <h5 className="mb-0 fw-bold">{MOIS_NOMS[moisActif]} {annee}
                                    {selectedEnseignant && <small className="text-muted ms-2 fs-6">— {enseignants.find(e => String(e.id) === String(selectedEnseignant))?.nom}</small>}
                                </h5>
                                <button className="btn btn-outline-primary btn-sm" onClick={() => {
                                    if (moisActif === 11) { setMoisActif(0); setAnnee(a => a+1); } else setMoisActif(m => m+1);
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
                        {creneauxFiltres.length > 0 && (
                            <div className="card mb-4">
                                <div className="card-body py-2">
                                    <div className="d-flex flex-wrap gap-2 align-items-center">
                                        <span className="fw-bold me-2">Légende :</span>
                                        {[...new Map(creneauxFiltres.map(c => [c.id_matiere, c])).values()].map(c => (
                                            <span key={c.id_matiere} className="badge px-3 py-2" style={{backgroundColor: getCouleurMatiere(c.id_matiere)}}>{c.matiere}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="row g-3 mb-4">
                            <div className="col-md-4">
                                <div className="card border-success"><div className="card-body text-center">
                                    <h6 className="text-success">✅ Pointages valides</h6>
                                    <h3>{pointages.filter(p => p.statut === 'valide').length}</h3>
                                </div></div>
                            </div>
                            <div className="col-md-4">
                                <div className="card border-warning"><div className="card-body text-center">
                                    <h6 className="text-warning">⚠️ Retards</h6>
                                    <h3>{pointages.filter(p => p.statut === 'retard').length}</h3>
                                </div></div>
                            </div>
                            <div className="col-md-4">
                                <div className="card border-danger"><div className="card-body text-center">
                                    <h6 className="text-danger">🔒 Cahiers clôturés</h6>
                                    <h3>{cahiers.filter(c => c.statut === 'cloture').length}</h3>
                                </div></div>
                            </div>
                        </div>
                    </>
                )}

                {/* ===== STATISTIQUES ===== */}
                {onglet === 'stats' && (
                    <>
                        <div className="row g-3 mb-4">
                            {[
                                { val: tauxPresence + '%', lbl: 'Taux de présence', col: 'text-success' },
                                { val: pointages.length, lbl: 'Pointages enregistrés', col: 'text-primary' },
                                { val: cahiers.length, lbl: 'Cahiers de texte', col: 'text-info' },
                                { val: vacations.reduce((s, v) => s + parseFloat(v.montant_net || 0), 0).toLocaleString() + ' FCFA', lbl: 'Total vacations net', col: 'text-warning' },
                            ].map(({ val, lbl, col }) => (
                                <div key={lbl} className="col-md-3">
                                    <div className="card border-0 bg-light text-center p-3">
                                        <div className={`fs-2 fw-bold ${col}`}>{val}</div>
                                        <div className="text-muted small">{lbl}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="row g-4 mb-4">
                            <div className="col-md-4">
                                <div className="card h-100">
                                    <div className="card-body">
                                        {pointages.length === 0
                                            ? <p className="text-muted text-center mt-5">Aucun pointage enregistré</p>
                                            : <div style={{ position: 'relative', height: '280px' }}>
                                                <canvas ref={chartPointagesRef} role="img" aria-label="Repartition des pointages par statut" />
                                              </div>
                                        }
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div className="card h-100">
                                    <div className="card-body">
                                        {cahiers.length === 0
                                            ? <p className="text-muted text-center mt-5">Aucun cahier enregistré</p>
                                            : <div style={{ position: 'relative', height: '280px' }}>
                                                <canvas ref={chartCahiersRef} role="img" aria-label="Etat des cahiers de texte" />
                                              </div>
                                        }
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div className="card h-100">
                                    <div className="card-body">
                                        <h6 className="fw-bold text-center mb-3">Séances planifiées vs pointées</h6>
                                        {[
                                            { lbl: 'Planifiées', val: creneaux.length, total: creneaux.length, cls: 'bg-primary' },
                                            { lbl: "A l'heure", val: pointages.filter(p => p.statut === 'valide').length, total: creneaux.length, cls: 'bg-success' },
                                            { lbl: 'Retards', val: pointages.filter(p => p.statut === 'retard').length, total: creneaux.length, cls: 'bg-warning' },
                                            { lbl: 'Cahiers clôturés', val: cahiers.filter(c => c.statut === 'cloture').length, total: cahiers.length, cls: 'bg-info' },
                                        ].map(({ lbl, val, total, cls }) => (
                                            <div key={lbl} className="mb-3">
                                                <div className="d-flex justify-content-between mb-1">
                                                    <span className="small">{lbl}</span>
                                                    <span className="fw-bold">{val}</span>
                                                </div>
                                                <div className="progress" style={{height: '20px'}}>
                                                    <div className={`progress-bar ${cls}`} style={{ width: total > 0 ? `${Math.round((val/total)*100)}%` : '0%' }}>
                                                        {total > 0 ? Math.round((val/total)*100) + '%' : '0%'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {vacations.length > 0 && (
                            <div className="card mb-4">
                                <div className="card-body">
                                    <div style={{ position: 'relative', height: `${Math.max(200, Math.min(vacations.length, 8) * 50 + 80)}px` }}>
                                        <canvas ref={chartVacationsRef} role="img" aria-label="Montants nets de vacation par enseignant" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default DashboardAdmin;