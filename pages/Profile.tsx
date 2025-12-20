import React from 'react';
import { useProposalStore } from '../context/ProposalContext';
import { User, Mail, Building, Award, FileText, CheckCircle, TrendingUp, Calendar, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Profile: React.FC = () => {
    const { currentUser, proposals, mileageLogs } = useProposalStore();

    // Calculate Stats
    const myProposals = proposals.filter(p => p.proposer.id === currentUser.id);
    const totalProposals = myProposals.length;
    const acceptedProposals = myProposals.filter(p => p.status === 'Completed').length;
    const adoptionRate = totalProposals > 0 ? Math.round((acceptedProposals / totalProposals) * 100) : 0;

    const totalMileage = mileageLogs
        .filter(l => l.userId === currentUser.id)
        .reduce((sum, log) => sum + log.points, 0);

    const recentActivity = myProposals.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const STATUS_LABELS: Record<string, string> = {
        'New': '신규 등록',
        'Dept_Review': '부서 검토',
        '1st_Review': '1차 심의',
        '2nd_Review': '2차 심의',
        'Completed': '최종 완료',
        'Rejected': '반려됨'
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <h1 className="text-2xl font-bold text-slate-900">마이 페이지</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: User Profile & Stats */}
                <div className="space-y-6">
                    {/* User Profile Card */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center">
                        <div className="w-24 h-24 mx-auto bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                            <User size={48} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">{currentUser.name} {currentUser.role !== 'User' && `(${currentUser.role})`}</h2>
                        <p className="text-slate-500 text-sm mt-1">{currentUser.department}</p>

                        <div className="mt-6 space-y-3 text-left">
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                <Mail size={16} className="text-slate-400" />
                                <span>user@ideaflow.com</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                <Building size={16} className="text-slate-400" />
                                <span>{currentUser.department}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                <Calendar size={16} className="text-slate-400" />
                                <span>입사일: 2023.01.01</span>
                            </div>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="font-bold text-slate-900 mb-4">활동 요약</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                        <FileText size={20} />
                                    </div>
                                    <span className="text-sm font-medium text-slate-700">총 제안</span>
                                </div>
                                <span className="text-lg font-bold text-slate-900">{totalProposals}건</span>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                                        <TrendingUp size={20} />
                                    </div>
                                    <span className="text-sm font-medium text-slate-700">채택률</span>
                                </div>
                                <span className="text-lg font-bold text-slate-900">{adoptionRate}%</span>
                            </div>

                            <Link to="/rewards" className="flex items-center justify-between p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg group-hover:bg-purple-200 transition-colors">
                                        <Award size={20} />
                                    </div>
                                    <span className="text-sm font-medium text-slate-700">마일리지</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-bold text-slate-900">{totalMileage.toLocaleString()}</span>
                                    <ArrowRight size={14} className="text-purple-400" />
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Right Column: Activity History */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-slate-900">나의 제안 이력</h3>
                            <Link to="/proposals" className="text-sm text-primary font-medium hover:underline">새 제안 등록</Link>
                        </div>

                        <div className="divide-y divide-gray-100">
                            {recentActivity.length === 0 ? (
                                <div className="p-12 text-center text-slate-400">
                                    등록된 제안이 없습니다.
                                </div>
                            ) : (
                                recentActivity.map(proposal => (
                                    <Link
                                        key={proposal.id}
                                        to={`/proposals/${encodeURIComponent(proposal.id)}`}
                                        className="block p-6 hover:bg-slate-50 transition-colors group"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider
                        ${proposal.status === 'New' ? 'bg-blue-100 text-blue-700' :
                                                    proposal.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                                        proposal.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                                            'bg-slate-100 text-slate-700'}
                      `}>
                                                {STATUS_LABELS[proposal.status] || proposal.status}
                                            </span>
                                            <span className="text-xs text-slate-400">{proposal.date}</span>
                                        </div>
                                        <h4 className="text-base font-bold text-slate-900 mb-1 group-hover:text-primary transition-colors">
                                            {proposal.title}
                                        </h4>
                                        <p className="text-sm text-slate-500 line-clamp-1">
                                            {proposal.summary}
                                        </p>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
