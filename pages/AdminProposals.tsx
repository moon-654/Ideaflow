import React, { useState, useMemo } from 'react';
import { useProposalStore } from '../context/ProposalContext';
import { Proposal, ProposalStatus } from '../types';
import { Search, Filter, Trash2, Archive, Eye, EyeOff, RefreshCcw, UserCheck, AlertTriangle, CheckSquare, Square, Download, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import { exportProposalsToCSV, exportSelectedProposalsToCSV } from '../services/exportService';

type ViewTab = 'active' | 'archived' | 'deleted';

const STATUS_OPTIONS: ProposalStatus[] = ['New', 'Dept_Review', '1st_Review', '2nd_Review', 'Completed', 'Rejected', 'Modification_Requested'];

const AdminProposals: React.FC = () => {
    const {
        proposals,
        users,
        currentUser,
        softDeleteProposal,
        archiveProposal,
        hideProposal,
        unhideProposal,
        restoreProposal,
        forceStatusChange,
        transferOwnership,
        bulkArchive,
        bulkDelete
    } = useProposalStore();

    const [viewTab, setViewTab] = useState<ViewTab>('active');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<ProposalStatus | 'all'>('all');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

    // Filter proposals based on view tab
    const filteredProposals = useMemo(() => {
        let result = proposals;

        // Filter by view tab
        if (viewTab === 'active') {
            result = result.filter(p => !p.isDeleted && !p.isArchived);
        } else if (viewTab === 'archived') {
            result = result.filter(p => p.isArchived && !p.isDeleted);
        } else if (viewTab === 'deleted') {
            result = result.filter(p => p.isDeleted);
        }

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.title.toLowerCase().includes(query) ||
                p.proposer.name.toLowerCase().includes(query) ||
                p.id.toLowerCase().includes(query)
            );
        }

        // Filter by status
        if (statusFilter !== 'all') {
            result = result.filter(p => p.status === statusFilter);
        }

        return result.sort((a, b) => {
            const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
            if (dateDiff !== 0) return dateDiff;
            return (b.proposalNumber || b.id).localeCompare(a.proposalNumber || a.id);
        });
    }, [proposals, viewTab, searchQuery, statusFilter]);

    // Count proposals for tabs
    const counts = useMemo(() => ({
        active: proposals.filter(p => !p.isDeleted && !p.isArchived).length,
        archived: proposals.filter(p => p.isArchived && !p.isDeleted).length,
        deleted: proposals.filter(p => p.isDeleted).length,
    }), [proposals]);

    // Selection handlers
    const toggleSelectAll = () => {
        if (selectedIds.size === filteredProposals.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredProposals.map(p => p.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    // Bulk action handlers
    const handleBulkArchive = () => {
        if (selectedIds.size === 0) return;
        const reason = window.prompt('보관 사유를 입력해주세요:');
        if (reason !== null) {
            bulkArchive(Array.from(selectedIds), reason || undefined);
            setSelectedIds(new Set());
            toast.success(`${selectedIds.size}개의 제안이 보관되었습니다.`);
        }
    };

    const handleBulkDelete = () => {
        if (selectedIds.size === 0) return;
        if (!window.confirm(`${selectedIds.size}개의 제안을 삭제하시겠습니까?`)) return;
        const reason = window.prompt('삭제 사유를 입력해주세요:');
        if (reason !== null) {
            bulkDelete(Array.from(selectedIds), reason || undefined);
            setSelectedIds(new Set());
            toast.success(`${selectedIds.size}개의 제안이 삭제되었습니다.`);
        }
    };

    // Individual action handlers
    const handleSoftDelete = (id: string, title: string) => {
        if (!window.confirm(`"${title}" 제안을 삭제하시겠습니까?`)) return;
        const reason = window.prompt('삭제 사유를 입력해주세요:');
        if (reason !== null) {
            softDeleteProposal(id, reason || undefined);
            toast.success('제안이 삭제되었습니다.');
        }
        setActionMenuOpen(null);
    };

    const handleArchive = (id: string, title: string) => {
        const reason = window.prompt(`"${title}" 보관 사유를 입력해주세요:`);
        if (reason !== null) {
            archiveProposal(id, reason || undefined);
            toast.success('제안이 보관되었습니다.');
        }
        setActionMenuOpen(null);
    };

    const handleRestore = (id: string) => {
        restoreProposal(id);
        toast.success('제안이 복원되었습니다.');
        setActionMenuOpen(null);
    };

    const handleToggleHide = (id: string, isHidden: boolean) => {
        if (isHidden) {
            unhideProposal(id);
            toast.success('제안이 표시됩니다.');
        } else {
            hideProposal(id);
            toast.success('제안이 숨겨졌습니다.');
        }
        setActionMenuOpen(null);
    };

    const handleForceStatus = (id: string) => {
        const statusList = STATUS_OPTIONS.join(', ');
        const newStatus = window.prompt(`새 상태를 입력하세요:\n(${statusList})`);
        if (newStatus && STATUS_OPTIONS.includes(newStatus as ProposalStatus)) {
            forceStatusChange(id, newStatus as ProposalStatus);
            toast.success(`상태가 ${newStatus}로 변경되었습니다.`);
        } else if (newStatus) {
            toast.error('유효하지 않은 상태입니다.');
        }
        setActionMenuOpen(null);
    };

    const handleTransferOwnership = (id: string) => {
        const userList = users.map(u => `${u.id}: ${u.name}`).join('\n');
        const newOwnerId = window.prompt(`새 소유자 ID를 입력하세요:\n\n${userList}`);
        if (newOwnerId) {
            const user = users.find(u => u.id === newOwnerId);
            if (user) {
                transferOwnership(id, user.id, user.name);
                toast.success(`소유권이 ${user.name}에게 이전되었습니다.`);
            } else {
                toast.error('유효하지 않은 사용자입니다.');
            }
        }
        setActionMenuOpen(null);
    };

    // Admin-only page guard
    if (currentUser.role !== 'Admin') {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-slate-500">
                <AlertTriangle size={48} className="mb-4 text-red-400" />
                <p className="text-lg font-bold">접근 권한이 없습니다.</p>
                <p className="text-sm">관리자만 접근할 수 있는 페이지입니다.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">제안 관리</h1>
                    <p className="text-sm text-slate-500 mt-1">전체 제안의 삭제, 보관, 숨김 등을 관리합니다.</p>
                </div>
                <button
                    onClick={() => {
                        exportProposalsToCSV(filteredProposals);
                        toast.success('CSV 파일이 다운로드되었습니다.');
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <Download size={16} />
                    전체 내보내기
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
                {(['active', 'archived', 'deleted'] as ViewTab[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => { setViewTab(tab); setSelectedIds(new Set()); }}
                        className={`px-4 py-2 text-sm font-bold transition-colors border-b-2 -mb-px ${viewTab === tab
                            ? 'text-primary border-primary'
                            : 'text-slate-500 border-transparent hover:text-slate-700'
                            }`}
                    >
                        {tab === 'active' && `활성 (${counts.active})`}
                        {tab === 'archived' && `보관함 (${counts.archived})`}
                        {tab === 'deleted' && `휴지통 (${counts.deleted})`}
                    </button>
                ))}
            </div>

            {/* Filters & Bulk Actions */}
            <div className="flex flex-wrap gap-3 items-center justify-between bg-white p-4 rounded-xl border border-gray-200">
                <div className="flex gap-3 items-center">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="검색..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 focus:ring-primary focus:border-primary w-60"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as ProposalStatus | 'all')}
                        className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-primary focus:border-primary"
                    >
                        <option value="all">모든 상태</option>
                        {STATUS_OPTIONS.map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                </div>

                {/* Bulk Actions */}
                {selectedIds.size > 0 && (
                    <div className="flex gap-2 items-center">
                        <span className="text-sm text-slate-500">{selectedIds.size}개 선택됨</span>
                        {viewTab === 'active' && (
                            <>
                                <button
                                    onClick={handleBulkArchive}
                                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                                >
                                    <Archive size={14} /> 일괄 보관
                                </button>
                                <button
                                    onClick={handleBulkDelete}
                                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                                >
                                    <Trash2 size={14} /> 일괄 삭제
                                </button>
                                <button
                                    onClick={() => {
                                        exportSelectedProposalsToCSV(proposals, Array.from(selectedIds));
                                        toast.success(`${selectedIds.size}개 제안이 내보내기되었습니다.`);
                                    }}
                                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
                                >
                                    <Download size={14} /> 선택 내보내기
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-gray-200">
                        <tr>
                            <th className="w-10 px-4 py-3">
                                <button onClick={toggleSelectAll}>
                                    {selectedIds.size === filteredProposals.length && filteredProposals.length > 0 ? (
                                        <CheckSquare size={18} className="text-primary" />
                                    ) : (
                                        <Square size={18} className="text-slate-400" />
                                    )}
                                </button>
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">ID</th>
                            <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">제목</th>
                            <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">제안자</th>
                            <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">상태</th>
                            <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">날짜</th>
                            <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">속성</th>
                            <th className="w-16 px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProposals.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="text-center py-12 text-slate-400">
                                    해당하는 제안이 없습니다.
                                </td>
                            </tr>
                        ) : (
                            filteredProposals.map(p => (
                                <tr key={p.id} className="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 text-center">
                                        <button onClick={() => toggleSelect(p.id)}>
                                            {selectedIds.has(p.id) ? (
                                                <CheckSquare size={18} className="text-primary" />
                                            ) : (
                                                <Square size={18} className="text-slate-300" />
                                            )}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="text-sm font-bold text-slate-900">{p.proposalNumber || p.id}</div>
                                        {p.proposalNumber && <div className="text-[10px] text-slate-400 font-mono">{p.id}</div>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-sm font-medium ${p.isHidden ? 'text-slate-400' : 'text-slate-900'}`}>
                                            {p.title}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700">{p.proposer.name}</td>
                                    <td className="px-4 py-3">
                                        <span className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded">{p.status}</span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-400">{p.date}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-1">
                                            {p.isHidden && (
                                                <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">숨김</span>
                                            )}
                                            {p.isArchived && (
                                                <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">보관</span>
                                            )}
                                            {p.isDeleted && (
                                                <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">삭제</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 relative">
                                        <button
                                            onClick={() => setActionMenuOpen(actionMenuOpen === p.id ? null : p.id)}
                                            className="p-1 hover:bg-slate-100 rounded"
                                        >
                                            <MoreVertical size={16} className="text-slate-400" />
                                        </button>

                                        {/* Action Menu Dropdown */}
                                        {actionMenuOpen === p.id && (
                                            <div className="absolute right-4 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 min-w-40">
                                                {viewTab === 'active' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleToggleHide(p.id, !!p.isHidden)}
                                                            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                                                        >
                                                            {p.isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                                                            {p.isHidden ? '표시하기' : '숨기기'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleForceStatus(p.id)}
                                                            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                                                        >
                                                            <RefreshCcw size={14} /> 상태 변경
                                                        </button>
                                                        <button
                                                            onClick={() => handleTransferOwnership(p.id)}
                                                            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                                                        >
                                                            <UserCheck size={14} /> 소유권 이전
                                                        </button>
                                                        <hr className="my-1" />
                                                        <button
                                                            onClick={() => handleArchive(p.id, p.title)}
                                                            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 text-blue-600 flex items-center gap-2"
                                                        >
                                                            <Archive size={14} /> 보관
                                                        </button>
                                                        <button
                                                            onClick={() => handleSoftDelete(p.id, p.title)}
                                                            className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                                                        >
                                                            <Trash2 size={14} /> 삭제
                                                        </button>
                                                    </>
                                                )}
                                                {(viewTab === 'archived' || viewTab === 'deleted') && (
                                                    <button
                                                        onClick={() => handleRestore(p.id)}
                                                        className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 text-green-600 flex items-center gap-2"
                                                    >
                                                        <RefreshCcw size={14} /> 복원
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
                    <p className="text-2xl font-black text-slate-900">{counts.active}</p>
                    <p className="text-xs text-slate-500">활성 제안</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
                    <p className="text-2xl font-black text-blue-600">{counts.archived}</p>
                    <p className="text-xs text-slate-500">보관된 제안</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
                    <p className="text-2xl font-black text-red-500">{counts.deleted}</p>
                    <p className="text-xs text-slate-500">삭제된 제안</p>
                </div>
            </div>
        </div>
    );
};

export default AdminProposals;
