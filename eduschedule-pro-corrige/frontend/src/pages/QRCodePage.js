import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { QRCodeSVG } from 'qrcode.react';

const JOURS_ORDER = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];

const QRCodePage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [creneaux, setCreneaux] = useState([]);
    const [classes, setClasses] = useState([]);
    const [selectedClasse, setSelectedClasse] = useState('');
    const [qrCode, setQrCode] = useState(null);
    const [loading, setLoading] = useState(false);
    const [pointages, setPointages] = useState([]);
    const [scanLogs, setScanLogs] = useState([]);
    const [onglet, setOnglet] = useState('qr'); // 'qr' | 'scan' | 'logs'
    const [scanResult, setScanResult] = useState(null);
    const [scanToken, setScanToken] = useState('');
    const [scanning, setScanning] = useState(false);
    const qrRef = useRef(null);

    useEffect(() => {
        api.get('/classes.php').then(r => setClasses(r.data)).catch(() => {});
        api.get('/pointages.php').then(r => setPointages(r.data)).catch(() => {});
        if (user?.role === 'admin' || user?.role === 'surveillant') {
            api.get('/pointages.php/logs').then(r => setScanLogs(r.data)).catch(() => {});
        }
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

    const genererQR = async (id_creneau) => {
        setLoading(true);
        setQrCode(null);
        try {
            const res = await api.get(`/creneaux.php/${id_creneau}/qr`);
            setQrCode(res.data);
        } catch (err) {
            alert('Erreur lors de la génération du QR Code');
        }
        setLoading(false);
    };

    const handleScan = async (e) => {
        e.preventDefault();
        if (!scanToken.trim()) return;
        setScanning(true);
        setScanResult(null);
        try {
            const res = await api.post('/pointages.php/scan', { token_qr: scanToken.trim() });
            setScanResult({ success: true, data: res.data });
            api.get('/pointages.php').then(r => setPointages(r.data)).catch(() => {});
        } catch (err) {
            setScanResult({ success: false, error: err.response?.data?.error || 'Erreur inconnue' });
        }
        setScanning(false);
        setScanToken('');
    };

    const getStatutBadge = (statut) => {
        if (statut === 'valide') return <span className="badge bg-success">✅ Valide</span>;
        if (statut === 'retard') return <span className="badge bg-warning text-dark">⚠️ Retard</span>;
        if (statut === 'absent') return <span className="badge bg-danger">❌ Absent</span>;
        return <span className="badge bg-secondary">{statut}</span>;
    };

    const getStatutQRBadge = (statut_qr) => {
        if (statut_qr === 'actif') return <span className="badge bg-success">🟢 Actif</span>;
        if (statut_qr === 'expire') return <span className="badge bg-secondary">⚫ Expiré</span>;
        return <span className="badge bg-light text-dark">⬜ Aucun</span>;
    };

    const imprimerQR = () => {
        const svg = qrRef.current?.querySelector('svg');
        if (!svg) return;
        const win = window.open('', '_blank');
        win.document.write(`
            <html><head><title>QR Code - ${qrCode.matiere}</title>
            <style>body{text-align:center;font-family:Arial;padding:40px} h2{margin-bottom:5px} p{margin:5px 0}</style>
            </head><body>
            <h2>${qrCode.matiere}</h2>
            <p>Enseignant : ${qrCode.enseignant}</p>
            <p>Horaire : ${qrCode.heure_debut?.substring(0,5)} — ${qrCode.heure_fin?.substring(0,5)}</p>
            <p>Valide jusqu'à : ${new Date(qrCode.fin_valide).toLocaleTimeString('fr-FR')}</p>
            <div style="margin:20px auto;display:inline-block">${svg.outerHTML}</div>
            <p style="font-size:12px;color:#666">EduSchedule Pro — Scanner pour pointer votre présence</p>
            </body></html>
        `);
        win.document.close();
        win.print();
    };

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
                    <h4>📱 Gestion des QR Codes & Pointages</h4>
                    <button className="btn btn-secondary" onClick={() => navigate('/dashboard/admin')}>← Retour</button>
                </div>

                {/* Onglets */}
                <ul className="nav nav-tabs mb-4">
                    <li className="nav-item">
                        <button className={`nav-link ${onglet === 'qr' ? 'active' : ''}`} onClick={() => setOnglet('qr')}>
                            🔲 Générer QR Codes
                        </button>
                    </li>
                    <li className="nav-item">
                        <button className={`nav-link ${onglet === 'scan' ? 'active' : ''}`} onClick={() => setOnglet('scan')}>
                            📷 Scanner / Pointer
                        </button>
                    </li>
                    <li className="nav-item">
                        <button className={`nav-link ${onglet === 'pointages' ? 'active' : ''}`} onClick={() => setOnglet('pointages')}>
                            📋 Pointages
                        </button>
                    </li>
                    {(user?.role === 'admin' || user?.role === 'surveillant') && (
                        <li className="nav-item">
                            <button className={`nav-link ${onglet === 'logs' ? 'active' : ''}`} onClick={() => setOnglet('logs')}>
                                🔍 Logs des scans
                            </button>
                        </li>
                    )}
                </ul>

                {/* ONGLET GÉNÉRER QR */}
                {onglet === 'qr' && (
                    <div>
                        {/* QR Code affiché */}
                        {qrCode && (
                            <div className="card mb-4">
                                <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
                                    <h5 className="mb-0">✅ QR Code généré</h5>
                                    <button className="btn btn-outline-light btn-sm" onClick={() => setQrCode(null)}>✕ Fermer</button>
                                </div>
                                <div className="card-body text-center" ref={qrRef}>
                                    <h5 className="mb-1">{qrCode.matiere}</h5>
                                    <p className="text-muted mb-1">Enseignant : {qrCode.enseignant}</p>
                                    <p className="text-muted mb-3">
                                        Horaire : {qrCode.heure_debut?.substring(0,5)} — {qrCode.heure_fin?.substring(0,5)}
                                    </p>
                                    <div className="d-flex justify-content-center mb-3">
                                        <QRCodeSVG value={`${window.location.origin}/scan/${qrCode.token}`} size={220} level="H" />
                                    </div>
                                    <div className="alert alert-info d-inline-block">
                                        <strong>⏰ Fenêtre de validité :</strong><br />
                                        Du {new Date(qrCode.debut_valide).toLocaleTimeString('fr-FR')} au {new Date(qrCode.fin_valide).toLocaleTimeString('fr-FR')}<br />
                                        <small>(±15 min autour de l'heure de cours)</small>
                                    </div>
                                    <div className="alert alert-warning d-inline-block ms-2">
                                        🔒 Usage unique — invalide après le premier scan
                                    </div>
                                    <div className="mt-3">
                                        <button className="btn btn-primary me-2" onClick={imprimerQR}>🖨️ Imprimer</button>
                                        <button className="btn btn-secondary" onClick={() => setQrCode(null)}>Fermer</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Sélection classe */}
                        <div className="card mb-3">
                            <div className="card-body">
                                <label className="form-label fw-bold">Filtrer par classe</label>
                                <select className="form-select" style={{maxWidth: '300px'}}
                                    value={selectedClasse} onChange={e => setSelectedClasse(e.target.value)}>
                                    <option value="">-- Toutes les classes --</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.libelle}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Liste des créneaux */}
                        <div className="card">
                            <div className="card-header bg-white">
                                <h5 className="mb-0">Créneaux — Générer un QR Code de séance</h5>
                            </div>
                            <div className="card-body p-0">
                                <table className="table table-hover mb-0">
                                    <thead className="table-dark">
                                        <tr>
                                            <th>Jour</th>
                                            <th>Matière</th>
                                            <th>Enseignant</th>
                                            <th>Salle</th>
                                            <th>Heure</th>
                                            <th>QR actuel</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {creneaux.length === 0 ? (
                                            <tr><td colSpan="7" className="text-center text-muted py-3">
                                                {selectedClasse ? 'Aucun créneau pour cette classe' : 'Sélectionner une classe'}
                                            </td></tr>
                                        ) : creneaux.map(c => (
                                            <tr key={c.id}>
                                                <td>{c.jour}</td>
                                                <td><span className="badge bg-primary">{c.matiere}</span></td>
                                                <td>{c.enseignant}</td>
                                                <td>{c.salle}</td>
                                                <td>{c.heure_debut?.substring(0,5)} — {c.heure_fin?.substring(0,5)}</td>
                                                <td>{getStatutQRBadge(c.statut_qr)}</td>
                                                <td>
                                                    <button className="btn btn-sm btn-success"
                                                        onClick={() => genererQR(c.id)}
                                                        disabled={loading}>
                                                        {loading ? '...' : '📱 Générer QR'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ONGLET SCANNER */}
                {onglet === 'scan' && (
                    <div className="row justify-content-center">
                        <div className="col-md-6">
                            <div className="card">
                                <div className="card-header bg-primary text-white">
                                    <h5 className="mb-0">📷 Pointer ma présence</h5>
                                </div>
                                <div className="card-body">
                                    <p className="text-muted">Scannez le QR Code de la séance ou saisissez manuellement le token.</p>
                                    <form onSubmit={handleScan}>
                                        <div className="mb-3">
                                            <label className="form-label fw-bold">Token du QR Code</label>
                                            <input type="text" className="form-control form-control-lg"
                                                placeholder="Saisir ou coller le token..."
                                                value={scanToken}
                                                onChange={e => setScanToken(e.target.value)} />
                                        </div>
                                        <button type="submit" className="btn btn-primary w-100" disabled={scanning}>
                                            {scanning ? '⏳ Validation...' : '✅ Valider le pointage'}
                                        </button>
                                    </form>

                                    {/* Résultat du scan */}
                                    {scanResult && (
                                        <div className={`alert mt-4 ${scanResult.success ? 'alert-success' : 'alert-danger'}`}>
                                            {scanResult.success ? (
                                                <>
                                                    <h5>✅ Pointage enregistré !</h5>
                                                    <p><strong>Matière :</strong> {scanResult.data.creneau?.matiere}</p>
                                                    <p><strong>Classe :</strong> {scanResult.data.creneau?.classe}</p>
                                                    <p><strong>Heure :</strong> {scanResult.data.creneau?.heure_debut?.substring(0,5)} — {scanResult.data.creneau?.heure_fin?.substring(0,5)}</p>
                                                    <p><strong>Statut :</strong> {getStatutBadge(scanResult.data.statut)}</p>
                                                    {scanResult.data.alerte && (
                                                        <div className="alert alert-warning mt-2 mb-0">
                                                            {scanResult.data.alerte}
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <h5>❌ Échec du pointage</h5>
                                                    <p>{scanResult.error}</p>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ONGLET POINTAGES */}
                {onglet === 'pointages' && (
                    <div className="card">
                        <div className="card-header bg-white d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">📋 Historique des pointages</h5>
                            <div className="d-flex gap-2">
                                <span className="badge bg-success px-3 py-2">✅ Valide : {pointages.filter(p => p.statut === 'valide').length}</span>
                                <span className="badge bg-warning text-dark px-3 py-2">⚠️ Retard : {pointages.filter(p => p.statut === 'retard').length}</span>
                                <span className="badge bg-danger px-3 py-2">❌ Absent : {pointages.filter(p => p.statut === 'absent').length}</span>
                            </div>
                        </div>
                        <div className="card-body p-0">
                            <table className="table table-hover mb-0">
                                <thead className="table-dark">
                                    <tr>
                                        <th>Date</th>
                                        <th>Matière</th>
                                        <th>Classe</th>
                                        <th>Enseignant</th>
                                        <th>Heure prévue</th>
                                        <th>Heure réelle</th>
                                        <th>Statut</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pointages.length === 0 ? (
                                        <tr><td colSpan="7" className="text-center text-muted py-3">Aucun pointage enregistré</td></tr>
                                    ) : pointages.map(p => (
                                        <tr key={p.id}>
                                            <td>{new Date(p.created_at).toLocaleDateString('fr-FR')}</td>
                                            <td>{p.matiere}</td>
                                            <td>{p.classe}</td>
                                            <td>{p.enseignant}</td>
                                            <td>{p.heure_debut?.substring(0,5)}</td>
                                            <td>{p.heure_pointage_reelle ? new Date(p.heure_pointage_reelle).toLocaleTimeString('fr-FR') : '—'}</td>
                                            <td>{getStatutBadge(p.statut)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ONGLET LOGS */}
                {onglet === 'logs' && (user?.role === 'admin' || user?.role === 'surveillant') && (
                    <div className="card">
                        <div className="card-header bg-dark text-white">
                            <h5 className="mb-0">🔍 Log de toutes les tentatives de scan</h5>
                        </div>
                        <div className="card-body p-0">
                            <table className="table table-hover mb-0 table-sm">
                                <thead className="table-secondary">
                                    <tr>
                                        <th>Date/Heure</th>
                                        <th>Action</th>
                                        <th>Matière</th>
                                        <th>IP source</th>
                                        <th>Statut</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {scanLogs.length === 0 ? (
                                        <tr><td colSpan="5" className="text-center text-muted py-3">Aucun log disponible</td></tr>
                                    ) : scanLogs.map((log, i) => (
                                        <tr key={i}>
                                            <td>{new Date(log.created_at).toLocaleString('fr-FR')}</td>
                                            <td>{log.action}</td>
                                            <td>{log.matiere || '—'}</td>
                                            <td><code>{log.ip_source}</code></td>
                                            <td>
                                                {log.statut_scan === 'valide' && <span className="badge bg-success">Valide</span>}
                                                {log.statut_scan === 'retard' && <span className="badge bg-warning text-dark">Retard</span>}
                                                {log.statut_scan === 'expire' && <span className="badge bg-secondary">Expiré</span>}
                                                {log.statut_scan === 'doublon' && <span className="badge bg-info">Doublon</span>}
                                                {log.statut_scan === 'token_invalide' && <span className="badge bg-danger">Token invalide</span>}
                                                {log.action === 'generation' && <span className="badge bg-primary">Généré</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QRCodePage;