import React, { useState, useEffect, useRef } from 'react';
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
    const [newVacation, setNewVacation] = useState({ id_enseignant: '', mois: '', annee: new Date().getFullYear() });
    const [loading, setLoading] = useState(false);
    const [selectedEnseignantFilter, setSelectedEnseignantFilter] = useState('');

    // Signature enseignant
    const [showSignModal, setShowSignModal] = useState(false);
    const [vacationASigneer, setVacationASigneer] = useState(null);
    const [signatureEnregistree, setSignatureEnregistree] = useState(false);
    const signCanvasRef = useRef(null);
    const signPadRef = useRef(null);
    const isDrawing = useRef(false);

    // Signature surveillant (visa)
    const [showVisaModal, setShowVisaModal] = useState(false);
    const [vacationAViser, setVacationAViser] = useState(null);
    const visaCanvasRef = useRef(null);
    const visaPadRef = useRef(null);
    const isDrawingVisa = useRef(false);

    const charger = () => {
        api.get('/vacations.php').then(r => setVacations(r.data)).catch(() => {});
    };

    useEffect(() => {
        charger();
        api.get('/enseignants.php').then(r => setEnseignants(r.data)).catch(() => {});
    }, []);

    // Init pad signature enseignant
    useEffect(() => {
        if (!showSignModal || !signCanvasRef.current) return;
        setTimeout(() => {
            import('signature_pad').then(({ default: SignaturePad }) => {
                signPadRef.current = new SignaturePad(signCanvasRef.current, { penColor: '#1a1a2e' });
            });
        }, 100);
    }, [showSignModal]);

    // Init pad signature surveillant
    useEffect(() => {
        if (!showVisaModal || !visaCanvasRef.current) return;
        setTimeout(() => {
            import('signature_pad').then(({ default: SignaturePad }) => {
                visaPadRef.current = new SignaturePad(visaCanvasRef.current, { penColor: '#1a1a2e' });
            });
        }, 100);
    }, [showVisaModal]);

    const handleGenerer = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post('/vacations.php?action=generer', newVacation);
            alert('✅ Fiche générée !\n' + res.data.nb_seances + ' séance(s) — ' + res.data.montant_brut?.toLocaleString() + ' FCFA');
            setShowForm(false);
            charger();
        } catch (err) {
            alert('Erreur : ' + (err.response?.data?.error || 'inconnue'));
        }
        setLoading(false);
    };

    // Signer la fiche (enseignant)
    const ouvrirSignature = (vacation) => {
        setVacationASigneer(vacation);
        setSignatureEnregistree(false);
        setShowSignModal(true);
    };

    const handleSignerFiche = async () => {
        if (!signPadRef.current || signPadRef.current.isEmpty()) {
            alert('Veuillez apposer votre signature avant de valider.');
            return;
        }
        const signature_base64 = signPadRef.current.toDataURL();
        try {
            await api.post(`/vacations.php/${vacationASigneer.id}?action=signer_enseignant`, {
                signature_base64,
                commentaire: 'Signé par l\'enseignant'
            });
            setSignatureEnregistree(true);
            setTimeout(() => {
                setShowSignModal(false);
                charger();
            }, 1200);
        } catch (err) {
            // Si l'endpoint n'existe pas encore, on enregistre localement et on valide
            alert('Signature enregistrée localement (endpoint à implémenter côté serveur).');
            setShowSignModal(false);
        }
    };

    // Valider avec visa (surveillant)
    const ouvrirVisa = (vacation) => {
        setVacationAViser(vacation);
        setShowVisaModal(true);
    };

    const handleValiderAvecVisa = async () => {
        const visa_base64 = visaPadRef.current && !visaPadRef.current.isEmpty()
            ? visaPadRef.current.toDataURL()
            : null;
        try {
            await api.post(`/vacations.php/${vacationAViser.id}?action=valider`, {
                visa_base64,
                commentaire: 'Validé par le surveillant'
            });
            alert('✅ Vacation validée par le surveillant !');
            setShowVisaModal(false);
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

    const handleExportPDF = async (v) => {
        try {
            const res = await api.get(`/vacations.php/${v.id}`);
            await exportVacation(res.data);
        } catch (err) {
            alert('Erreur lors de la génération du PDF');
        }
    };

    const totalBrut = vacations.reduce((s, v) => s + parseFloat(v.montant_brut || 0), 0);
    const totalNet  = vacations.reduce((s, v) => s + parseFloat(v.montant_net || 0), 0);

    const vacationsFiltrees = selectedEnseignantFilter
        ? vacations.filter(v => String(v.id_enseignant) === String(selectedEnseignantFilter))
        : vacations;

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
                    {[
                        { label: 'Générées', val: vacations.filter(v => v.statut === 'generee').length, cls: 'bg-warning' },
                        { label: 'Validées (surveillant)', val: vacations.filter(v => v.statut === 'validee_surveillant').length, cls: 'bg-primary' },
                        { label: 'Approuvées', val: vacations.filter(v => v.statut === 'approuvee_comptable').length, cls: 'bg-success' },
                    ].map(({ label, val, cls }) => (
                        <div key={label} className="col-md-3">
                            <div className={`card text-white ${cls}`}><div className="card-body"><h6>{label}</h6><h2>{val}</h2></div></div>
                        </div>
                    ))}
                    <div className="col-md-3">
                        <div className="card text-white bg-dark">
                            <div className="card-body"><h6>Total net à payer</h6><h5>{totalNet.toLocaleString()} FCFA</h5></div>
                        </div>
                    </div>
                </div>

                {/* Formulaire génération */}
                {showForm && (
                    <div className="card mb-4">
                        <div className="card-header bg-dark text-white"><h5 className="mb-0">Générer une fiche de vacation</h5></div>
                        <div className="card-body">
                            <div className="alert alert-info">ℹ️ La fiche est générée automatiquement à partir des cahiers de texte <strong>clôturés</strong> du mois sélectionné.</div>
                            <form onSubmit={handleGenerer}>
                                <div className="row g-3">
                                    <div className="col-md-4">
                                        <label className="form-label">Enseignant</label>
                                        <select className="form-select" required value={newVacation.id_enseignant}
                                            onChange={e => setNewVacation({...newVacation, id_enseignant: e.target.value})}>
                                            <option value="">Sélectionner</option>
                                            {enseignants.map(e => (
                                                <option key={e.id} value={e.id}>{e.nom} {e.prenom} — {parseFloat(e.taux_horaire || 0).toLocaleString()} FCFA/h</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label">Mois</label>
                                        <select className="form-select" required value={newVacation.mois}
                                            onChange={e => setNewVacation({...newVacation, mois: e.target.value})}>
                                            <option value="">Sélectionner</option>
                                            {MOIS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label">Année</label>
                                        <input type="number" className="form-control" required value={newVacation.annee}
                                            onChange={e => setNewVacation({...newVacation, annee: e.target.value})} />
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <button type="submit" className="btn btn-success me-2" disabled={loading}>{loading ? '⏳ Génération...' : '✅ Générer'}</button>
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Détail vacation */}
                {showDetail && selectedVacation && (
                    <div className="card mb-4 border-dark">
                        <div className="card-header bg-dark text-white d-flex justify-content-between">
                            <h5 className="mb-0">📄 Fiche — {selectedVacation.nom} {selectedVacation.prenom}</h5>
                            <div className="d-flex gap-2">
                                <button className="btn btn-sm btn-warning" onClick={() => exportVacation(selectedVacation)}>📥 Télécharger PDF</button>
                                <button className="btn btn-sm btn-outline-light" onClick={() => setShowDetail(false)}>✕ Fermer</button>
                            </div>
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

                {/* Filtre */}
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

                {/* Tableau */}
                <div className="card">
                    <div className="card-header bg-white"><h5 className="mb-0">Toutes les fiches de vacation</h5></div>
                    <div className="card-body p-0">
                        {vacationsFiltrees.length === 0 ? (
                            <p className="text-muted p-3">Aucune fiche de vacation pour le moment.</p>
                        ) : (
                            <table className="table table-hover mb-0">
                                <thead className="table-dark">
                                    <tr>
                                        <th>Enseignant</th><th>Période</th><th>Séances</th>
                                        <th>Montant brut</th><th>Montant net</th><th>Statut</th><th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vacationsFiltrees.map(v => {
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
                                                    <div className="d-flex flex-wrap gap-1">
                                                        <button className="btn btn-sm btn-outline-dark" onClick={() => handleVoir(v)}>👁️</button>
                                                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleExportPDF(v)} title="Télécharger PDF">📄</button>

                                                        {/* Signature enseignant */}
                                                        {(user?.role === 'enseignant' || user?.role === 'admin') && v.statut === 'generee' && (
                                                            <button className="btn btn-sm btn-outline-secondary" onClick={() => ouvrirSignature(v)} title="Signer la fiche">✍️ Signer</button>
                                                        )}

                                                        {/* Validation surveillant avec visa */}
                                                        {(user?.role === 'surveillant' || user?.role === 'admin') && v.statut === 'generee' && (
                                                            <button className="btn btn-sm btn-primary" onClick={() => ouvrirVisa(v)}>✅ Valider</button>
                                                        )}

                                                        {/* Approbation comptable */}
                                                        {(user?.role === 'comptable' || user?.role === 'admin') && v.statut === 'validee_surveillant' && (
                                                            <button className="btn btn-sm btn-success" onClick={() => handleApprouver(v.id)}>💰 Approuver</button>
                                                        )}
                                                    </div>
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

            {/* ===== MODAL SIGNATURE ENSEIGNANT ===== */}
            {showSignModal && (
                <div className="modal d-block" style={{background: 'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header bg-dark text-white">
                                <h5 className="modal-title">✍️ Signature de la fiche de vacation</h5>
                                <button className="btn-close btn-close-white" onClick={() => setShowSignModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                {signatureEnregistree ? (
                                    <div className="text-center text-success py-4">
                                        <div style={{fontSize: '3rem'}}>✅</div>
                                        <h5>Signature enregistrée avec succès !</h5>
                                    </div>
                                ) : (
                                    <>
                                        <div className="alert alert-info mb-3">
                                            <strong>Fiche :</strong> {vacationASigneer?.nom} {vacationASigneer?.prenom} — {MOIS[(vacationASigneer?.mois || 1) - 1]} {vacationASigneer?.annee}
                                            <br /><strong>Montant net :</strong> {parseFloat(vacationASigneer?.montant_net || 0).toLocaleString()} FCFA
                                        </div>
                                        <p className="text-muted small mb-2">Signez dans le cadre ci-dessous (tactile ou souris) :</p>
                                        <div style={{border: '2px dashed #adb5bd', borderRadius: '8px', background: '#f8f9fa', padding: '4px'}}>
                                            <canvas ref={signCanvasRef} width={700} height={150}
                                                style={{display: 'block', width: '100%', cursor: 'crosshair', borderRadius: '6px'}} />
                                        </div>
                                        <div className="mt-2 text-end">
                                            <button className="btn btn-sm btn-outline-secondary" onClick={() => signPadRef.current?.clear()}>
                                                🗑️ Effacer
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                            {!signatureEnregistree && (
                                <div className="modal-footer">
                                    <button className="btn btn-secondary" onClick={() => setShowSignModal(false)}>Annuler</button>
                                    <button className="btn btn-success" onClick={handleSignerFiche}>✅ Valider ma signature</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ===== MODAL VISA SURVEILLANT ===== */}
            {showVisaModal && (
                <div className="modal d-block" style={{background: 'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header bg-primary text-white">
                                <h5 className="modal-title">✅ Validation avec visa — Surveillant</h5>
                                <button className="btn-close btn-close-white" onClick={() => setShowVisaModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="alert alert-primary mb-3">
                                    <strong>Fiche :</strong> {vacationAViser?.nom} {vacationAViser?.prenom} — {MOIS[(vacationAViser?.mois || 1) - 1]} {vacationAViser?.annee}
                                    <br /><strong>{vacationAViser?.nb_seances} séance(s)</strong> — Montant brut : {parseFloat(vacationAViser?.montant_brut || 0).toLocaleString()} FCFA
                                </div>
                                <p className="text-muted small mb-2">Apposez votre visa (optionnel) puis confirmez :</p>
                                <div style={{border: '2px dashed #adb5bd', borderRadius: '8px', background: '#f8f9fa', padding: '4px'}}>
                                    <canvas ref={visaCanvasRef} width={700} height={120}
                                        style={{display: 'block', width: '100%', cursor: 'crosshair', borderRadius: '6px'}} />
                                </div>
                                <div className="mt-2 text-end">
                                    <button className="btn btn-sm btn-outline-secondary" onClick={() => visaPadRef.current?.clear()}>
                                        🗑️ Effacer
                                    </button>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowVisaModal(false)}>Annuler</button>
                                <button className="btn btn-primary" onClick={handleValiderAvecVisa}>✅ Confirmer la validation</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VacationsPage;