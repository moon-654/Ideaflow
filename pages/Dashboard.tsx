import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FileText, TrendingUp, CheckCircle, AlertTriangle, ArrowUpRight, Download } from 'lucide-react';
import { MOCK_PROPOSALS, DEPARTMENT_STATS } from '../constants';

const STATUS_MAP: Record<string, string> = {
  'New': '신규 등록',
  'Dept_Review': '부서 검토중',
  '1st_Review': '1차 심의중',
  '2nd_Review': '2차 심의중',
  'Completed': '최종 완료',
  'Rejected': '반려됨'
};

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">대시보드</h2>
          <p className="text-slate-500 mt-1">제안 현황 및 핵심 성과 지표(KPI) 개요입니다.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
            <Download size={16} />
            보고서 내보내기
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: '총 제안 건수', value: '1,240건', sub: '전월 대비 +12%', icon: <FileText size={24} />, color: 'bg-blue-500', bg: 'bg-blue-50' },
          { title: '제안 채택률', value: '12.5%', sub: '전월 대비 +2.1%', icon: <TrendingUp size={24} />, color: 'bg-purple-500', bg: 'bg-purple-50' },
          { title: '총 절감액', value: '15억원', sub: '연간 누적 (YTD)', icon: <CheckCircle size={24} />, color: 'bg-green-500', bg: 'bg-green-50' },
          { title: '긴급 대기', value: '5건', sub: '조치 필요', icon: <AlertTriangle size={24} />, color: 'bg-orange-500', bg: 'bg-orange-50' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                <h3 className="text-3xl font-bold text-slate-900 mt-2">{stat.value}</h3>
              </div>
              <div className={`p-3 rounded-lg ${stat.bg} ${stat.color.replace('bg-', 'text-')}`}>
                {stat.icon}
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs">
              <span className="text-green-600 font-bold flex items-center gap-1">
                 {stat.sub.includes('+') ? <ArrowUpRight size={14} /> : null}
                 {stat.sub}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">부서별 제안 현황</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DEPARTMENT_STATS} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                />
                <Bar dataKey="proposals" radius={[4, 4, 0, 0]} barSize={50}>
                  {DEPARTMENT_STATS.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity List */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-0 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900">최신 제안</h3>
            <button className="text-sm text-primary font-medium hover:underline">전체 보기</button>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[300px]">
            {MOCK_PROPOSALS.map((proposal, idx) => (
              <div key={idx} className="p-4 hover:bg-slate-50 border-b border-gray-50 last:border-none transition-colors group cursor-pointer">
                <div className="flex justify-between items-start mb-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                    ${proposal.status === 'New' ? 'bg-blue-100 text-blue-700' : 
                      proposal.status === 'Rejected' ? 'bg-red-100 text-red-700' : 
                      'bg-slate-100 text-slate-700'}
                  `}>
                    {STATUS_MAP[proposal.status] || proposal.status}
                  </span>
                  <span className="text-xs text-slate-400">{proposal.date}</span>
                </div>
                <h4 className="text-sm font-semibold text-slate-900 group-hover:text-primary transition-colors line-clamp-1">
                  {proposal.title}
                </h4>
                <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                  <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[10px] text-slate-600">
                    {proposal.proposer.name.charAt(0)}
                  </div>
                  <span>{proposal.proposer.name}</span>
                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                  <span>{proposal.proposer.department}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
