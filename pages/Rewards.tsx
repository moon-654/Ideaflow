import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useProposalStore } from '../context/ProposalContext';
import { Download, CheckCircle, Wallet, History, Send, Plus, X, BarChart2, List, Trash2, Search, Printer, FileText, ChevronRight } from 'lucide-react';
import { exportMileageLogsToCSV } from '../services/exportService';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { PayoutBatch } from '../types';

const TYPE_MAP: Record<string, string> = {
  'Registration': '제안 등록',
  'Dept_Pass': '부서 심사 통과',
  'Grade_S': 'S등급 포상',
  'Grade_A': 'A등급 포상',
  'Grade_B': 'B등급 포상',
  'Grade_C': 'C등급 포상',
  'Bonus': '효과보상',
  'Penalty': '차감 (페널티)'
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ff4d4f', '#1890ff'];

const Rewards: React.FC = () => {
  const { mileageLogs, currentUser, proposals, settings, addManualMileageLog, voidMileageLog, processSelectedPayouts, users, payoutBatches } = useProposalStore();
  const isAdmin = currentUser.role === 'Admin';

  const [activeTab, setActiveTab] = useState<'history' | 'admin' | 'analytics'>(isAdmin ? 'admin' : 'history');
  const [historySubTab, setHistorySubTab] = useState<'transactions' | 'batches'>('transactions'); // Subtab for History

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Admin Management State
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);

  // Modals
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isPayoutPreviewOpen, setIsPayoutPreviewOpen] = useState(false);
  const [reportBatch, setReportBatch] = useState<PayoutBatch | null>(null); // For viewing past reports

  // Manual Modal Inputs
  const [manualUserId, setManualUserId] = useState('');
  const [manualPoints, setManualPoints] = useState('');
  const [manualReason, setManualReason] = useState('');

  // Derived Data
  const relevantLogs = useMemo(() => {
    return isAdmin
      ? mileageLogs
      : mileageLogs.filter(l => l.userId === currentUser.id);
  }, [mileageLogs, isAdmin, currentUser.id]);

  const filteredLogs = useMemo(() => {
    return relevantLogs.filter(log =>
      (log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.proposalTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.proposalId?.toLowerCase().includes(searchTerm.toLowerCase())
      ) &&
      (statusFilter === 'All' || log.status === statusFilter)
    );
  }, [relevantLogs, searchTerm, statusFilter]);

  // Pivot Data: Aggregate logs by (proposalId + userId)
  const pivotData = useMemo(() => {
    const map = new Map<string, {
      key: string;
      proposalId: string;
      proposalNumber: string;
      proposalTitle: string;
      userId: string;
      userName: string;
      department: string;
      registration: number;
      deptPass: number;
      grade: number;
      costSaving: number; // 효과금액 보상
      bonus: number;
      total: number;
      paidTotal: number;   // 기지급 금액
      pendingTotal: number; // 미지급 금액
      logIds: string[];
    }>();

    filteredLogs.forEach(log => {
      const key = `${log.proposalId || 'manual'}-${log.userId}`;
      // Try to find proposal by ID, or by legacy proposalId format
      const prop = proposals.find(p => p.id === log.proposalId)
        || proposals.find(p => p.proposalNumber === log.proposalId)
        || proposals.find(p => p.id === log.proposalId?.replace('#', 'prop-'));

      if (!map.has(key)) {
        map.set(key, {
          key,
          proposalId: prop?.id || log.proposalId || '', // Use actual proposal ID for navigation
          proposalNumber: prop?.proposalNumber || log.proposalId || '-',
          proposalTitle: log.proposalTitle || log.description || '-',
          userId: log.userId,
          userName: log.userName,
          department: log.department,
          registration: 0,
          deptPass: 0,
          grade: 0,
          costSaving: 0,
          bonus: 0,
          total: 0,
          paidTotal: 0,
          pendingTotal: 0,
          logIds: []
        });
      }

      const row = map.get(key)!;
      row.logIds.push(log.id);
      row.total += log.points;

      // Track paid vs pending
      if (log.status === 'Paid') row.paidTotal += log.points;
      else if (log.status === 'Accrued') row.pendingTotal += log.points;

      // Categorize by type
      if (log.type === 'Registration') row.registration += log.points;
      else if (log.type === 'Dept_Pass') row.deptPass += log.points;
      else if (log.type.startsWith('Grade_')) row.grade += log.points;
      else if (log.type === 'Cost_Saving_Reward') row.costSaving += log.points;
      else if (log.type === 'Bonus' || log.type === 'Penalty') row.bonus += log.points;
    });

    return Array.from(map.values());
  }, [filteredLogs, proposals]);

  const pendingPoints = relevantLogs.filter(l => l.status === 'Accrued').reduce((acc, curr) => acc + curr.points, 0);
  const totalPaid = relevantLogs.filter(l => l.status === 'Paid').reduce((acc, curr) => acc + curr.points, 0);

  // Handlers
  const handleSelectLog = (id: string) => {
    setSelectedLogIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    const accruedLogs = filteredLogs.filter(l => l.status === 'Accrued');
    if (selectedLogIds.length === accruedLogs.length && accruedLogs.length > 0) {
      setSelectedLogIds([]);
    } else {
      setSelectedLogIds(accruedLogs.map(l => l.id));
    }
  };

  const handlePayoutPreview = () => {
    if (selectedLogIds.length === 0) return;
    setIsPayoutPreviewOpen(true);
  };

  const handleExecutePayout = () => {
    const batchId = processSelectedPayouts(selectedLogIds);
    setIsPayoutPreviewOpen(false);
    setSelectedLogIds([]);
    toast.success(`지급 처리가 완료되었습니다. (Batch: ${batchId})`);
  };

  const handleAddManual = () => {
    if (!manualUserId || !manualPoints || !manualReason) {
      toast.error('모든 정보를 입력해주세요.');
      return;
    }
    addManualMileageLog(manualUserId, parseInt(manualPoints), manualReason);
    setIsManualModalOpen(false);
    setManualPoints('');
    setManualReason('');
    toast.success('수동 마일리지가 등록되었습니다.');
  };

  const handleVoid = (id: string) => {
    const reason = prompt('취소 사유를 입력해주세요 (삭제가 아닌 Void 처리됩니다):');
    if (reason) {
      voidMileageLog(id, reason);
      toast.success('거래가 취소(Void) 되었습니다.');
    }
  };

  // Analytics Data
  const analyticsData = useMemo(() => {
    const monthlyData: any = {};
    mileageLogs.forEach(log => {
      const month = log.date.substring(0, 7);
      if (!monthlyData[month]) monthlyData[month] = { name: month, accrued: 0, paid: 0 };
      if (log.status === 'Accrued') monthlyData[month].accrued += log.points;
      if (log.status === 'Paid') monthlyData[month].paid += log.points;
    });
    const burnoutChart = Object.values(monthlyData).sort((a: any, b: any) => a.name.localeCompare(b.name));

    const deptData: any = {};
    mileageLogs.forEach(log => {
      if (!deptData[log.department]) deptData[log.department] = { name: log.department, value: 0 };
      deptData[log.department].value += log.points;
    });
    const deptChart = Object.values(deptData).sort((a: any, b: any) => b.value - a.value).slice(0, 5);

    return { burnoutChart, deptChart };
  }, [mileageLogs]);

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">포상 및 마일리지 관리</h1>
          <p className="text-slate-500 mt-1">
            {isAdmin ? '전체 마일리지 지급 관리, 수동 조정 및 통계 분석.' : '나의 제안 활동 포인트 적립 내역입니다.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              await exportMileageLogsToCSV(relevantLogs);
              toast.success('CSV 다운로드 완료');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-slate-50"
          >
            <Download size={16} /> CSV
          </button>
          {isAdmin && (
            <button
              onClick={() => setIsManualModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-sm"
            >
              <Plus size={16} /> 수동 지급/차감
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className={`grid grid-cols-1 ${isAdmin ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
        <div className="bg-gradient-to-br from-primary to-blue-600 p-6 rounded-xl shadow-lg text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2 opacity-90">
              <Wallet size={20} />
              <span className="text-sm font-bold uppercase tracking-wider">지급 대기 포인트</span>
            </div>
            <div className="text-4xl font-black">{pendingPoints.toLocaleString()} <span className="text-lg font-medium opacity-80">점</span></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
          <div className="text-sm font-medium text-slate-500 mb-1">누적 지급 완료</div>
          <div className="text-3xl font-bold text-slate-900">{totalPaid.toLocaleString()} <span className="text-sm font-normal text-slate-400">점</span></div>
        </div>

        {isAdmin && (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center items-start">
            <div className="flex items-center justify-between w-full mb-2">
              <span className="text-sm font-medium text-slate-500">지급 관리</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">{selectedLogIds.length}건 선택됨</span>
            </div>
            <button
              onClick={handlePayoutPreview}
              disabled={selectedLogIds.length === 0}
              className="w-full py-2 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
            >
              <Send size={16} /> {selectedLogIds.length > 0 ? `${selectedLogIds.length}건 지급 실행` : '대상 선택 필요'}
            </button>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      {isAdmin && (
        <div className="border-b border-gray-200 flex gap-6">
          <button onClick={() => setActiveTab('admin')} className={`pb-3 flex items-center gap-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'admin' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <List size={18} /> 관리 및 지급
          </button>
          <button onClick={() => setActiveTab('analytics')} className={`pb-3 flex items-center gap-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'analytics' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <BarChart2 size={18} /> 통계 및 분석
          </button>
          <button onClick={() => setActiveTab('history')} className={`pb-3 flex items-center gap-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <History size={18} /> 전체 이력 조회
          </button>
        </div>
      )}

      {/* Content Area */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[500px]">

        {/* 1. History Tab (Subtabs) */}
        {activeTab === 'history' && isAdmin && (
          <div className="bg-slate-50 border-b border-gray-200 px-4 pt-2 flex gap-4">
            <button
              onClick={() => setHistorySubTab('transactions')}
              className={`pb-2 text-sm font-medium border-b-2 ${historySubTab === 'transactions' ? 'border-slate-800 text-slate-900' : 'border-transparent text-slate-500'}`}
            >
              개별 거래 내역
            </button>
            <button
              onClick={() => setHistorySubTab('batches')}
              className={`pb-2 text-sm font-medium border-b-2 ${historySubTab === 'batches' ? 'border-slate-800 text-slate-900' : 'border-transparent text-slate-500'}`}
            >
              지급 배치(보고서) 이력
            </button>
          </div>
        )}

        {/* Toolbar (Transactions View) */}
        {(activeTab === 'admin' || (activeTab === 'history' && historySubTab === 'transactions')) && activeTab !== 'analytics' && (
          <div className="p-4 border-b border-gray-100 bg-slate-50/50 flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 hidden md:inline">
                지급 기준: 등록({settings.mileageRules.registration}), 부서통과({settings.mileageRules.deptPass}),
                S급({settings.mileageRules.gradeS}), ...
              </span>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  placeholder="검색..."
                  className="pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none w-48"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none bg-white"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="All">전체 상태</option>
                <option value="Accrued">적립됨</option>
                <option value="Paid">지급 완료</option>
                <option value="Cancelled">취소됨</option>
              </select>
            </div>
          </div>
        )}

        {/* Pivot Table View: Transactions (Consolidated by Proposal + User) */}
        {(activeTab === 'admin' || (activeTab === 'history' && historySubTab === 'transactions')) && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-gray-200">
                <tr>
                  {activeTab === 'admin' && (
                    <th className="p-4 w-10">
                      <input
                        type="checkbox"
                        onChange={() => {
                          const allLogIds = pivotData.flatMap(r => r.logIds.filter(id => filteredLogs.find(l => l.id === id)?.status === 'Accrued'));
                          if (selectedLogIds.length === allLogIds.length && allLogIds.length > 0) setSelectedLogIds([]);
                          else setSelectedLogIds(allLogIds);
                        }}
                        checked={pivotData.length > 0 && pivotData.every(r => r.logIds.every(id => filteredLogs.find(l => l.id === id)?.status !== 'Accrued' || selectedLogIds.includes(id)))}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                  )}
                  <th className="p-4">제안번호</th>
                  <th className="p-4">제안명</th>
                  <th className="p-4">사용자</th>
                  <th className="p-4 text-right">등록</th>
                  <th className="p-4 text-right">부서통과</th>
                  <th className="p-4 text-right">등급</th>
                  <th className="p-4 text-right">효과금액</th>
                  <th className="p-4 text-right">효과보상</th>
                  <th className="p-4 text-right font-bold bg-slate-100">합계</th>
                  <th className="p-4 text-right text-green-700 bg-green-50">기지급</th>
                  <th className="p-4 text-right text-orange-700 bg-orange-50">미지급</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pivotData.length === 0 ? (
                  <tr><td colSpan={12} className="p-12 text-center text-slate-400">데이터가 없습니다.</td></tr>
                ) : (
                  pivotData.map(row => (
                    <tr key={row.key} className="hover:bg-slate-50 transition-colors">
                      {activeTab === 'admin' && (
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={row.logIds.every(id => selectedLogIds.includes(id))}
                            onChange={() => {
                              const accruedIds = row.logIds.filter(id => filteredLogs.find(l => l.id === id)?.status === 'Accrued');
                              const allSelected = accruedIds.every(id => selectedLogIds.includes(id));
                              if (allSelected) setSelectedLogIds(prev => prev.filter(id => !accruedIds.includes(id)));
                              else setSelectedLogIds(prev => [...prev, ...accruedIds.filter(id => !prev.includes(id))]);
                            }}
                            disabled={row.logIds.every(id => filteredLogs.find(l => l.id === id)?.status !== 'Accrued')}
                            className="rounded border-gray-300 text-indigo-600 disabled:opacity-30"
                          />
                        </td>
                      )}
                      <td className="p-4">
                        {row.proposalId ? (
                          <Link to={`/proposals/${encodeURIComponent(row.proposalId)}`} className="font-mono text-xs text-indigo-600 hover:text-indigo-800 hover:underline">
                            {row.proposalNumber}
                          </Link>
                        ) : (
                          <span className="font-mono text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        {row.proposalId ? (
                          <Link to={`/proposals/${encodeURIComponent(row.proposalId)}`} className="font-medium text-slate-700 hover:text-indigo-600 hover:underline truncate block max-w-xs" title={row.proposalTitle}>
                            {row.proposalTitle}
                          </Link>
                        ) : (
                          <span className="font-medium text-slate-400 truncate max-w-xs" title={row.proposalTitle}>{row.proposalTitle}</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="font-bold">{row.userName}</div>
                        <div className="text-xs text-slate-400">{row.department}</div>
                      </td>
                      <td className="p-4 text-right text-slate-500">{row.registration || '-'}</td>
                      <td className="p-4 text-right text-slate-500">{row.deptPass || '-'}</td>
                      <td className="p-4 text-right text-purple-600 font-medium">{row.grade || '-'}</td>
                      <td className="p-4 text-right text-amber-600 font-medium">{row.costSaving || '-'}</td>
                      <td className="p-4 text-right text-blue-600 font-medium">{row.bonus || '-'}</td>
                      <td className="p-4 text-right font-black text-lg text-slate-900 bg-slate-50">{row.total}</td>
                      <td className="p-4 text-right font-bold text-green-700 bg-green-50">{row.paidTotal || '-'}</td>
                      <td className="p-4 text-right font-bold text-orange-700 bg-orange-50">{row.pendingTotal || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Table View: Batches (History) */}
        {activeTab === 'history' && historySubTab === 'batches' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-gray-200">
                <tr>
                  <th className="p-4">배치 ID</th>
                  <th className="p-4">지급 실행일</th>
                  <th className="p-4">처리자</th>
                  <th className="p-4 text-right">건수</th>
                  <th className="p-4 text-right">총 금액</th>
                  <th className="p-4 text-center">보고서</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payoutBatches.length === 0 ? (
                  <tr><td colSpan={6} className="p-12 text-center text-slate-400">지급 이력이 없습니다.</td></tr>
                ) : (
                  payoutBatches.map(batch => (
                    <tr key={batch.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-mono font-medium text-indigo-600">{batch.id}</td>
                      <td className="p-4 text-slate-500">{batch.processedAt.substring(0, 10)}</td>
                      <td className="p-4">{batch.processedBy}</td>
                      <td className="p-4 text-right">{batch.logCount}건</td>
                      <td className="p-4 text-right font-bold">{batch.totalAmount.toLocaleString()} P</td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setReportBatch(batch)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-gray-200 rounded hover:bg-slate-50 text-xs font-medium"
                        >
                          <FileText size={14} /> 보기
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Analytics */}
        {activeTab === 'analytics' && (
          <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={analyticsData.burnoutChart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="paid" fill="#82ca9d" /></BarChart></ResponsiveContainer></div>
            <div className="h-80"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={analyticsData.deptChart} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label>{analyticsData.deptChart.map((e: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
          </div>
        )}
      </div>

      {/* Manual Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-lg">수동 마일리지 등록</h3>
            <select className="w-full border rounded p-2" value={manualUserId} onChange={e => setManualUserId(e.target.value)}>
              <option value="">사용자 선택</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <input type="number" className="w-full border rounded p-2" placeholder="포인트 (음수는 차감)" value={manualPoints} onChange={e => setManualPoints(e.target.value)} />
            <textarea className="w-full border rounded p-2 h-24" placeholder="사유" value={manualReason} onChange={e => setManualReason(e.target.value)} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsManualModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">취소</button>
              <button onClick={handleAddManual} className="px-4 py-2 bg-indigo-600 text-white rounded">등록</button>
            </div>
          </div>
        </div>
      )}

      {/* Payout Preview Modal */}
      {isPayoutPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-xl text-slate-900">지급 결의서 (미리보기)</h3>
                <p className="text-sm text-slate-500">선택한 {selectedLogIds.length}건에 대한 지급을 실행합니다.</p>
              </div>
              <button onClick={() => setIsPayoutPreviewOpen(false)}><X size={24} className="text-gray-400" /></button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto bg-slate-50 space-y-6">
              <div className="bg-white border border-gray-200 p-6 shadow-sm mx-auto max-w-lg">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-serif font-bold text-slate-900 underline underline-offset-4 decoration-2">마일리지 지급 결의서</h2>
                  <p className="text-sm text-slate-500 mt-2">일자: {new Date().toLocaleDateString()}</p>
                </div>
                <table className="w-full text-sm border-collapse border border-gray-300 mb-6">
                  <tbody>
                    <tr>
                      <th className="border border-gray-300 bg-slate-50 p-2 w-1/3">건수 / 총액</th>
                      <td className="border border-gray-300 p-2 font-bold">{selectedLogIds.length}건 / {relevantLogs.filter(l => selectedLogIds.includes(l.id)).reduce((a, b) => a + b.points, 0).toLocaleString()} P</td>
                    </tr>
                    <tr>
                      <th className="border border-gray-300 bg-slate-50 p-2">처리 부서</th>
                      <td className="border border-gray-300 p-2">경영지원팀</td>
                    </tr>
                    <tr>
                      <th className="border border-gray-300 bg-slate-50 p-2">담당자</th>
                      <td className="border border-gray-300 p-2 text-indigo-600 font-bold">{currentUser.name} (서명)</td>
                    </tr>
                  </tbody>
                </table>
                <div className="border-t-2 border-slate-900 pt-8 mt-12 flex justify-between px-8">
                  <div className="text-center">
                    <div className="text-sm text-slate-500 mb-8">기안자</div>
                    <div className="font-bold">{currentUser.name}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-slate-500 mb-8">팀장</div>
                    <div className="font-bold text-slate-300">(서명)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-slate-500 mb-8">부문장</div>
                    <div className="font-bold text-slate-300">(서명)</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setIsPayoutPreviewOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">취소</button>
              <button onClick={handleExecutePayout} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-lg hover:bg-indigo-700 flex items-center gap-2">
                <CheckCircle size={18} /> 지급 실행 (결재 승인)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Batch View Modal (History) */}
      {reportBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white rounded-t-xl">
              <div>
                <h3 className="font-bold text-xl">지급 결의서 (보관용)</h3>
                <p className="text-sm opacity-80">Batch ID: {reportBatch.id}</p>
              </div>
              <button onClick={() => setReportBatch(null)}><X size={24} className="text-white/80 hover:text-white" /></button>
            </div>
            <div className="p-8 flex-1 overflow-y-auto bg-slate-50 print:bg-white text-center">
              <div id="print-area" className="bg-white border border-gray-300 p-8 shadow-md mx-auto max-w-xl text-left">
                <div className="text-center mb-10 border-b-2 border-slate-800 pb-4">
                  <h2 className="text-3xl font-serif font-black text-slate-900 mb-2">마일리지 지급 결의서</h2>
                  <p className="text-slate-500">Document No. {reportBatch.id}</p>
                </div>

                <table className="w-full mb-8 border-collapse">
                  <tbody>
                    <tr>
                      <td className="p-2 text-slate-500 w-24">지급 일자</td>
                      <td className="p-2 font-bold">{reportBatch.processedAt.substring(0, 10)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-slate-500">처리자</td>
                      <td className="p-2 font-bold">{reportBatch.processedBy}</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-slate-500">지급 총액</td>
                      <td className="p-2 font-bold text-xl text-indigo-600">{reportBatch.totalAmount.toLocaleString()} Points</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-slate-500">대상 인원</td>
                      <td className="p-2 font-bold">{reportBatch.logCount}명 (건)</td>
                    </tr>
                  </tbody>
                </table>

                {/* Simple table of recipients could go here if needed, but for summary just totals */}
                <div className="bg-slate-50 p-4 rounded border border-gray-200 mb-10 text-sm text-slate-600">
                  위와 같이 마일리지 지급을 결의하오니 재가 바랍니다.
                </div>

                <div className="grid grid-cols-3 gap-8 mt-16 pt-8 border-t border-gray-200">
                  <div className="text-center">
                    <div className="text-xs text-slate-400 mb-8 uppercase tracking-wider">Drafted By</div>
                    <div className="font-bold border-b border-gray-300 pb-2">{reportBatch.processedBy}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-400 mb-8 uppercase tracking-wider">Verified By</div>
                    <div className="font-bold border-b border-gray-300 pb-2 text-transparent">.</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-400 mb-8 uppercase tracking-wider">Approved By</div>
                    <div className="font-bold border-b border-gray-300 pb-2 text-transparent">.</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-white rounded-b-xl">
              <button onClick={() => window.print()} className="px-6 py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-700 flex items-center gap-2">
                <Printer size={18} /> 인쇄 / PDF 저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Rewards;
