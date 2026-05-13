import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardAdmin from './pages/DashboardAdmin';
import DashboardEnseignant from './pages/DashboardEnseignant';
import DashboardDelegue from './pages/DashboardDelegue';
import DashboardSurveillant from './pages/DashboardSurveillant';
import DashboardComptable from './pages/DashboardComptable';
import EmploiTempsPage from './pages/EmploiTempsPage';
import QRCodePage from './pages/QRCodePage';
import CahierTextePage from './pages/CahierTextePage';
import VacationsPage from './pages/VacationsPage';
import 'bootstrap/dist/css/bootstrap.min.css';

export const getDashboardPath = (role) => {
    const routes = {
        admin:       '/dashboard/admin',
        enseignant:  '/dashboard/enseignant',
        delegue:     '/dashboard/delegue',
        surveillant: '/dashboard/surveillant',
        comptable:   '/dashboard/comptable',
    };
    return routes[role] ?? '/login';
};

const PrivateRoute = ({ children, roles }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center min-vh-100">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Chargement...</span>
                </div>
            </div>
        );
    }

    if (!user) return <Navigate to="/login" replace />;
    if (roles && roles.length > 0 && !roles.includes(user.role)) {
        return <Navigate to={getDashboardPath(user.role)} replace />;
    }
    return children;
};

const RootRedirect = () => {
    const { user, loading } = useAuth();
    if (loading) return null;
    if (!user) return <Navigate to="/login" replace />;
    return <Navigate to={getDashboardPath(user.role)} replace />;
};

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />

                    <Route path="/dashboard/admin" element={
                        <PrivateRoute roles={['admin']}><DashboardAdmin /></PrivateRoute>
                    } />
                    <Route path="/dashboard/enseignant" element={
                        <PrivateRoute roles={['enseignant']}><DashboardEnseignant /></PrivateRoute>
                    } />
                    <Route path="/dashboard/delegue" element={
                        <PrivateRoute roles={['delegue']}><DashboardDelegue /></PrivateRoute>
                    } />
                    <Route path="/dashboard/surveillant" element={
                        <PrivateRoute roles={['surveillant']}><DashboardSurveillant /></PrivateRoute>
                    } />
                    <Route path="/dashboard/comptable" element={
                        <PrivateRoute roles={['comptable']}><DashboardComptable /></PrivateRoute>
                    } />

                    <Route path="/emploi-temps" element={
                        <PrivateRoute roles={['admin']}><EmploiTempsPage /></PrivateRoute>
                    } />
                    <Route path="/qrcode" element={
                        <PrivateRoute roles={['admin']}><QRCodePage /></PrivateRoute>
                    } />
                    <Route path="/cahier-texte" element={
                        <PrivateRoute roles={['delegue']}><CahierTextePage /></PrivateRoute>
                    } />

                    <Route path="/vacations" element={
                        <PrivateRoute roles={['admin', 'enseignant', 'surveillant', 'comptable']}>
                            <VacationsPage />
                        </PrivateRoute>
                    } />

                    <Route path="/" element={<RootRedirect />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;