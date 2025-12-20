import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FileText, TrendingUp, CheckCircle, AlertTriangle, ArrowUpRight, Download, Clock, Star, Award } from 'lucide-react';
import { useProposalStore } from '../context/ProposalContext';
import { useNavigate, Link } from 'react-router-dom';

const STATUS_MAP: Record<string, string> = {
  'New': '신규 등록',
  'Dept_Review': '부서 검토중',
  '1st_Review': '1차 심의중',
  '2nd_Review': '2차 심의중',
  'Completed': '최종 완료',
  'Rejected': '반려됨'
};

const Dashboard: React.FC = () => {
  const { proposals, currentUser, mileageLogs } = useProposalStore();
  const navigate = useNavigate();

  // Role-Based Logic
  const isReviewer = currentUser.role === 'Reviewer' || currentUser.role === 'Admin';
  const isAdmin = currentUser.role === 'Admin';

  // Calculate Stats based on Role
  const stats = useMemo(() => {
    if (isReviewer) {
      // Reviewer/Admin View
      const total = proposals.length;
      const pending1st = proposals.filter(p => p.status === '1st_Review').length;
      const pending2nd = proposals.filter(p => p.status === '2nd_Review').length;
      const completed = proposals.filter(p => p.status === 'Completed').length;

      return [
        { title: '총 제안 건수', value: `${total}건`, sub: '전체 누적', icon: <FileText size={24} />, color: 'bg-blue-500', bg: 'bg-blue-50' },
        { title: '1차 심사 대기', value: `${pending1st}건`, sub: '조치 필요', icon: <Clock size={24} />, color: 'bg-orange-500', bg: 'bg-orange-50' },
        { title: '2차 심사 대기', value: `${pending2nd}건`, sub: '등급 확정 필요', icon: <Star size={24} />, color: 'bg-purple-500', bg: 'bg-purple-50' },
        { title: '완료된 제안', value: `${completed}건`, sub: '포상 지급 대기', icon: <CheckCircle size={24} />, color: 'bg-green-500', bg: 'bg-green-50' },
      ];
    } else {
      // General User View
      const myProposals = proposals.filter(p => p.proposer.id === currentUser.id);
      const myTotal = myProposals.length;
      const myAccepted = myProposals.filter(p => p.status === 'Completed').length;
      const myMileage = mileageLogs
        .filter(l => l.userId === currentUser.id)
        .reduce((sum, log) => sum + log.points, 0);
      const inProgress = myProposals.filter(p => p.status !== 'Completed' && p.status !== 'Rejected').length;

      return [
        { title: '나의 제안', value: `${myTotal}건`, sub: '누적 제안', icon: <FileText size={24} />, color: 'bg-blue-500', bg: 'bg-blue-50' },
        { title: '채택 완료', value: `${myAccepted}건`, sub: '채택률 ' + (myTotal > 0 ? ((myAccepted / myTotal) * 100).toFixed(0) : 0) + '%', icon: <CheckCircle size={24} />, color: 'bg-green-500', bg: 'bg-green-50' },
        { title: '진행중', value: `${inProgress}건`, sub: '심사 진행중', icon: <TrendingUp size={24} />, color: 'bg-orange-500', bg: 'bg-orange-50' },
        { title: '누적 마일리지', value: `${myMileage}점`, sub: '사용 가능', icon: <Award size={24} />, color: 'bg-purple-500', bg: 'bg-purple-50' },
      ];
    }
  }, [proposals, currentUser, isReviewer, mileageLogs]);

  // Calculate Department Stats (Admin/Reviewer Only)
  const departmentStats = useMemo(() => {
    const deptCounts: Record<string, number> = {};
    proposals.forEach(p => {
      const dept = p.proposer.department;
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });

    const colors = ['#93c5fd', '#137fec', '#bfdbfe', '#60a5fa', '#2563eb'];

    return Object.entries(deptCounts).map(([name, count], idx) => ({
      name,
      proposals: count,
      color: colors[idx % colors.length]
    }));
  }, [proposals]);

  const filteredProposals = useMemo(() => {
    if (isReviewer) return proposals;
    return proposals.filter(p => p.proposer.id === currentUser.id);
  }, [proposals, isReviewer, currentUser]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {isReviewer ? '관리자 대시보드' : '나의 대시보드'}
          </h2>
          <p className="text-slate-500 mt-1">
            {isReviewer ? '전사 제안 현황 및 심사 대기 목록입니다.' : '나의 제안 활동 내역과 마일리지 현황입니다.'}
          </p>
        </div>
        <div className="flex gap-3">
          {!isReviewer && (
            <button
              onClick={() => navigate('/proposals')}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-hover transition-colors shadow-sm shadow-primary/30"
            >
              <FileText size={16} />
              새 제안 등록
            </button>
          )}
          {isReviewer && (
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
              <Download size={16} />
              보고서 내보내기
            </button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
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
              <span className="text-slate-400 font-medium flex items-center gap-1">
                {stat.sub}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section (Reviewer Only) */}
        {isReviewer && (
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">부서별 제안 현황</h3>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="proposals" radius={[4, 4, 0, 0]} barSize={50}>
                    {departmentStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Recent Activity List (Full width for User, Side for Reviewer) */}
        <div className={`${isReviewer ? '' : 'lg:col-span-3'} bg-white rounded-xl border border-gray-200 shadow-sm p-0 overflow-hidden flex flex-col`}>
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900">{isReviewer ? '최신 제안' : '나의 제안 이력'}</h3>
            <button className="text-sm text-primary font-medium hover:underline">전체 보기</button>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[400px]">
            {filteredProposals.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">등록된 제안이 없습니다.</div>
            ) : (
              filteredProposals.map((proposal, idx) => (
                <Link
                  key={idx}
                  to={`/proposals/${encodeURIComponent(proposal.id)}`}
                  className="block p-4 hover:bg-slate-50 border-b border-gray-50 last:border-none transition-colors group cursor-pointer"
                >
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
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
