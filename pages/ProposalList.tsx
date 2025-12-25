import React, { useState, useMemo } from 'react';
import { useProposalStore } from '../context/ProposalContext';
import { Search, Filter, Calendar, User, Tag, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { stripHtml } from '../utils/html';

const ProposalList: React.FC = () => {
    const { proposals, settings } = useProposalStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [categoryFilter, setCategoryFilter] = useState('All');

    const filteredProposals = useMemo(() => {
        return proposals.filter(p => {
            // Exclude deleted and archived proposals
            if (p.isDeleted || p.isArchived) return false;

            const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.proposer.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
            const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
            return matchesSearch && matchesStatus && matchesCategory;
        }).sort((a, b) => {
            // Sort by Date Descending
            const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
            if (dateDiff !== 0) return dateDiff;
            // Secondary Sort by Proposal Number Descending
            return (b.proposalNumber || b.id).localeCompare(a.proposalNumber || a.id);
        });
    }, [proposals, searchTerm, statusFilter, categoryFilter]);

    const STATUS_LABELS: Record<string, string> = {
        'New': '신규 등록',
        'Dept_Review': '부서 검토',
        '1st_Review': '1차 심의',
        '2nd_Review': '2차 심의',
        'Completed': '최종 완료',
        'Rejected': '반려됨',
        'Modification_Requested': '보완 요청'
    };



    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">전체 제안 목록</h2>
                    <p className="text-slate-500 mt-1">사내에 등록된 모든 제안을 조회할 수 있습니다.</p>
                </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="제안 제목 또는 제안자 검색..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select
                            className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none bg-white"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="All">모든 상태</option>
                            {Object.entries(STATUS_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="relative">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select
                            className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none bg-white"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                        >
                            <option value="All">모든 카테고리</option>
                            {(settings.categories || []).map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Proposal Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProposals.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-slate-400">
                        검색 결과가 없습니다.
                    </div>
                ) : (
                    filteredProposals.map(proposal => (
                        <Link
                            key={proposal.id}
                            to={`/proposals/${encodeURIComponent(proposal.id)}`}
                            className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-primary/30 transition-all group flex flex-col h-full"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider
                  ${proposal.status === 'New' ? 'bg-blue-100 text-blue-700' :
                                        proposal.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                            proposal.status === 'Modification_Requested' ? 'bg-amber-100 text-amber-700' :
                                                proposal.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                                    'bg-slate-100 text-slate-700'}
                `}>
                                    {STATUS_LABELS[proposal.status] || proposal.status}
                                </span>
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                    <Calendar size={12} />
                                    {proposal.date}
                                </span>
                            </div>

                            <div className="text-xs text-slate-400 font-mono mb-1">
                                {proposal.proposalNumber || proposal.id}
                            </div>

                            <h3 className="text-base font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                                {proposal.title}
                            </h3>

                            <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">
                                {stripHtml(proposal.summary)}
                            </p>

                            <div className="pt-4 border-t border-gray-50 flex items-center justify-between mt-auto">
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                        <User size={12} />
                                    </div>
                                    <span>{proposal.proposer.name}</span>
                                    <span className="text-slate-300">|</span>
                                    <span>{proposal.proposer.department}</span>
                                </div>
                                <ArrowRight size={16} className="text-slate-300 group-hover:text-primary transition-colors" />
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
};

export default ProposalList;
