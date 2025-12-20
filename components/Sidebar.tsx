import React from 'react';
import { LayoutDashboard, FileText, CheckSquare, Layers, Award, Settings, Lightbulb, LogOut, ChevronRight, PenTool } from 'lucide-react';
import { CURRENT_USER } from '../constants';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isMobileOpen, setIsMobileOpen }) => {
  const menuItems = [
    { id: 'dashboard', label: '대시보드', icon: <LayoutDashboard size={20} /> },
    { id: 'proposals', label: '제안 등록', icon: <PenTool size={20} /> },
    { id: 'dept_review', label: '부서 검토', icon: <FileText size={20} /> },
    { id: 'evaluation', label: '심의 평가 (1차/2차)', icon: <Layers size={20} /> },
    { id: 'rewards', label: '포상 및 마일리지', icon: <Award size={20} /> },
    { id: 'settings', label: '시스템 설정', icon: <Settings size={20} /> },
  ];

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
            <h1 className="text-lg font-bold text-slate-900 leading-none">IdeaFlow</h1>
            <span className="text-xs text-slate-500 font-medium">관리자 포털</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-3">
            메인 메뉴
          </div>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsMobileOpen(false);
              }}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group
                ${activeTab === item.id 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-primary'}
              `}
            >
              <span className={`transition-colors ${activeTab === item.id ? 'text-primary' : 'text-slate-400 group-hover:text-primary'}`}>
                {item.icon}
              </span>
              {item.label}
              {activeTab === item.id && <ChevronRight size={16} className="ml-auto" />}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-gray-100">
            <img 
              src={CURRENT_USER.avatarUrl} 
              alt={CURRENT_USER.name} 
              className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{CURRENT_USER.name}</p>
              <p className="text-xs text-slate-500 truncate">{CURRENT_USER.department}</p>
            </div>
            <button className="text-slate-400 hover:text-slate-600">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
