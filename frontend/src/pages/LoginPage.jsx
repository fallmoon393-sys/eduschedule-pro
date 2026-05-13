import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth }     from '../hooks/useAuth';
import { login as apiLogin } from '../utils/api';

export default function LoginPage() {
  const { login }    = useAuth();
  const navigate     = useNavigate();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [erreur, setErreur] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur(''); setLoading(true);
    try {
      const data = await apiLogin(form.email, form.password);
      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      setErreur(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="card shadow-sm" style={{ width: 380 }}>
        <div className="card-body p-4">
          <h1 className="h4 mb-1 fw-bold">EduSchedule Pro</h1>
          <p className="text-muted small mb-4">Connexion à votre espace</p>
          {erreur && <div className="alert alert-danger py-2">{erreur}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label small fw-medium">Email</label>
              <input type="email" className="form-control" required
                value={form.email}
                onChange={e => setForm(f => ({...f, email: e.target.value}))} />
            </div>
            <div className="mb-4">
              <label className="form-label small fw-medium">Mot de passe</label>
              <input type="password" className="form-control" required
                value={form.password}
                onChange={e => setForm(f => ({...f, password: e.target.value}))} />
            </div>
            <button className="btn btn-primary w-100" disabled={loading}>
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}