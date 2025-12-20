import React, { useState } from 'react';
import { MOCK_PROPOSALS } from '../constants';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

const DeptReview: React.FC = () => {
  // Filter for Dept_Review status
  const [proposals, setProposals] = useState(MOCK_PROPOSALS.filter(p => p.status === 'Dept_Review'));

  const handleAction = (id: string, action: 'accept' | 'reject') => {
    // In a real app, this would call API. Here we just remove it from UI for demo.
    const actionText = action === 'accept' ? '승인(1차 상정)' : '반려';
    alert(`제안서 ${id} 건이 ${actionText} 처리되었습니다.`);
    setProposals(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">실행 부서 검토</h1>
        <p className="text-slate-500">배정된 제안의 실현 가능성을 검토하고 1차 심의로 상정합니다.</p>
      </div>

      <div className="grid gap-4">
        {proposals.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-gray-200">
            <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
            <h3 className="text-lg font-bold text-slate-900">검토 대기중인 안건이 없습니다!</h3>
            <p className="text-slate-500">현재 부서 검토 단계의 제안이 모두 처리되었습니다.</p>
          </div>
        ) : (
          proposals.map(proposal => (
            <div key={proposal.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
              <div className="p-6 flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded font-mono">{proposal.id}</span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock size={12} /> {proposal.date}
                  </span>
                  <span className="ml-auto text-xs font-bold text-slate-400 uppercase tracking-wider">
                    대상 부서: {proposal.targetDepartment}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{proposal.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                  {proposal.summary}
                </p>
                
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <div className="flex items-center gap-2">
                     <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">
                       {proposal.proposer.name[0]}
                     </div>
                     {proposal.proposer.name} ({proposal.proposer.department})
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-6 md:w-80 border-t md:border-t-0 md:border-l border-gray-200 flex flex-col gap-4 justify-center">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">검토 의견 (반려 시 필수)</label>
                  <textarea 
                    className="w-full text-sm p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none h-24 bg-white text-slate-900"
                    placeholder="실현 가능성 피드백 또는 반려 사유를 입력하세요..."
                  ></textarea>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => handleAction(proposal.id, 'reject')}
                    className="flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-700 font-bold rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <XCircle size={18} /> 반려 (종결)
                  </button>
                  <button 
                    onClick={() => handleAction(proposal.id, 'accept')}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover shadow-lg shadow-primary/20 transition-colors"
                  >
                    <CheckCircle size={18} /> 채택 (상정)
                  </button>
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