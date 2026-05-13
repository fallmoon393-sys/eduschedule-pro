import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { exportEmploiTemps } from '../utils/exportPDF';

const JOURS_SEMAINE = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MOIS_NOMS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const JOURS_FORM = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const COULEURS = ['#3498db','#e74c3c','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#34495e'];

const defaultForm = {
  id_classe: '', semaine_debut: '', id_matiere: '',
  id_enseignant: '', id_salle: '', jour: 'Lundi',
  heure_debut: '', heure_fin: ''
};

const EmploiTempsPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [enseignants, setEnseignants] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [salles, setSalles] = useState([]);
  const [creneaux, setCreneaux] = useState([]);
  const [selectedClasse, setSelectedClasse] = useState('');
  const [selectedEnseignant, setSelectedEnseignant] = useState('');
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [moisActif, setMoisActif] = useState(new Date().getMonth());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [vue, setVue] = useState('mois'); // 'mois' ou 'annee'

  useEffect(() => {
    api.get('/classes.php').then(r => setClasses(r.data)).catch(() => {});
    api.get('/enseignants.php').then(r => setEnseignants(r.data)).catch(() => {});
    api.get('/matieres.php').then(r => setMatieres(r.data)).catch(() => {});
    api.get('/salles.php').then(r => setSalles(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedClasse) {
      api.get(`/creneaux.php?id_emploi_temps=${selectedClasse}`).then(r => setCreneaux(r.data)).catch(() => {});
    } else {
      setCreneaux([]);
    }
  }, [selectedClasse]);

  const creneauxFiltres = selectedEnseignant 
    ? creneaux.filter(c => String(c.id_enseignant) === String(selectedEnseignant))
    : creneaux;

  const chargerCreneaux = () => {
    if (selectedClasse) {
      api.get(`/creneaux.php?id_emploi_temps=${selectedClasse}`).then(r => setCreneaux(r.data)).catch(() => {});
    }
  };

  // Construire les jours du mois
  const getDaysInMonth = (month, year) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const days = [];
    for (let i = 0; i < offset; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
    return days;
  };

  // Trouver les créneaux pour un jour donné
  const getCreneauxForDay = (date) => {
    if (!date) return [];
    const jourNom = JOURS_FORM[date.getDay() === 0 ? 6 : date.getDay() - 1];
    return creneauxFiltres.filter(c => c.jour === jourNom);
  };

  const getCouleurMatiere = (id_matiere) => {
    return COULEURS[(id_matiere - 1) % COULEURS.length];
  };

  const handleDayClick = (date) => {
    if (!date) return;
    const jourNom = JOURS_FORM[date.getDay() === 0 ? 6 : date.getDay() - 1];
    setSelectedDate(date);
    setForm({ ...defaultForm, jour: jourNom, semaine_debut: date.toISOString().split('T')[0], id_classe: selectedClasse });
    setEditId(null);
    setShowForm(true);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.put(`/creneaux.php/${editId}`, {
          id_matiere: form.id_matiere,
          id_enseignant: form.id_enseignant,
          id_salle: form.id_salle,
          jour: form.jour,
          heure_debut: form.heure_debut,
          heure_fin: form.heure_fin
        });
        alert('Créneau modifié !');
      } else {
        await api.post('/emploi_temps.php', {
          id_classe: form.id_classe || selectedClasse,
          semaine_debut: form.semaine_debut,
          creneaux: [{
            id_matiere: form.id_matiere,
            id_enseignant: form.id_enseignant,
            id_salle: form.id_salle,
            jour: form.jour,
            heure_debut: form.heure_debut,
            heure_fin: form.heure_fin
          }]
        });
        alert('Créneau créé !');
      }
      setShowForm(false);
      setEditId(null);
      setForm(defaultForm);
      chargerCreneaux();
    } catch (err) {
      alert('Erreur lors de l\'opération');
    }
  };

  const handleEdit = (creneau, e) => {
    e.stopPropagation();
    setEditId(creneau.id);
    setForm({
      id_classe: selectedClasse,
      semaine_debut: '',
      id_matiere: creneau.id_matiere,
      id_enseignant: creneau.id_enseignant,
      id_salle: creneau.id_salle,
      jour: creneau.jour,
      heure_debut: creneau.heure_debut?.substring(0, 5),
      heure_fin: creneau.heure_fin?.substring(0, 5)
    });
    setShowForm(true);
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/creneaux.php/${id}`);
      alert('Créneau supprimé !');
      setShowDeleteConfirm(null);
      chargerCreneaux();
    } catch (err) {
      alert('Erreur lors de la suppression');
    }
  };

  const today = new Date();

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
        {/* En-tête */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4>📅 Emploi du Temps</h4>
          <div className="d-flex gap-2">
            <button className="btn btn-secondary" onClick={() => navigate('/dashboard/admin')}>← Retour</button>
            <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({...defaultForm, id_classe: selectedClasse}); setShowForm(!showForm); }}>
              + Nouveau créneau
            </button>
          </div>
        </div>

        {/* Filtres */}
        <div className="card mb-4">
          <div className="card-body">
            <div className="row g-3 align-items-end">
              <div className="col-md-4">
                <label className="form-label fw-bold">Classe</label>
                <select className="form-select" value={selectedClasse} onChange={e => setSelectedClasse(e.target.value)}>
                  <option value="">-- Choisir une classe --</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.libelle}</option>)}
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
              <div className="col-md-3">
                <label className="form-label fw-bold">Enseignant</label>
                <select className="form-select" value={selectedEnseignant} onChange={e => setSelectedEnseignant(e.target.value)}>
                  <option value="">-- Tous les enseignants --</option>
                  {enseignants.map(e => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label fw-bold">Vue</label>
                <div className="btn-group d-block">
                  <button className={`btn btn-sm ${vue === 'mois' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setVue('mois')}>
                    Mensuelle
                  </button>
                  <button className={`btn btn-sm ${vue === 'annee' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setVue('annee')}>
                    Annuelle
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Formulaire création/modification */}
        {showForm && (
          <div className="card mb-4">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">{editId ? '✏️ Modifier le créneau' : '+ Nouveau créneau'}</h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  {!editId && (
                    <>
                      <div className="col-md-4">
                        <label className="form-label">Classe</label>
                        <select className="form-select" required value={form.id_classe}
                          onChange={e => setForm({...form, id_classe: e.target.value})}>
                          <option value="">Sélectionner</option>
                          {classes.map(c => <option key={c.id} value={c.id}>{c.libelle}</option>)}
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Date de début de semaine</label>
                        <input type="date" className="form-control" required
                          value={form.semaine_debut}
                          onChange={e => setForm({...form, semaine_debut: e.target.value})} />
                      </div>
                    </>
                  )}
                  <div className="col-md-4">
                    <label className="form-label">Jour</label>
                    <select className="form-select" required value={form.jour}
                      onChange={e => setForm({...form, jour: e.target.value})}>
                      {JOURS_FORM.map(j => <option key={j} value={j}>{j}</option>)}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Matière</label>
                    <select className="form-select" required value={form.id_matiere}
                      onChange={e => setForm({...form, id_matiere: e.target.value})}>
                      <option value="">Sélectionner</option>
                      {matieres.map(m => <option key={m.id} value={m.id}>{m.libelle}</option>)}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Enseignant</label>
                    <select className="form-select" required value={form.id_enseignant}
                      onChange={e => setForm({...form, id_enseignant: e.target.value})}>
                      <option value="">Sélectionner</option>
                      {enseignants.map(e => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Salle</label>
                    <select className="form-select" required value={form.id_salle}
                      onChange={e => setForm({...form, id_salle: e.target.value})}>
                      <option value="">Sélectionner</option>
                      {salles.map(s => <option key={s.id} value={s.id}>{s.code} - {s.batiment}</option>)}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Heure début</label>
                    <input type="time" className="form-control" required min="06:00" max="22:00"
                      value={form.heure_debut} onChange={e => setForm({...form, heure_debut: e.target.value})} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Heure fin</label>
                    <input type="time" className="form-control" required min="06:00" max="22:00"
                      value={form.heure_fin} onChange={e => setForm({...form, heure_fin: e.target.value})} />
                  </div>
                </div>
                <div className="mt-3">
                  <button type="submit" className="btn btn-success me-2">{editId ? '💾 Enregistrer' : 'Créer'}</button>
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditId(null); setForm(defaultForm); }}>Annuler</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Confirmation suppression */}
        {showDeleteConfirm && (
          <div className="alert alert-danger d-flex justify-content-between align-items-center mb-4">
            <span>⚠️ Supprimer ce créneau ?</span>
            <div>
              <button className="btn btn-danger btn-sm me-2" onClick={() => handleDelete(showDeleteConfirm)}>Supprimer</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowDeleteConfirm(null)}>Annuler</button>
            </div>
          </div>
        )}

        {/* Légende des matières */}
        {selectedClasse && creneaux.length > 0 && (
          <div className="card mb-3">
            <div className="card-body py-2">
              <div className="d-flex flex-wrap gap-2 align-items-center">
                <span className="fw-bold me-2">Légende :</span>
                {[...new Map(creneaux.map(c => [c.id_matiere, c])).values()].map(c => (
                  <span key={c.id_matiere} className="badge px-3 py-2"
                    style={{backgroundColor: getCouleurMatiere(c.id_matiere)}}>
                    {c.matiere}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VUE MENSUELLE */}
        {vue === 'mois' && (
          <div className="card">
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
                  <tr>
                    {JOURS_SEMAINE.map(j => <th key={j} className="text-center py-2">{j}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const days = getDaysInMonth(moisActif, annee);
                    const weeks = [];
                    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
                    return weeks.map((week, wi) => (
                      <tr key={wi}>
                        {week.map((date, di) => {
                          const isToday = date && date.toDateString() === today.toDateString();
                          const evenements = getCreneauxForDay(date);
                          return (
                            <td key={di}
                              style={{ minHeight: '100px', verticalAlign: 'top', cursor: date ? 'pointer' : 'default', backgroundColor: isToday ? '#fff3cd' : date ? 'white' : '#f8f9fa' }}
                              onClick={() => date && selectedClasse && handleDayClick(date)}>
                              {date && (
                                <>
                                  <div className={`fw-bold mb-1 ${isToday ? 'text-warning' : 'text-muted'}`}
                                    style={{fontSize: '0.85rem'}}>
                                    {isToday ? '⭐ ' : ''}{date.getDate()}
                                  </div>
                                  {evenements.map((c, i) => (
                                    <div key={i} className="rounded px-1 mb-1 d-flex justify-content-between align-items-center"
                                      style={{backgroundColor: getCouleurMatiere(c.id_matiere), color: 'white', fontSize: '0.7rem'}}>
                                      <span>{c.heure_debut?.substring(0,5)} {c.matiere}</span>
                                      <div className="d-flex gap-1">
                                        <button className="btn btn-sm p-0 px-1 text-white"
                                          style={{fontSize: '0.6rem', background: 'rgba(255,255,255,0.2)'}}
                                          onClick={(e) => handleEdit(c, e)}>✏️</button>
                                        <button className="btn btn-sm p-0 px-1 text-white"
                                          style={{fontSize: '0.6rem', background: 'rgba(255,255,255,0.2)'}}
                                          onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(c.id); }}>🗑️</button>
                                      </div>
                                    </div>
                                  ))}
                                  {date && selectedClasse && evenements.length === 0 && (
                                    <div className="text-muted text-center" style={{fontSize: '0.65rem'}}>+ Ajouter</div>
                                  )}
                                </>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VUE ANNUELLE */}
        {vue === 'annee' && (
          <div className="row g-3">
            {MOIS_NOMS.map((nomMois, moisIdx) => {
              const days = getDaysInMonth(moisIdx, annee);
              const weeks = [];
              for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
              return (
                <div key={moisIdx} className="col-md-4 col-lg-3">
                  <div className="card h-100">
                    <div className="card-header bg-primary text-white text-center py-1 d-flex justify-content-between align-items-center">
                      <small className="fw-bold">{nomMois} {annee}</small>
                      <button className="btn btn-sm btn-outline-light py-0 px-1"
                        style={{fontSize: '0.65rem'}}
                        onClick={() => { setMoisActif(moisIdx); setVue('mois'); }}>
                        Détail
                      </button>
                    </div>
                    <div className="card-body p-1">
                      <table className="table table-sm table-bordered mb-0" style={{fontSize: '0.65rem'}}>
                        <thead>
                          <tr>
                            {JOURS_SEMAINE.map(j => <th key={j} className="text-center p-0">{j[0]}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {weeks.map((week, wi) => (
                            <tr key={wi}>
                              {week.map((date, di) => {
                                const isToday = date && date.toDateString() === today.toDateString();
                                const aDesEvenements = date && getCreneauxForDay(date).length > 0;
                                return (
                                  <td key={di} className="text-center p-0"
                                    style={{
                                      cursor: date && selectedClasse ? 'pointer' : 'default',
                                      backgroundColor: isToday ? '#fff3cd' : aDesEvenements ? '#d4edda' : date ? 'white' : '#f8f9fa',
                                      fontWeight: isToday ? 'bold' : 'normal'
                                    }}
                                    onClick={() => date && selectedClasse && handleDayClick(date)}>
                                    {date ? date.getDate() : ''}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!selectedClasse && (
          <div className="alert alert-info mt-3">
            👆 Sélectionne une classe pour voir et planifier les cours.
          </div>
        )}
      </div>
    </div>
  );
};

export default EmploiTempsPage;