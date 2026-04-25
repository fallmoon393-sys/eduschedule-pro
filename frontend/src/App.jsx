import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage            from './pages/LoginPage';
import DashboardLayout      from './pages/DashboardLayout';
import DashboardAdminPage   from './pages/DashboardAdminPage';
import DashboardEnseignantPage from './pages/DashboardEnseignantPage';
import DashboardDeleguePage from './pages/DashboardDeleguePage';
import EmploiTempsPage      from './pages/EmploiTempsPage';
import QRScannerPage        from './pages/QRScannerPage';
import CahierTextePage      from './pages/CahierTextePage';
import VacationPage         from './pages/VacationPage';
import RapportsPage         from './pages/RapportsPage';
import GestionUsersPage     from './pages/GestionUsersPage';
import PrivateRoute         from './components/PrivateRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
        {/* Dashboard selon rôle */}
        <Route index element={<DashboardRedirect />} />
        <Route path="dashboard/admin"       element={<PrivateRoute roles={['administrateur']}><DashboardAdminPage /></PrivateRoute>} />
        <Route path="dashboard/enseignant"  element={<PrivateRoute roles={['enseignant']}><DashboardEnseignantPage /></PrivateRoute>} />
        <Route path="dashboard/delegue"     element={<PrivateRoute roles={['delegue']}><DashboardDeleguePage /></PrivateRoute>} />

        {/* Module 1 */}
        <Route path="emploi-temps"          element={<EmploiTempsPage />} />

        {/* Module 2 */}
        <Route path="scan"                  element={<PrivateRoute roles={['enseignant']}><QRScannerPage /></PrivateRoute>} />

        {/* Module 3 */}
        <Route path="cahier/:id_creneau"    element={<CahierTextePage />} />

        {/* Module 4 */}
        <Route path="vacations"             element={<VacationPage />} />

        {/* Admin */}
        <Route path="rapports"              element={<PrivateRoute roles={['administrateur','surveillant']}><RapportsPage /></PrivateRoute>} />
        <Route path="utilisateurs"          element={<PrivateRoute roles={['administrateur']}><GestionUsersPage /></PrivateRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function DashboardRedirect() {
  const { user } = useAuth();
  const routes = {
    administrateur: '/dashboard/admin',
    enseignant:     '/dashboard/enseignant',
    delegue:        '/dashboard/delegue',
    surveillant:    '/dashboard/admin',
    comptable:      '/vacations',
    etudiant:       '/emploi-temps',
  };
  return <Navigate to={routes[user?.role] ?? '/login'} replace />;
}