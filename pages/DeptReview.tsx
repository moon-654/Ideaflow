import React, { useState } from 'react';
import { useProposalStore } from '../context/ProposalContext';
import { CheckCircle, XCircle, Clock, RotateCcw, ChevronDown, ChevronUp, DollarSign, Users, Search } from 'lucide-react';
import { toast } from 'sonner';
import { stripHtml } from '../utils/html';
import DOMPurify from 'dompurify';

const DeptReview: React.FC = () => {
  const { proposals, updateProposal, currentUser } = useProposalStore();

  // Check Permission
  const hasPermission = currentUser.role === 'Admin' || currentUser.canDeptReview;

  // Filter for Dept_Review status AND matching target department
  const deptProposals = proposals.filter(p =>
    p.status === 'Dept_Review' &&
    (p.targetDepartment === currentUser.department || currentUser.role === 'Admin')
  );

  if (!hasPermission) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4 animate-fade-in">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
          <XCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">접근 권한이 없습니다</h2>
        <p className="text-slate-500 max-w-md">
          부서 검토는 관리자가 지정한 검토 담당자(팀장 등)만 수행할 수 있습니다.<br />
          담당자가 아니라면 관리자에게 문의하세요.
        </p>
      </div>
    );
  }

  const [rejectReason, setRejectReason] = useState<{ [key: string]: string }>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { users } = useProposalStore();

  // Execution Team Members State: { [proposalId]: [{id, name, share}] }
  const [executionMembers, setExecutionMembers] = useState<{ [key: string]: { id: string, name: string, share: number }[] }>({});
  // Track modified execution ratios: { [proposalId]: number }
  const [executionRatios, setExecutionRatios] = useState<{ [key: string]: number }>({});
  const [searchTerms, setSearchTerms] = useState<{ [key: string]: string }>({});

  const addExecutionMember = (proposalId: string, user: any) => {
    setExecutionMembers(prev => {
      const current = prev[proposalId] || [];
      if (current.find(m => m.id === user.id)) return prev;

      const updatedList = [...current, { id: user.id, name: user.name, share: 0 }];

      // Auto-Distribute Evenly: 100 / N
      const count = updatedList.length;
      const share = Math.floor(100 / count);
      let remainder = 100 % count;

      const distributedList = updatedList.map(m => {
        let s = share;
        if (remainder > 0) {
          s += 1;
          remainder--;
        }
        return { ...m, share: s };
      });

      return {
        ...prev,
        [proposalId]: distributedList
      };
    });
    setSearchTerms(prev => ({ ...prev, [proposalId]: '' }));
  };

  const removeExecutionMember = (proposalId: string, idx: number) => {
    setExecutionMembers(prev => {
      const list = [...(prev[proposalId] || [])];
      list.splice(idx, 1);

      if (list.length === 0) return { ...prev, [proposalId]: [] };

      // Auto-Distribute Evenly: 100 / N
      const count = list.length;
      const share = Math.floor(100 / count);
      let remainder = 100 % count;

      const distributedList = list.map(m => {
        let s = share;
        if (remainder > 0) {
          s += 1;
          remainder--;
        }
        return { ...m, share: s };
      });

      return { ...prev, [proposalId]: distributedList };
    });
  };

  const updateExecutionMember = (proposalId: string, idx: number, newShare: number) => {
    const clampedShare = Math.max(0, Math.min(100, newShare));

    setExecutionMembers(prev => {
      const list = [...(prev[proposalId] || [])];
      const target = list[idx];
      if (target.share === clampedShare) return prev;

      const diff = clampedShare - target.share;
      list[idx] = { ...target, share: clampedShare };

      // Auto-balance: Subtract diff from others
      // Try to subtract proportional or from first available
      // Simple approach: Subtract from the member with highest share (excluding target)
      let remainder = diff;

      // Sort others by share desc to take from richest first
      const othersIndices = list.map((_, i) => i).filter(i => i !== idx);

      // Naive redistribution: just loop and take what we can
      for (const i of othersIndices) {
        if (remainder === 0) break;
        if (remainder > 0) {
          // Need to reduce others
          const available = list[i].share;
          const take = Math.min(available, remainder);
          list[i].share -= take;
          remainder -= take;
        } else {
          // Need to add to others (remainder is negative)
          // Just add to first one
          list[i].share -= remainder; // -(-5) = +5
          remainder = 0;
        }
      }

      return { ...prev, [proposalId]: list };
    });
  };

  const updateExecutionRatio = (proposalId: string, newRatio: number) => {
    const clamped = Math.max(0, Math.min(100, newRatio));
    setExecutionRatios(prev => ({ ...prev, [proposalId]: clamped }));
  };

  // Initialize data when handling a proposal if not present
  const initializeExecutionData = (proposal: any) => {
    if (executionRatios[proposal.id] === undefined) {
      setExecutionRatios(prev => ({ ...prev, [proposal.id]: proposal.executionTeamRatio || 0 }));
    }
    // Members are initialized lazily or if present in data? 
    // Current system doesn't save individual members in DB separate from contributors yet, 
    // but if we are re-opening a review, we might want to parse contributors?
    // For now, assume fresh start or from state.
  };

  const toggleExpand = (proposal: any) => {
    if (expandedId !== proposal.id) {
      initializeExecutionData(proposal);
    }
    setExpandedId(expandedId === proposal.id ? null : proposal.id);
  };

  const handleAction = (id: string, action: 'accept' | 'reject' | 'modify') => {
    if ((action === 'reject' || action === 'modify') && !rejectReason[id]) {
      toast.error('반려 또는 수정 요청 시에는 사유를 반드시 입력해야 합니다.');
      return;
    }

    const proposal = proposals.find(p => p.id === id);
    if (!proposal) return;

    // Execution Logic validation
    const currentExecRatio = executionRatios[id] ?? (proposal.executionTeamRatio || 0);
    const oldExecRatio = proposal.executionTeamRatio || 0;

    if (action === 'accept' && currentExecRatio > 0) {
      const members = executionMembers[id] || [];
      const totalShare = members.reduce((acc, m) => acc + m.share, 0);
      if (members.length === 0) {
        toast.error('실행 부서 지분이 할당되어 있습니다. 실행 담당자를 최소 1명 이상 지정해주세요.');
        return;
      }
      if (totalShare !== 100) {
        toast.error(`실행 담당자 간의 지분 합계는 100%여야 합니다. (현재: ${totalShare}%)`);
        return;
      }
    }

    let newStatus: any = '1st_Review';
    let message = '제안이 1차 심의로 상정되었습니다.';

    // Construct updated contributors list if accepting
    let updatedContributors = proposal.contributors;

    // Check for Ratio Change (Negotiation)
    if (action === 'accept' && currentExecRatio !== oldExecRatio) {
      newStatus = 'Modification_Requested';
      message = '제안자에게 지분 변경 및 수락 요청을 보냈습니다.';

      // Auto-generate comment if empty, or append
      const autoComment = `[기여도 협의 요청]\n실행 부서에서 실행 부서 지분을 기존 ${oldExecRatio}%에서 ${currentExecRatio}%로 변경을 요청했습니다.\n제안 내용을 수정하여(지분 확인) 재상정해주시기 바랍니다.`;
      rejectReason[id] = rejectReason[id] ? `${autoComment}\n\n${rejectReason[id]}` : autoComment;
    }

    if (action === 'accept') {
      // If Execution Ratio Changed, we need to adjust Proposer
      const ratioDiff = currentExecRatio - oldExecRatio;

      let contributorsList = [...(proposal.contributors || [])];

      if (ratioDiff !== 0) {
        // Adjust Proposer
        contributorsList = contributorsList.map(c => {
          if (c.type === 'Proposer') {
            return { ...c, ratio: c.ratio - ratioDiff };
          }
          return c;
        });

        // Validation for Negative Proposer check
        const newProposer = contributorsList.find(c => c.type === 'Proposer');
        if (newProposer && newProposer.ratio < 0) {
          toast.error('실행 부서 지분을 너무 높게 설정하여 제안자 지분이 음수가 됩니다.');
          return;
        }
      }

      // Now Apply Execution Members
      if (currentExecRatio > 0) {
        const members = executionMembers[id] || [];
        const newExecContributors = members.map(m => {
          // Lookup the actual user to get their department
          const actualUser = users.find(u => u.id === m.id);
          return {
            id: m.id,
            name: m.name,
            department: actualUser?.department || currentUser.department,
            type: 'Execution' as const,
            ratio: parseFloat(((m.share / 100) * currentExecRatio).toFixed(1)),
            hasAgreed: false
          };
        });

        // Remove old execution members and add new ones
        updatedContributors = [
          ...contributorsList.filter(c => c.type !== 'Execution'),
          ...newExecContributors
        ];
      } else {
        updatedContributors = contributorsList; // No execution members if ratio is 0
      }
    }

    if (action === 'reject') {
      newStatus = 'Rejected';
      message = '제안이 반려되었습니다.';
    } else if (action === 'modify' && newStatus !== 'Modification_Requested') {
      newStatus = 'Modification_Requested';
      message = '제안자에게 수정 요청을 보냈습니다.';
    }

    updateProposal(id, {
      status: newStatus,
      deptReviewComment: rejectReason[id] || '',
      contributors: updatedContributors,
      executionTeamRatio: currentExecRatio,
      ...(action === 'reject' ? { rejectReason: rejectReason[id] } : {})
    });

    toast.success(message);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          실행 부서 검토
          {deptProposals.length > 0 && (
            <span className="bg-red-500 text-white text-sm font-bold px-2 py-0.5 rounded-full animate-pulse-subtle">
              {deptProposals.length}
            </span>
          )}
        </h1>
        <p className="text-slate-500">
          <span className="font-bold text-primary">{currentUser.department}</span> 앞으로 접수된 제안을 검토합니다.
        </p>
      </div>

      <div className="grid gap-4">
        {deptProposals.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-gray-200">
            <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
            <h3 className="text-lg font-bold text-slate-900">검토 대기중인 안건이 없습니다!</h3>
            <p className="text-slate-500">귀하의 부서로 접수된 대기 안건이 없습니다.</p>
          </div>
        ) : (
          deptProposals.map(proposal => (
            <div key={proposal.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex flex-col lg:flex-row">
                {/* Main Content */}
                <div className="p-6 flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded font-mono">{proposal.proposalNumber || proposal.id}</span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock size={12} /> {proposal.date}
                    </span>
                    <span className="ml-auto text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Category: {proposal.category}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{proposal.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed mb-3 line-clamp-2">
                    {stripHtml(proposal.summary)}
                  </p>

                  {/* Expand/Collapse Button */}
                  <button
                    onClick={() => toggleExpand(proposal)}
                    className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-hover transition-colors"
                  >
                    {expandedId === proposal.id ? (
                      <><ChevronUp size={16} /> 접기</>
                    ) : (
                      <><ChevronDown size={16} /> 상세 보기</>
                    )}
                  </button>

                  {/* Expanded Detail Section */}
                  {expandedId === proposal.id && (
                    <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">현황 및 문제점</label>
                        <div
                          className="text-slate-700 text-sm leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100 prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(proposal.currentProblem || '<p class="text-slate-400">내용이 없습니다.</p>') }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">개선 방안</label>
                        <div
                          className="text-slate-700 text-sm leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100 prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(proposal.improvementPlan || '<p class="text-slate-400">내용이 없습니다.</p>') }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">기대 효과</label>
                        <div
                          className="text-slate-700 text-sm leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100 prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(proposal.expectedEffect || '<p class="text-slate-400">내용이 없습니다.</p>') }}
                        />
                      </div>
                      {proposal.expectedAmount && (
                        <div className="flex items-center gap-2 bg-green-50 p-3 rounded-lg border border-green-100">
                          <DollarSign size={18} className="text-green-600" />
                          <span className="text-sm font-bold text-green-700">
                            예상 효과 금액: {proposal.expectedAmount.toLocaleString('ko-KR')}원 / 연
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Execution Team Allocation Section */}
                  {/* Always show if enabled in settings, or just check ratio? Let's check ratio but allow adding if 0? No, rely on proposal first? */}
                  {/* User wants to adjust, so we show it always? Or only if settings enabled? */}
                  {/* Assuming enabled if we are here */}
                  <div className="mt-4 bg-purple-50 p-4 rounded-xl border border-purple-100">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-purple-900 text-sm flex items-center gap-2">
                        <Users size={16} /> 실행 부서 기여도 및 담당자 배정
                      </h4>
                    </div>

                    {/* Main Ratio Slider */}
                    <div className="bg-white p-3 rounded-lg border border-purple-100 mb-4 shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-700">실행 부서 전체 지분</span>
                        <span className="text-sm font-bold text-purple-600">{executionRatios[proposal.id] ?? proposal.executionTeamRatio}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={executionRatios[proposal.id] ?? proposal.executionTeamRatio ?? 0}
                        onChange={(e) => updateExecutionRatio(proposal.id, parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">* 지분을 변경하면 제안자의 지분이 자동으로 조정됩니다.</p>
                    </div>

                    <div className="space-y-3">
                      {/* List current execution members */}
                      {(executionMembers[proposal.id] || []).map((member, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded border border-purple-100">
                          <span className="text-xs font-bold text-slate-700 w-24 truncate">{member.name}</span>
                          <div className="flex-1">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={member.share}
                              onChange={(e) => updateExecutionMember(proposal.id, idx, parseInt(e.target.value))}
                              className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                          </div>
                          <input
                            type="number"
                            value={member.share}
                            onChange={(e) => updateExecutionMember(proposal.id, idx, parseInt(e.target.value))}
                            className="w-12 text-xs border border-gray-300 rounded px-1 text-right font-bold text-indigo-600"
                          />
                          <span className="text-xs text-slate-500">%</span>
                          <button onClick={() => removeExecutionMember(proposal.id, idx)} className="text-slate-400 hover:text-red-500">
                            <XCircle size={14} />
                          </button>
                        </div>
                      ))}

                      {/* Dept Member List for Quick Add */}
                      <div className="mt-4">
                        <label className="text-xs font-bold text-slate-500 mb-2 block">부서원 목록 (선택하여 추가)</label>
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                          {users
                            .filter(u =>
                              u.department === currentUser.department &&
                              !(executionMembers[proposal.id] || []).find(m => m.id === u.id)
                            )
                            .map(u => (
                              <button
                                key={u.id}
                                onClick={() => addExecutionMember(proposal.id, u)}
                                className="text-left px-3 py-2 bg-white border border-gray-200 rounded hover:bg-purple-50 hover:border-purple-200 transition-colors flex items-center justify-between group"
                              >
                                <span className="text-xs font-bold text-slate-700">{u.name}</span>
                                <span className="text-[10px] text-purple-600 font-bold opacity-0 group-hover:opacity-100">+ 추가</span>
                              </button>
                            ))
                          }
                          {users.filter(u => u.department === currentUser.department && !(executionMembers[proposal.id] || []).find(m => m.id === u.id)).length === 0 && (
                            <div className="col-span-2 text-center text-xs text-slate-400 py-2 italic bg-slate-50 rounded border border-dashed border-gray-200">
                              추가할 부서원이 없습니다.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-purple-100">
                        <span>담당자 간 배분 합계</span>
                        <span className={`font-bold ${(executionMembers[proposal.id] || []).reduce((acc, m) => acc + m.share, 0) === 100 ? 'text-green-600' : 'text-red-500'}`}>
                          {(executionMembers[proposal.id] || []).reduce((acc, m) => acc + m.share, 0)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-slate-500 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">
                        {proposal.proposer.name[0]}
                      </div>
                      {proposal.proposer.name} ({proposal.proposer.department})
                    </div>
                  </div>
                </div>

                {/* Action Panel */}
                <div className="bg-slate-50 p-6 lg:w-80 border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col gap-4 justify-center">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">검토 의견 (필수)</label>
                    <textarea
                      value={rejectReason[proposal.id] || ''}
                      onChange={(e) => setRejectReason({ ...rejectReason, [proposal.id]: e.target.value })}
                      className="w-full text-sm p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none h-24 bg-white text-slate-900"
                      placeholder="실현 가능성 검토 의견을 입력하세요..."
                    ></textarea>
                  </div>
                  <button
                    onClick={() => handleAction(proposal.id, 'accept')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover shadow-lg shadow-primary/20 transition-colors"
                  >
                    <CheckCircle size={18} /> 채택 (상정)
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleAction(proposal.id, 'modify')}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-orange-300 text-orange-600 font-bold rounded-lg hover:bg-orange-50 transition-colors"
                    >
                      <RotateCcw size={18} /> 수정요청
                    </button>
                    <button
                      onClick={() => handleAction(proposal.id, 'reject')}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-700 font-bold rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <XCircle size={18} /> 반려
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DeptReview;
