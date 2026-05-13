import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { exportCahier } from '../utils/exportPDF';

const MOIS_NOMS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const JOURS_SEMAINE = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const JOURS_FORM = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const COULEURS = ['#3498db','#e74c3c','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#34495e'];

const CahierTextePage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [cahiers, setCahiers] = useState([]);
    const [creneaux, setCreneaux] = useState([]);
    const [classes, setClasses] = useState([]);
    const [selectedClasse, setSelectedClasse] = useState('');
    const [selectedEnseignant, setSelectedEnseignant] = useState('');
    const [enseignants, setEnseignants] = useState([]);
    const [moisActif, setMoisActif] = useState(new Date().getMonth());
    const [annee, setAnnee] = useState(new Date().getFullYear());
    const [showForm, setShowForm] = useState(false);
    const [selectedCreneau, setSelectedCreneau] = useState(null);
    const [selectedCahier, setSelectedCahier] = useState(null);
    const [showDetail, setShowDetail] = useState(false);
    const [showSignForm, setShowSignForm] = useState(false);
    const [newCahier, setNewCahier] = useState({ titre_cours: '', contenu: '', travaux: '' });
    const signCanvasRef = useRef(null);
    const signPadRef = useRef(null);
    const createCanvasRef = useRef(null);
    const createPadRef = useRef(null);

    const chargerCahiers = () => {
        api.get('/cahiers.php').then(res => setCahiers(res.data)).catch(() => {});
    };

    useEffect(() => {
        chargerCahiers();
        api.get('/classes.php').then(r => setClasses(r.data)).catch(() => {});
        api.get('/enseignants.php').then(r => setEnseignants(r.data)).catch(() => {});
    }, []);

    useEffect(() => {
        if (selectedClasse) {
            api.get(`/emploi_temps.php?id_classe=${selectedClasse}`)
                .then(r => {
                    if (r.data && r.data.length > 0) {
                        api.get(`/creneaux.php?id_emploi_temps=${r.data[0].id}`)
                            .then(r2 => setCreneaux(r2.data)).catch(() => {});
                    } else {
                        setCreneaux([]);
                    }
                }).catch(() => {});
        } else {
            setCreneaux([]);
        }
    }, [selectedClasse]);

    useEffect(() => {
        if (showForm && createCanvasRef.current) {
            import('signature_pad').then(({ default: SignaturePad }) => {
                createPadRef.current = new SignaturePad(createCanvasRef.current);
            }).catch(() => {});
        }
    }, [showForm]);

    useEffect(() => {
        if (showSignForm && signCanvasRef.current) {
            import('signature_pad').then(({ default: SignaturePad }) => {
                signPadRef.current = new SignaturePad(signCanvasRef.current);
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

    const getCahiersForCreneau = (creneauId) => {
        return cahiers.filter(c => c.id_creneau === creneauId || String(c.id_creneau) === String(creneauId));
    };

    const getCouleurMatiere = (id_matiere) => COULEURS[(id_matiere - 1) % COULEURS.length];

    const handleDayClick = (date) => {
        if (!date || !selectedClasse) return;
        const jourNom = JOURS_FORM[date.getDay() === 0 ? 6 : date.getDay() - 1];
        const creneauxDuJour = creneaux.filter(c => c.jour === jourNom);
        if (creneauxDuJour.length === 0) return;
        setSelectedCreneau(creneauxDuJour[0]);
        setShowForm(true);
        setShowDetail(false);
        setShowSignForm(false);
        window.scrollTo(0, 0);
    };

    const handleCreneauClick = (creneau, e) => {
        e.stopPropagation();
        setSelectedCreneau(creneau);
        setShowForm(true);
        setShowDetail(false);
        setShowSignForm(false);
        window.scrollTo(0, 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCreneau) {
            alert('Veuillez sélectionner un créneau');
            return;
        }
        try {
            await api.post('/cahiers.php', {
                id_creneau: selectedCreneau.id,
                titre_cours: newCahier.titre_cours,
                contenu_json: { points: newCahier.contenu },
                travaux: newCahier.travaux ? [{ description: newCahier.travaux, type: 'devoir' }] : []
            });
            alert('Cahier créé avec succès !');
            setShowForm(false);
            setSelectedCreneau(null);
            setNewCahier({ titre_cours: '', contenu: '', travaux: '' });
            chargerCahiers();
        } catch (err) {
            alert('Erreur lors de la création : ' + (err.response?.data?.error || 'inconnue'));
        }
    };

    const handleSigner = (cahier) => {
        setSelectedCahier(cahier);
        setShowSignForm(true);
        setShowDetail(false);
        window.scrollTo(0, 0);
    };

    const handleSubmitSignature = async () => {
        if (!signPadRef.current || signPadRef.current.isEmpty()) {
            alert('Veuillez signer avant de valider');
            return;
        }
        try {
            await api.post(`/cahiers.php/${selectedCahier.id}?action=signer`, {
                type: 'delegue',
                signature_base64: signPadRef.current.toDataURL()
            });
            alert('Cahier signé !');
            setShowSignForm(false);
            chargerCahiers();
        } catch (err) {
            alert('Erreur lors de la signature');
        }
    };

    const getStatutBadge = (statut) => {
        const map = {
            'brouillon': { cls: 'bg-secondary', label: 'Brouillon' },
            'signe_delegue': { cls: 'bg-warning text-dark', label: 'Signé (délégué)' },
            'signe_enseignant': { cls: 'bg-info', label: 'Signé (enseignant)' },
            'cloture': { cls: 'bg-success', label: 'Clôturé' }
        };
        return map[statut] || { cls: 'bg-secondary', label: statut };
    };

    const parseContenu = (contenu_json) => {
        try {
            const p = typeof contenu_json === 'string' ? JSON.parse(contenu_json) : contenu_json;
            return p?.points || JSON.stringify(p);
        } catch { return contenu_json || ''; }
    };

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
                    <h4>📝 Cahier de Texte Numérique</h4>
                    <div className="d-flex gap-2">
                        <button className="btn btn-secondary" onClick={() => navigate('/dashboard/delegue')}>← Retour</button>
                        <button className="btn btn-info text-white" onClick={() => { setShowForm(!showForm); setShowDetail(false); setShowSignForm(false); setSelectedCreneau(null); }}>
                            + Nouveau cahier
                        </button>
                    </div>
                </div>

                {/* Formulaire création */}
                {showForm && (
                    <div className="card mb-4">
                        <div className="card-header bg-info text-white">
                            <h5 className="mb-0">Créer un cahier de texte</h5>
                        </div>
                        <div className="card-body">
                            <form onSubmit={handleSubmit}>
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label">Créneau</label>
                                        <select className="form-select" required
                                            value={selectedCreneau?.id || ''}
                                            onChange={e => {
                                                const c = creneaux.find(c => String(c.id) === e.target.value);
                                                setSelectedCreneau(c || null);
                                            }}>
                                            <option value="">Sélectionner un créneau</option>
                                            {creneaux.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    {c.jour} — {c.matiere} — {c.enseignant} ({c.heure_debut?.substring(0,5)}-{c.heure_fin?.substring(0,5)})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Titre du cours</label>
                                        <input type="text" className="form-control" required
                                            placeholder="Ex: Introduction aux réseaux"
                                            value={newCahier.titre_cours}
                                            onChange={e => setNewCahier({...newCahier, titre_cours: e.target.value})} />
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label">Points vus dans le cours</label>
                                        <textarea className="form-control" rows="3" required
                                            placeholder="Décrivez les points abordés..."
                                            value={newCahier.contenu}
                                            onChange={e => setNewCahier({...newCahier, contenu: e.target.value})} />
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label">Travaux demandés</label>
                                        <input type="text" className="form-control"
                                            placeholder="Ex: Exercice page 45"
                                            value={newCahier.travaux}
                                            onChange={e => setNewCahier({...newCahier, travaux: e.target.value})} />
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label">Signature du délégué</label>
                                        <div className="border rounded p-2 bg-white">
                                            <canvas ref={createCanvasRef} width="500" height="120"
                                                style={{border: '1px dashed #ccc', width: '100%', cursor: 'crosshair'}}></canvas>
                                        </div>
                                        <button type="button" className="btn btn-sm btn-secondary mt-1"
                                            onClick={() => createPadRef.current?.clear()}>
                                            Effacer signature
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <button type="submit" className="btn btn-success me-2">✅ Créer</button>
                                    <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setSelectedCreneau(null); }}>Annuler</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Détail cahier */}
                {showDetail && selectedCahier && (
                    <div className="card mb-4 border-info">
                        <div className="card-header bg-info text-white d-flex justify-content-between">
                            <h5 className="mb-0">📖 {selectedCahier.titre_cours}</h5>
                            <button className="btn btn-sm btn-outline-light" onClick={() => setShowDetail(false)}>✕</button>
                        </div>
                        <div className="card-body">
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <p><strong>Matière :</strong> {selectedCahier.matiere}</p>
                                    <p><strong>Enseignant :</strong> {selectedCahier.enseignant_nom} {selectedCahier.enseignant_prenom}</p>
                                    <p><strong>Date :</strong> {new Date(selectedCahier.date_creation).toLocaleDateString('fr-FR')}</p>
                                </div>
                                <div className="col-md-6">
                                    <p><strong>Statut :</strong> <span className={`badge ${getStatutBadge(selectedCahier.statut).cls}`}>{getStatutBadge(selectedCahier.statut).label}</span></p>
                                </div>
                                <div className="col-12">
                                    <p><strong>Contenu :</strong></p>
                                    <div className="bg-light p-3 rounded">{parseContenu(selectedCahier.contenu_json)}</div>
                                </div>
                            </div>
                            {selectedCahier.statut === 'brouillon' && (
                                <button className="btn btn-warning mt-3" onClick={() => handleSigner(selectedCahier)}>
                                    ✍️ Signer ce cahier
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Formulaire signature */}
                {showSignForm && selectedCahier && (
                    <div className="card mb-4 border-warning">
                        <div className="card-header bg-warning d-flex justify-content-between">
                            <h5 className="mb-0">✍️ Signer : {selectedCahier.titre_cours}</h5>
                            <button className="btn btn-sm btn-outline-dark" onClick={() => setShowSignForm(false)}>✕</button>
                        </div>
                        <div className="card-body">
                            <label className="form-label fw-bold">Votre signature</label>
                            <div className="border rounded p-2 bg-white mb-2">
                                <canvas ref={signCanvasRef} width="500" height="120"
                                    style={{border: '1px dashed #ccc', width: '100%', cursor: 'crosshair'}}></canvas>
                            </div>
                            <button type="button" className="btn btn-sm btn-secondary mb-3"
                                onClick={() => signPadRef.current?.clear()}>Effacer</button>
                            <div>
                                <button className="btn btn-warning me-2" onClick={handleSubmitSignature}>✅ Valider</button>
                                <button className="btn btn-secondary" onClick={() => setShowSignForm(false)}>Annuler</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Filtres calendrier */}
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
                                <label className="form-label fw-bold">Enseignant</label>
                                <select className="form-select" value={selectedEnseignant}
                                    onChange={e => setSelectedEnseignant(e.target.value)}>
                                    <option value="">-- Tous --</option>
                                    {enseignants.map(e => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}
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

                {/* Calendrier mensuel */}
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
                                                <td key={di}
                                                    style={{ minHeight: '100px', verticalAlign: 'top', cursor: date && selectedClasse ? 'pointer' : 'default', backgroundColor: isToday ? '#fff3cd' : date ? 'white' : '#f8f9fa' }}
                                                    onClick={() => handleDayClick(date)}>
                                                    {date && (
                                                        <>
                                                            <div className={`fw-bold mb-1 ${isToday ? 'text-warning' : 'text-muted'}`} style={{fontSize: '0.85rem'}}>
                                                                {isToday ? '⭐ ' : ''}{date.getDate()}
                                                            </div>
                                                            {creneauxDuJour.map((c, i) => {
                                                                const cahiersDuCreneau = getCahiersForCreneau(c.id);
                                                                return (
                                                                    <div key={i} className="rounded px-1 mb-1"
                                                                        style={{backgroundColor: getCouleurMatiere(c.id_matiere), color: 'white', fontSize: '0.7rem'}}
                                                                        onClick={(e) => handleCreneauClick(c, e)}>
                                                                        <div className="fw-bold">{c.heure_debut?.substring(0,5)} {c.matiere}</div>
                                                                        {cahiersDuCreneau.length > 0 && (
                                                                            <div>📝 {cahiersDuCreneau.length} cahier(s)</div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                            {selectedClasse && creneauxDuJour.length === 0 && (
                                                                <div className="text-muted text-center" style={{fontSize: '0.65rem'}}></div>
                                                            )}
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

                {/* Liste des cahiers */}
                <div className="card">
                    <div className="card-header bg-white">
                        <h5 className="mb-0">Tous les cahiers de texte</h5>
                    </div>
                    <div className="card-body">
                        {cahiers.length === 0 ? (
                            <p className="text-muted">Aucun cahier de texte pour le moment.</p>
                        ) : (
                            <table className="table table-hover">
                                <thead>
                                    <tr>
                                        <th>Matière</th>
                                        <th>Enseignant</th>
                                        <th>Titre</th>
                                        <th>Date</th>
                                        <th>Statut</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(selectedEnseignant 
                                        ? cahiers.filter(c => enseignants.find(e => String(e.id) === String(selectedEnseignant) && `${e.nom} ${e.prenom}` === `${c.enseignant_nom} ${c.enseignant_prenom}`))
                                        : cahiers).map(c => {
                                        const { cls, label } = getStatutBadge(c.statut);
                                        return (
                                            <tr key={c.id}>
                                                <td>{c.matiere}</td>
                                                <td>{c.enseignant_nom} {c.enseignant_prenom}</td>
                                                <td>{c.titre_cours}</td>
                                                <td>{new Date(c.date_creation).toLocaleDateString('fr-FR')}</td>
                                                <td><span className={`badge ${cls}`}>{label}</span></td>
                                                <td>
                                                    <button className="btn btn-sm btn-info text-white me-1"
                                                        onClick={() => { setSelectedCahier(c); setShowDetail(true); setShowForm(false); setShowSignForm(false); window.scrollTo(0,0); }}>
                                                        👁️ Voir
                                                    </button>
                                                    <button className="btn btn-sm btn-danger me-1"
                                                        onClick={() => exportCahier(c)}>
                                                        📄 PDF
                                                    </button>
                                                    {c.statut === 'brouillon' && (
                                                        <button className="btn btn-sm btn-warning"
                                                            onClick={() => handleSigner(c)}>
                                                            ✍️ Signer
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CahierTextePage;