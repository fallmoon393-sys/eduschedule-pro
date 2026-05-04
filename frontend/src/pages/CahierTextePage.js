import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import SignaturePad from 'signature_pad';

const CahierTextePage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [cahiers, setCahiers] = useState([]);
    const [creneaux, setCreneaux] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [newCahier, setNewCahier] = useState({
        id_creneau: '',
        titre_cours: '',
        contenu_json: '',
        travaux: ''
    });
    const canvasRef = useRef(null);
    const signaturePadRef = useRef(null);

    useEffect(() => {
        api.get('/cahiers.php').then(res => setCahiers(res.data)).catch(() => {});
        api.get('/creneaux.php').then(res => setCreneaux(res.data)).catch(() => {});
    }, []);

    useEffect(() => {
        if (showForm && canvasRef.current) {
            signaturePadRef.current = new SignaturePad(canvasRef.current);
        }
    }, [showForm]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/cahiers.php', {
                id_creneau: newCahier.id_creneau,
                titre_cours: newCahier.titre_cours,
                contenu_json: { points: newCahier.contenu_json },
                travaux: newCahier.travaux ? [{ description: newCahier.travaux, type: 'devoir' }] : []
            });
            alert('Cahier créé avec succès !');
            setShowForm(false);
            api.get('/cahiers.php').then(res => setCahiers(res.data));
        } catch (err) {
            alert('Erreur lors de la création');
        }
    };

    const clearSignature = () => {
        if (signaturePadRef.current) {
            signaturePadRef.current.clear();
        }
    };

    return (
        <div>
            <nav className="navbar navbar-dark bg-info px-4">
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
                    <h4>Cahier de Texte Numérique</h4>
                    <div className="d-flex gap-2">
                        <button className="btn btn-secondary" onClick={() => navigate('/dashboard/delegue')}>
                            ← Retour
                        </button>
                        <button className="btn btn-info text-white" onClick={() => setShowForm(!showForm)}>
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
                                            value={newCahier.id_creneau}
                                            onChange={e => setNewCahier({...newCahier, id_creneau: e.target.value})}>
                                            <option value="">Sélectionner un créneau</option>
                                            {creneaux.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    {c.jour} - {c.matiere} - {c.enseignant}
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
                                            value={newCahier.contenu_json}
                                            onChange={e => setNewCahier({...newCahier, contenu_json: e.target.value})}>
                                        </textarea>
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
                                        <div className="border rounded p-2">
                                            <canvas ref={canvasRef} width="400" height="150"
                                                style={{border: '1px solid #ccc', width: '100%'}}></canvas>
                                        </div>
                                        <button type="button" className="btn btn-sm btn-secondary mt-2"
                                            onClick={clearSignature}>
                                            Effacer signature
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <button type="submit" className="btn btn-success me-2">Créer</button>
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Liste des cahiers */}
                <div className="card">
                    <div className="card-header bg-white">
                        <h5 className="mb-0">Mes cahiers de texte</h5>
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
                                        <th>Statut</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cahiers.map(c => (
                                        <tr key={c.id}>
                                            <td>{c.matiere}</td>
                                            <td>{c.enseignant_nom} {c.enseignant_prenom}</td>
                                            <td>{c.titre_cours}</td>
                                            <td>
                                                <span className={`badge ${c.statut === 'cloture' ? 'bg-success' : c.statut === 'signe_delegue' ? 'bg-warning' : 'bg-secondary'}`}>
                                                    {c.statut}
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

export default CahierTextePage;