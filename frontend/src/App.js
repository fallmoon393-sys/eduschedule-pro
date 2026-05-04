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
import 'bootstrap/dist/css/bootstrap.min.css';

const PrivateRoute = ({ children, role }) => {
    const { user, loading } = useAuth();
    if (loading) return <div className="d-flex justify-content-center mt-5"><div className="spinner-border text-primary"></div></div>;
    if (!user) return <Navigate to="/login" />;
    if (role && user.role !== role) return <Navigate to="/login" />;
    return children;
};

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/dashboard/admin" element={
                        <PrivateRoute role="admin"><DashboardAdmin /></PrivateRoute>
                    } />
                    <Route path="/dashboard/enseignant" element={
                        <PrivateRoute role="enseignant"><DashboardEnseignant /></PrivateRoute>
                    } />
                    <Route path="/dashboard/delegue" element={
                        <PrivateRoute role="delegue"><DashboardDelegue /></PrivateRoute>
                    } />
                    <Route path="/dashboard/surveillant" element={
                        <PrivateRoute role="surveillant"><DashboardSurveillant /></PrivateRoute>
                    } />
                    <Route path="/dashboard/comptable" element={
                        <PrivateRoute role="comptable"><DashboardComptable /></PrivateRoute>
                    } />
                    <Route path="/emploi-temps" element={
                        <PrivateRoute role="admin"><EmploiTempsPage /></PrivateRoute>
                    } />
                    <Route path="/qrcode" element={
                        <PrivateRoute role="admin"><QRCodePage /></PrivateRoute>
                    } />
                    <Route path="/cahier-texte" element={
                        <PrivateRoute role="delegue"><CahierTextePage /></PrivateRoute>
                    } />
                    <Route path="/" element={<Navigate to="/login" />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;