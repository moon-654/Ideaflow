import React, { useState } from 'react';
import { HashRouter as Router } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Evaluation from './pages/Evaluation';
import ProposalSubmit from './pages/ProposalSubmit';
import Rewards from './pages/Rewards';
import DeptReview from './pages/DeptReview';
import Settings from './pages/Settings'; // New Import
import { Menu, Search, Bell } from 'lucide-react';
import { CURRENT_USER } from './constants';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'proposals': return <ProposalSubmit />;
      case 'dept_review': return <DeptReview />;
      case 'evaluation': return <Evaluation />;
      case 'rewards': return <Rewards />;
      case 'settings': return <Settings />; // New Case
      default: return <Dashboard />;
    }
  };

  return (
    <Router>
      <div className="flex h-screen overflow-hidden bg-[#f6f7f8]">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
        />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Header */}
          <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 z-10 sticky top-0">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsMobileOpen(true)}
                className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
              >
                <Menu size={24} />
              </button>
              
              {/* Breadcrumb / Page Title Mobile */}
              <h2 className="text-lg font-bold text-slate-900 md:hidden capitalize">
                {activeTab.replace('_', ' ')}
              </h2>

              {/* Search Bar Desktop */}
              <div className="hidden md:flex items-center relative w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="통합 검색 (제안, 제안자, 부서)..." 
                  className="w-full h-10 pl-10 pr-4 rounded-full bg-slate-100 border-none text-sm focus:ring-2 focus:ring-primary/50 text-slate-900 placeholder:text-slate-400 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
              <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-gray-200">
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{CURRENT_USER.name}</p>
                  <p className="text-xs text-slate-500">{CURRENT_USER.role}</p>
                </div>
                <img 
                  src={CURRENT_USER.avatarUrl} 
                  alt="Profile" 
                  className="w-9 h-9 rounded-full object-cover border border-gray-200"
                />
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
            {renderContent()}
          </main>
        </div>
      </div>
    </Router>
  );
};

export default App;
