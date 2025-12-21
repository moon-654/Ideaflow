import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Evaluation from './pages/Evaluation';
import ProposalSubmit from './pages/ProposalSubmit';
import ProposalDetail from './pages/ProposalDetail';
import ProposalEdit from './pages/ProposalEdit';
import ProposalList from './pages/ProposalList';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import AdminProposals from './pages/AdminProposals';
import Rewards from './pages/Rewards';
import DeptReview from './pages/DeptReview';
import Settings from './pages/Settings';
import Report from './pages/Report';
import Login from './pages/Login';
import { ProposalProvider } from './context/ProposalContext';
import { Toaster } from 'sonner';

const App: React.FC = () => {
  return (
    <ProposalProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Navigate to="/" replace />} />
            <Route path="proposals" element={<ProposalSubmit />} />
            <Route path="public-proposals" element={<ProposalList />} />
            <Route path="proposals/:id" element={<ProposalDetail />} />
            <Route path="proposals/:id/edit" element={<ProposalEdit />} />
            <Route path="profile" element={<Profile />} />
            {/* Protected Routes - Reviewer/Admin only */}
            <Route path="dept_review" element={
              <ProtectedRoute requiredPermission="deptReview">
                <DeptReview />
              </ProtectedRoute>
            } />
            <Route path="evaluation" element={
              <ProtectedRoute requiredPermission="firstReview">
                <Evaluation />
              </ProtectedRoute>
            } />
            {/* Protected Routes - Admin only */}
            <Route path="admin" element={
              <ProtectedRoute requiredPermission="manageUsers">
                <Admin />
              </ProtectedRoute>
            } />
            <Route path="admin_proposals" element={
              <ProtectedRoute requiredPermission="manageUsers">
                <AdminProposals />
              </ProtectedRoute>
            } />
            <Route path="rewards" element={
              <ProtectedRoute requiredPermission="viewDashboard">
                <Rewards />
              </ProtectedRoute>
            } />
            <Route path="settings" element={
              <ProtectedRoute requiredPermission="manageSettings">
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="report" element={
              <ProtectedRoute allowedRoles={['Admin', 'Reviewer', '1차 심의위원', '2차 심의위원']}>
                <Report />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </Router>
      <Toaster position="top-center" richColors />
    </ProposalProvider>
  );
};

export default App;

