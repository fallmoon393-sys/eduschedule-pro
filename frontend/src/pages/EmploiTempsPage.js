import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const EmploiTempsPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [classes, setClasses] = useState([]);
    const [enseignants, setEnseignants] = useState([]);
    const [matieres, setMatieres] = useState([]);
    const [salles, setSalles] = useState([]);
    const [emploiTemps, setEmploiTemps] = useState([]);
    const [selectedClasse, setSelectedClasse] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [newCreneau, setNewCreneau] = useState({
        id_classe: '',
        semaine_debut: '',
        id_matiere: '',
        id_enseignant: '',
        id_salle: '',
        jour: 'Lundi',
        heure_debut: '',
        heure_fin: ''
    });

    useEffect(() => {
        api.get('/classes.php').then(res => setClasses(res.data));
        api.get('/enseignants.php').then(res => setEnseignants(res.data));
        api.get('/matieres.php').then(res => setMatieres(res.data));
        api.get('/salles.php').then(res => setSalles(res.data));
    }, []);

    useEffect(() => {
        if (selectedClasse) {
            api.get(`/emploi_temps.php?id_classe=${selectedClasse}`)
                .then(res => setEmploiTemps(res.data));
        }
    }, [selectedClasse]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/emploi_temps.php', {
                id_classe: newCreneau.id_classe,
                semaine_debut: newCreneau.semaine_debut,
                creneaux: [{
                    id_matiere: newCreneau.id_matiere,
                    id_enseignant: newCreneau.id_enseignant,
                    id_salle: newCreneau.id_salle,
                    jour: newCreneau.jour,
                    heure_debut: newCreneau.heure_debut,
                    heure_fin: newCreneau.heure_fin
                }]
            });
            alert('Créneau créé avec succès !');
            setShowForm(false);
            setSelectedClasse(newCreneau.id_classe);
        } catch (err) {
            alert('Erreur lors de la création');
        }
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
                    <h4>Gestion de l'Emploi du Temps</h4>
                    <div className="d-flex gap-2">
                        <button className="btn btn-secondary" onClick={() => navigate('/dashboard/admin')}>
                            ← Retour
                        </button>
                        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                            + Nouveau créneau
                        </button>
                    </div>
                </div>

                {/* Formulaire création */}
                {showForm && (
                    <div className="card mb-4">
                        <div className="card-header bg-primary text-white">
                            <h5 className="mb-0">Créer un nouveau créneau</h5>
                        </div>
                        <div className="card-body">
                            <form onSubmit={handleSubmit}>
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label">Classe</label>
                                        <select className="form-select" required
                                            value={newCreneau.id_classe}
                                            onChange={e => setNewCreneau({...newCreneau, id_classe: e.target.value})}>
                                            <option value="">Sélectionner une classe</option>
                                            {classes.map(c => <option key={c.id} value={c.id}>{c.libelle}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Semaine du</label>
                                        <input type="date" className="form-control" required
                                            value={newCreneau.semaine_debut}
                                            onChange={e => setNewCreneau({...newCreneau, semaine_debut: e.target.value})} />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Matière</label>
                                        <select className="form-select" required
                                            value={newCreneau.id_matiere}
                                            onChange={e => setNewCreneau({...newCreneau, id_matiere: e.target.value})}>
                                            <option value="">Sélectionner une matière</option>
                                            {matieres.map(m => <option key={m.id} value={m.id}>{m.libelle}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Enseignant</label>
                                        <select className="form-select" required
                                            value={newCreneau.id_enseignant}
                                            onChange={e => setNewCreneau({...newCreneau, id_enseignant: e.target.value})}>
                                            <option value="">Sélectionner un enseignant</option>
                                            {enseignants.map(e => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label">Jour</label>
                                        <select className="form-select" required
                                            value={newCreneau.jour}
                                            onChange={e => setNewCreneau({...newCreneau, jour: e.target.value})}>
                                            {JOURS.map(j => <option key={j} value={j}>{j}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label">Heure début</label>
                                        <input type="time" className="form-control" required
                                            value={newCreneau.heure_debut}
                                            onChange={e => setNewCreneau({...newCreneau, heure_debut: e.target.value})} />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label">Heure fin</label>
                                        <input type="time" className="form-control" required
                                            value={newCreneau.heure_fin}
                                            onChange={e => setNewCreneau({...newCreneau, heure_fin: e.target.value})} />
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

                {/* Filtre par classe */}
                <div className="card mb-4">
                    <div className="card-body">
                        <div className="row">
                            <div className="col-md-4">
                                <label className="form-label">Filtrer par classe</label>
                                <select className="form-select"
                                    value={selectedClasse}
                                    onChange={e => setSelectedClasse(e.target.value)}>
                                    <option value="">Toutes les classes</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.libelle}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Liste emplois du temps */}
                <div className="card">
                    <div className="card-header bg-white">
                        <h5 className="mb-0">Emplois du temps</h5>
                    </div>
                    <div className="card-body">
                        {emploiTemps.length === 0 ? (
                            <p className="text-muted">Aucun emploi du temps trouvé.</p>
                        ) : (
                            <table className="table table-hover">
                                <thead>
                                    <tr>
                                        <th>Classe</th>
                                        <th>Semaine du</th>
                                        <th>Statut</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {emploiTemps.map(et => (
                                        <tr key={et.id}>
                                            <td>{et.classe_libelle}</td>
                                            <td>{et.semaine_debut}</td>
                                            <td>
                                                <span className={`badge ${et.statut_publication === 'publie' ? 'bg-success' : 'bg-warning'}`}>
                                                    {et.statut_publication}
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

export default EmploiTempsPage;