import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Evaluation from './pages/Evaluation';
import ProposalSubmit from './pages/ProposalSubmit';
import ProposalDetail from './pages/ProposalDetail';
import ProposalEdit from './pages/ProposalEdit';
import ProposalList from './pages/ProposalList';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Rewards from './pages/Rewards';
import DeptReview from './pages/DeptReview';
import Settings from './pages/Settings';
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
            <Route path="admin" element={<Admin />} />
            <Route path="dept_review" element={<DeptReview />} />
            <Route path="evaluation" element={<Evaluation />} />
            <Route path="rewards" element={<Rewards />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </Router>
      <Toaster position="top-center" richColors />
    </ProposalProvider>
  );
};

export default App;
