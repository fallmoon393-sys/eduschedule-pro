import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const QRCodePage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [creneaux, setCreneaux] = useState([]);
    const [qrCode, setQrCode] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Charger les créneaux du jour
        api.get('/creneaux.php').then(res => setCreneaux(res.data)).catch(() => {});
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const genererQR = async (id_creneau) => {
        setLoading(true);
        try {
            const res = await api.get(`/creneaux.php/${id_creneau}/qr`);
            setQrCode(res.data);
        } catch (err) {
            alert('Erreur lors de la génération du QR Code');
        }
        setLoading(false);
    };

    return (
        <div>
            <nav className="navbar navbar-dark bg-primary px-4">
                <span className="navbar-brand fw-bold">EduSchedule Pro</span>
                <div className="d-flex align-items-center gap-3">
                    <span className="text-white">👤 {user?.email}</span>
                    <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
                        Déconnexion
                    </button>
                </div>
            </nav>

            <div className="container mt-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h4>Gestion des QR Codes</h4>
                    <button className="btn btn-secondary" onClick={() => navigate('/dashboard/admin')}>
                        ← Retour
                    </button>
                </div>

                {/* QR Code généré */}
                {qrCode && (
                    <div className="card mb-4 text-center">
                        <div className="card-header bg-success text-white">
                            <h5 className="mb-0">QR Code généré ✅</h5>
                        </div>
                        <div className="card-body">
                            <p className="text-muted">Token : <strong>{qrCode.token}</strong></p>
                            <p className="text-muted">Expire à : <strong>{qrCode.expire}</strong></p>
                            <div className="alert alert-info">
                                Ce QR Code est valide pendant 15 minutes autour de l'heure du cours.
                            </div>
                            <button className="btn btn-secondary" onClick={() => setQrCode(null)}>
                                Fermer
                            </button>
                        </div>
                    </div>
                )}

                {/* Liste des créneaux */}
                <div className="card">
                    <div className="card-header bg-white">
                        <h5 className="mb-0">Créneaux — Générer un QR Code</h5>
                    </div>
                    <div className="card-body">
                        {creneaux.length === 0 ? (
                            <p className="text-muted">Aucun créneau disponible.</p>
                        ) : (
                            <table className="table table-hover">
                                <thead>
                                    <tr>
                                        <th>Jour</th>
                                        <th>Matière</th>
                                        <th>Enseignant</th>
                                        <th>Heure début</th>
                                        <th>Heure fin</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {creneaux.map(c => (
                                        <tr key={c.id}>
                                            <td>{c.jour}</td>
                                            <td>{c.matiere}</td>
                                            <td>{c.enseignant}</td>
                                            <td>{c.heure_debut}</td>
                                            <td>{c.heure_fin}</td>
                                            <td>
                                                <button
                                                    className="btn btn-sm btn-primary"
                                                    onClick={() => genererQR(c.id)}
                                                    disabled={loading}>
                                                    📱 Générer QR
                                                </button>
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

export default QRCodePage;