import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Layers, Award, Settings, Lightbulb, LogOut, ChevronRight, PenTool, User, Shield, BarChart2 } from 'lucide-react';
import { useProposalStore } from '../context/ProposalContext';

interface SidebarProps {
  activeTab: string;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, isMobileOpen, setIsMobileOpen }) => {
  const navigate = useNavigate();
  const { currentUser, proposals } = useProposalStore();

  // Calculate Badge Counts
  const deptReviewCount = proposals.filter(p =>
    p.status === 'Dept_Review' && (
      currentUser.role === 'Admin' ||
      p.targetDepartment === currentUser.department
    )
  ).length;

  const evaluationCount = proposals.filter(p => {
    if (currentUser.role === 'Admin') return p.status === '1st_Review' || p.status === '2nd_Review';
    if (currentUser.role === '1차 심의위원' || currentUser.role === 'Reviewer') return p.status === '1st_Review';
    if (currentUser.role === '2차 심의위원') return p.status === '2nd_Review';
    return false;
  }).length;
  // Refined Logic for Evaluation Count based on exact roles if possible, otherwise show total pending for Reviewers
  // Since specific assignment isn't fully granular, we show relevant status.

  const getBadgeCount = (id: string) => {
    if (id === 'dept_review') return deptReviewCount;
    if (id === 'evaluation') return evaluationCount;
    return 0;
  };

  // Define roles including new 1st/2nd reviewer types
  const ALL_ACCESS = ['User', 'Reviewer', 'Admin', '1차 심의위원', '2차 심의위원'];
  const REVIEWER_ACCESS = ['Reviewer', 'Admin', '1차 심의위원', '2차 심의위원'];
  const ADMIN_ONLY = ['Admin'];

  const menuItems = [
    { id: 'dashboard', label: '대시보드', icon: <LayoutDashboard size={20} />, path: '/', roles: ALL_ACCESS },
    { id: 'public_proposals', label: '전체 제안', icon: <FileText size={20} />, path: '/public-proposals', roles: ALL_ACCESS },
    { id: 'proposals', label: '제안 등록', icon: <PenTool size={20} />, path: '/proposals', roles: ALL_ACCESS },
    { id: 'dept_review', label: '부서 검토', icon: <FileText size={20} />, path: '/dept_review', roles: [] }, // Handled by custom logic
    { id: 'evaluation', label: '심의 평가 (1차/2차)', icon: <Layers size={20} />, path: '/evaluation', roles: REVIEWER_ACCESS },
    { id: 'rewards', label: '포상 및 마일리지', icon: <Award size={20} />, path: '/rewards', roles: ALL_ACCESS },
    { id: 'profile', label: '마이 페이지', icon: <User size={20} />, path: '/profile', roles: ALL_ACCESS },
    { id: 'report', label: '통계 및 보고서', icon: <BarChart2 size={20} />, path: '/report', roles: REVIEWER_ACCESS },
    { id: 'admin_proposals', label: '제안 관리', icon: <FileText size={20} />, path: '/admin_proposals', roles: ADMIN_ONLY },
    { id: 'admin', label: '관리자', icon: <Shield size={20} />, path: '/admin', roles: ADMIN_ONLY },
    { id: 'settings', label: '시스템 설정', icon: <Settings size={20} />, path: '/settings', roles: ADMIN_ONLY },
  ];

  const filteredItems = menuItems.filter(item => {
    // Special handling for Dept Review: Show if Admin OR has permission
    if (item.id === 'dept_review') {
      return currentUser.role === 'Admin' || currentUser.canDeptReview;
    }
    // Default role check
    return item.roles.includes(currentUser.role || 'User');
  });

  console.log('Sidebar Debug:', {
    role: currentUser.role,
    name: currentUser.name,
    totalItems: menuItems.length,
    visibleItems: filteredItems.length
  });

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static
      `}>
        <div className="p-6 flex items-center gap-3 border-b border-gray-100">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
            <Lightbulb size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-none">ASHIMORI KOREA</h1>
            <span className="text-xs text-slate-500 font-medium">ACE제안시스템</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-3">
            메인 메뉴
          </div>
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.path)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group
                ${activeTab === item.id || (item.id === 'dashboard' && activeTab === '')
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-primary'}
              `}
            >
              <span className={`transition-colors ${activeTab === item.id || (item.id === 'dashboard' && activeTab === '') ? 'text-primary' : 'text-slate-400 group-hover:text-primary'}`}>
                {item.icon}
              </span>
              {item.label}
              {getBadgeCount(item.id) > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-sm animate-pulse-subtle">
                  {getBadgeCount(item.id)}
                </span>
              )}
              {(activeTab === item.id || (item.id === 'dashboard' && activeTab === '')) && getBadgeCount(item.id) === 0 && <ChevronRight size={16} className="ml-auto" />}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-gray-100">
            <img
              src={currentUser.avatarUrl || "https://ui-avatars.com/api/?name=" + currentUser.name}
              alt={currentUser.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{currentUser.name}</p>
              <p className="text-xs text-slate-500 truncate">{currentUser.dept || currentUser.department}</p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="text-slate-400 hover:text-slate-600"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
