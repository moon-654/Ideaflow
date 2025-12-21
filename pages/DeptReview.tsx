import React, { useState } from 'react';
import { useProposalStore } from '../context/ProposalContext';
import { CheckCircle, XCircle, Clock, RotateCcw, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';
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

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleAction = (id: string, action: 'accept' | 'reject' | 'modify') => {
    if ((action === 'reject' || action === 'modify') && !rejectReason[id]) {
      toast.error('반려 또는 수정 요청 시에는 사유를 반드시 입력해야 합니다.');
      return;
    }

    let newStatus: any = '1st_Review';
    let message = '제안이 1차 심의로 상정되었습니다.';

    if (action === 'reject') {
      newStatus = 'Rejected';
      message = '제안이 반려되었습니다.';
    } else if (action === 'modify') {
      newStatus = 'Modification_Requested';
      message = '제안자에게 수정 요청을 보냈습니다.';
    }

    updateProposal(id, {
      status: newStatus,
      deptReviewComment: rejectReason[id] || '',
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
                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded font-mono">{proposal.id}</span>
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
                    onClick={() => toggleExpand(proposal.id)}
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
