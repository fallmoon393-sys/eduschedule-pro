import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { exportCahier } from '../utils/exportPDF';

const MOIS_NOMS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const JOURS_SEMAINE = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
const JOURS_FORM = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
const COULEURS = ['#3498db','#e74c3c','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#34495e'];

const DashboardEnseignant = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [vacations, setVacations] = useState([]);
    const [cahiers, setCahiers] = useState([]);
    const [pointages, setPointages] = useState([]);
    const [creneaux, setCreneaux] = useState([]);
    const [moisActif, setMoisActif] = useState(new Date().getMonth());
    const [annee, setAnnee] = useState(new Date().getFullYear());
    const [onglet, setOnglet] = useState('dashboard');
    const [selectedCahier, setSelectedCahier] = useState(null);
    const [showSignForm, setShowSignForm] = useState(false);
    const [showClotureForm, setShowClotureForm] = useState(false);
    const [heureFin, setHeureFin] = useState('');
    const signRef = useRef(null);
    const signPadRef = useRef(null);

    const chargerDonnees = () => {
        api.get('/vacations.php').then(r => setVacations(r.data)).catch(() => {});
        api.get('/cahiers.php').then(r => setCahiers(r.data)).catch(() => {});
        api.get('/pointages.php').then(r => setPointages(r.data)).catch(() => {});
        api.get('/creneaux.php').then(r => setCreneaux(r.data)).catch(() => {});
    };

    useEffect(() => { chargerDonnees(); }, []);

    useEffect(() => {
        if (showSignForm && signRef.current) {
            import('signature_pad').then(({ default: SignaturePad }) => {
                signPadRef.current = new SignaturePad(signRef.current);
            }).catch(() => {});
        }
    }, [showSignForm]);

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

    const getStatutPointage = (creneauId) => {
        const p = pointages.find(p => String(p.id_creneau) === String(creneauId) && 
            new Date(p.created_at).toDateString() === new Date().toDateString());
        if (!p) return null;
        return p.statut;
    };

    const handleSigner = (cahier) => {
        setSelectedCahier(cahier);
        setShowSignForm(true);
        setShowClotureForm(false);
        window.scrollTo(0, 0);
    };

    const handleCloture = (cahier) => {
        setSelectedCahier(cahier);
        setShowClotureForm(true);
        setShowSignForm(false);
        setHeureFin(new Date().toTimeString().substring(0, 5));
        window.scrollTo(0, 0);
    };

    const submitSignature = async () => {
        if (!signPadRef.current || signPadRef.current.isEmpty()) {
            alert('Veuillez signer avant de valider');
            return;
        }
        try {
            await api.post(`/cahiers.php/${selectedCahier.id}?action=signer`, {
                type: 'enseignant',
                signature_base64: signPadRef.current.toDataURL()
            });
            alert('Signature enregistrée !');
            setShowSignForm(false);
            chargerDonnees();
        } catch (err) {
            alert(err.response?.data?.error || 'Erreur lors de la signature');
        }
    };

    const submitCloture = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/cahiers.php/${selectedCahier.id}?action=cloture`, { heure_fin: heureFin });
            alert('Séance clôturée et fiche verrouillée !');
            setShowClotureForm(false);
            chargerDonnees();
        } catch (err) {
            alert(err.response?.data?.error || 'Erreur lors de la clôture');
        }
    };

    const getStatutBadge = (statut) => {
        const map = {
            'brouillon': { cls: 'bg-secondary', label: 'Brouillon' },
            'signe_delegue': { cls: 'bg-warning text-dark', label: 'Signé (délégué)' },
            'signe_enseignant': { cls: 'bg-info', label: 'Signé (enseignant)' },
            'cloture': { cls: 'bg-success', label: '🔒 Clôturé' }
        };
        return map[statut] || { cls: 'bg-secondary', label: statut };
    };

    const parseContenu = (contenu_json) => {
        try {
            const p = typeof contenu_json === 'string' ? JSON.parse(contenu_json) : contenu_json;
            return { points: p?.points || '', travaux: p?.travaux || '' };
        } catch { return { points: contenu_json || '', travaux: '' }; }
    };

    const today = new Date();
    const days = getDaysInMonth(moisActif, annee);
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

    const cahiersAttente = cahiers.filter(c => c.statut === 'signe_delegue');
    const cahiersASigner = cahiersAttente; // enseignant doit signer
    const cahiersACloture = cahiers.filter(c => c.statut === 'signe_enseignant');

    return (
        <div>
            <nav className="navbar navbar-dark bg-success px-4">
                <span className="navbar-brand fw-bold">EduSchedule Pro</span>
                <div className="d-flex align-items-center gap-3">
                    <span className="text-white">👤 {user?.email}</span>
                    <button className="btn btn-outline-light btn-sm" onClick={() => { logout(); navigate('/login'); }}>
                        Déconnexion
                    </button>
                </div>
            </nav>

            <div className="container-fluid mt-4">
                {/* Onglets */}
                <ul className="nav nav-tabs mb-4">
                    <li className="nav-item">
                        <button className={`nav-link ${onglet === 'dashboard' ? 'active' : ''}`} onClick={() => setOnglet('dashboard')}>
                            🏠 Tableau de bord
                        </button>
                    </li>
                    <li className="nav-item">
                        <button className={`nav-link ${onglet === 'cahiers' ? 'active' : ''}`} onClick={() => setOnglet('cahiers')}>
                            📝 Cahiers de texte
                            {cahiersAttente.length > 0 && <span className="badge bg-warning text-dark ms-1">{cahiersAttente.length}</span>}
                        </button>
                    </li>
                    <li className="nav-item">
                        <button className={`nav-link ${onglet === 'vacations' ? 'active' : ''}`} onClick={() => setOnglet('vacations')}>
                            💰 Mes vacations
                        </button>
                    </li>
                </ul>

                {/* DASHBOARD */}
                {onglet === 'dashboard' && (
                    <div>
                        <h4 className="mb-4">Tableau de bord — Enseignant</h4>

                        {/* KPIs */}
                        <div className="row g-3 mb-4">
                            <div className="col-md-3">
                                <div className="card text-white bg-success">
                                    <div className="card-body">
                                        <h6>Mes séances (total)</h6>
                                        <h2>{cahiers.length}</h2>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="card text-white bg-warning">
                                    <div className="card-body">
                                        <h6>À signer</h6>
                                        <h2>{cahiersASigner.length}</h2>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="card text-white bg-info">
                                    <div className="card-body">
                                        <h6>À clôturer</h6>
                                        <h2>{cahiersACloture.length}</h2>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="card text-white bg-primary">
                                    <div className="card-body">
                                        <h6>Fiches vacation</h6>
                                        <h2>{vacations.length}</h2>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Alertes */}
                        {cahiersASigner.length > 0 && (
                            <div className="alert alert-warning mb-4">
                                ⚠️ <strong>{cahiersASigner.length} cahier(s) en attente de votre signature</strong> — le délégué a déjà signé.
                                <button className="btn btn-sm btn-warning ms-3" onClick={() => setOnglet('cahiers')}>Voir →</button>
                            </div>
                        )}
                        {cahiersACloture.length > 0 && (
                            <div className="alert alert-info mb-4">
                                ℹ️ <strong>{cahiersACloture.length} cahier(s) à clôturer</strong> — vous avez signé, confirmez l'heure de fin.
                                <button className="btn btn-sm btn-info ms-3" onClick={() => setOnglet('cahiers')}>Voir →</button>
                            </div>
                        )}

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
                                                        <td key={di} style={{ minHeight: '90px', verticalAlign: 'top', backgroundColor: isToday ? '#fff3cd' : date ? 'white' : '#f8f9fa' }}>
                                                            {date && (
                                                                <>
                                                                    <div className={`fw-bold mb-1 ${isToday ? 'text-warning' : 'text-muted'}`} style={{fontSize: '0.85rem'}}>
                                                                        {isToday ? '⭐ ' : ''}{date.getDate()}
                                                                    </div>
                                                                    {creneauxDuJour.map((c, i) => {
                                                                        const statutP = isToday ? getStatutPointage(c.id) : null;
                                                                        return (
                                                                            <div key={i} className="rounded px-1 mb-1"
                                                                                style={{backgroundColor: getCouleurMatiere(c.id_matiere), color: 'white', fontSize: '0.7rem'}}>
                                                                                <div className="fw-bold">{c.heure_debut?.substring(0,5)} {c.matiere}</div>
                                                                                <div>🏫 {c.salle}</div>
                                                                                {statutP && (
                                                                                    <div>{statutP === 'valide' ? '✅' : statutP === 'retard' ? '⚠️' : '❌'} {statutP}</div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
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

                        {/* Pointages récents */}
                        <div className="card">
                            <div className="card-header bg-white"><h5 className="mb-0">Mes derniers pointages</h5></div>
                            <div className="card-body">
                                {pointages.length === 0 ? <p className="text-muted">Aucun pointage.</p> : (
                                    <table className="table table-hover">
                                        <thead><tr><th>Date</th><th>Matière</th><th>Classe</th><th>Heure</th><th>Statut</th></tr></thead>
                                        <tbody>
                                            {pointages.slice(0,5).map(p => (
                                                <tr key={p.id}>
                                                    <td>{new Date(p.created_at).toLocaleDateString('fr-FR')}</td>
                                                    <td>{p.matiere}</td>
                                                    <td>{p.classe}</td>
                                                    <td>{p.heure_debut?.substring(0,5)}</td>
                                                    <td>
                                                        <span className={`badge ${p.statut === 'valide' ? 'bg-success' : p.statut === 'retard' ? 'bg-warning text-dark' : 'bg-danger'}`}>
                                                            {p.statut}
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
                )}

                {/* CAHIERS DE TEXTE */}
                {onglet === 'cahiers' && (
                    <div>
                        <h4 className="mb-4">📝 Mes cahiers de texte</h4>

                        {/* Formulaire signature */}
                        {showSignForm && selectedCahier && (
                            <div className="card mb-4 border-success">
                                <div className="card-header bg-success text-white d-flex justify-content-between">
                                    <h5 className="mb-0">✍️ Signer : {selectedCahier.titre_cours}</h5>
                                    <button className="btn btn-sm btn-outline-light" onClick={() => setShowSignForm(false)}>✕</button>
                                </div>
                                <div className="card-body">
                                    <div className="mb-3">
                                        <p><strong>Matière :</strong> {selectedCahier.matiere}</p>
                                        <p><strong>Classe :</strong> {selectedCahier.classe}</p>
                                        <p><strong>Points vus :</strong> {parseContenu(selectedCahier.contenu_json).points}</p>
                                    </div>
                                    <label className="form-label fw-bold">Votre signature (enseignant)</label>
                                    <div className="border rounded p-2 bg-white mb-2">
                                        <canvas ref={signRef} width="500" height="120"
                                            style={{border: '1px dashed #ccc', width: '100%', cursor: 'crosshair'}}></canvas>
                                    </div>
                                    <button className="btn btn-sm btn-secondary mb-3" onClick={() => signPadRef.current?.clear()}>Effacer</button>
                                    <div>
                                        <button className="btn btn-success me-2" onClick={submitSignature}>✅ Valider ma signature</button>
                                        <button className="btn btn-secondary" onClick={() => setShowSignForm(false)}>Annuler</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Formulaire clôture */}
                        {showClotureForm && selectedCahier && (
                            <div className="card mb-4 border-danger">
                                <div className="card-header bg-danger text-white d-flex justify-content-between">
                                    <h5 className="mb-0">🔒 Clôturer : {selectedCahier.titre_cours}</h5>
                                    <button className="btn btn-sm btn-outline-light" onClick={() => setShowClotureForm(false)}>✕</button>
                                </div>
                                <div className="card-body">
                                    <div className="alert alert-warning">
                                        ⚠️ La clôture verrouille définitivement la fiche. Aucune modification ne sera possible.
                                    </div>
                                    <form onSubmit={submitCloture}>
                                        <div className="mb-3">
                                            <label className="form-label fw-bold">Heure de fin réelle</label>
                                            <input type="time" className="form-control" style={{maxWidth: '200px'}}
                                                value={heureFin} onChange={e => setHeureFin(e.target.value)} required />
                                        </div>
                                        <button type="submit" className="btn btn-danger me-2">🔒 Clôturer et verrouiller</button>
                                        <button type="button" className="btn btn-secondary" onClick={() => setShowClotureForm(false)}>Annuler</button>
                                    </form>
                                </div>
                            </div>
                        )}

                        <div className="card">
                            <div className="card-body p-0">
                                <table className="table table-hover mb-0">
                                    <thead className="table-dark">
                                        <tr><th>Date</th><th>Matière</th><th>Classe</th><th>Titre</th><th>Statut</th><th>Actions</th></tr>
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
                                                    <td>{c.titre_cours}</td>
                                                    <td><span className={`badge ${cls}`}>{label}</span></td>
                                                    <td>
                                                        {c.statut === 'signe_delegue' && (
                                                            <button className="btn btn-sm btn-success me-1" onClick={() => handleSigner(c)}>
                                                                ✍️ Signer
                                                            </button>
                                                        )}
                                                        {c.statut === 'signe_enseignant' && (
                                                            <button className="btn btn-sm btn-danger me-1" onClick={() => handleCloture(c)}>
                                                                🔒 Clôturer
                                                            </button>
                                                        )}
                                                        {c.statut === 'cloture' && (
                                                            <>
                                                                <span className="text-success me-1">✅ Archivé</span>
                                                                <button className="btn btn-sm btn-danger" onClick={() => exportCahier(c)}>📄 PDF</button>
                                                            </>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* VACATIONS */}
                {onglet === 'vacations' && (
                    <div>
                        <h4 className="mb-4">💰 Mes fiches de vacation</h4>
                        <div className="card">
                            <div className="card-body">
                                {vacations.length === 0 ? (
                                    <p className="text-muted">Aucune fiche de vacation pour le moment.</p>
                                ) : (
                                    <table className="table table-hover">
                                        <thead>
                                            <tr><th>Mois</th><th>Année</th><th>Montant brut</th><th>Montant net</th><th>Statut</th></tr>
                                        </thead>
                                        <tbody>
                                            {vacations.map(v => (
                                                <tr key={v.id}>
                                                    <td>{MOIS_NOMS[v.mois - 1]}</td>
                                                    <td>{v.annee}</td>
                                                    <td>{parseFloat(v.montant_brut || 0).toLocaleString()} FCFA</td>
                                                    <td>{parseFloat(v.montant_net || 0).toLocaleString()} FCFA</td>
                                                    <td>
                                                        <span className={`badge ${
                                                            v.statut === 'approuvee_comptable' ? 'bg-success' :
                                                            v.statut === 'validee_surveillant' ? 'bg-primary' :
                                                            v.statut === 'generee' ? 'bg-info' : 'bg-secondary'
                                                        }`}>{v.statut}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardEnseignant;