import React, { useState } from 'react';
import { useProposalStore } from '../context/ProposalContext';
import { Search, Filter, Layers, Star, CheckCircle, ArrowRight, Award } from 'lucide-react';
import { toast } from 'sonner';

const Evaluation: React.FC = () => {
  const { proposals, updateProposal } = useProposalStore();
  const [activeRound, setActiveRound] = useState<'1st' | '2nd'>('1st');
  const [filterText, setFilterText] = useState('');

  // Filter logic
  const filteredProposals = proposals.filter(p => {
    const matchesRound = activeRound === '1st'
      ? p.status === '1st_Review'
      : p.status === '2nd_Review';
    const matchesSearch = p.title.toLowerCase().includes(filterText.toLowerCase()) || p.id.includes(filterText);
    return matchesRound && matchesSearch;
  });

  // 1st Round Handlers
  const handle1stScoreChange = (id: string, field: 'necessity' | 'feasibility', val: string) => {
    const num = parseInt(val) || 0;
    const max = field === 'necessity' ? 40 : 60; // 40pts for necessity, 60pts for feasibility
    const clamped = Math.min(max, Math.max(0, num));

    const p = proposals.find(item => item.id === id);
    if (!p) return;

    const currentScore = p.score1st || { necessity: 0, feasibility: 0, total: 0, passed: false };
    const newScore = { ...currentScore, [field]: clamped };
    newScore.total = newScore.necessity + newScore.feasibility;
    newScore.passed = newScore.total >= 80; // Cut-off 80

    updateProposal(id, { score1st: newScore });
  };

  const submit1stReview = (id: string) => {
    const p = proposals.find(item => item.id === id);
    if (p?.score1st?.passed) {
      toast.success(`제안 ${id} 건이 2차 심의로 상정되었습니다! (+2 마일리지)`);
      updateProposal(id, { status: '2nd_Review' });
      // TODO: Add mileage logic here
    } else {
      toast.error(`제안 ${id} 건이 기준 점수 미달로 탈락 처리되었습니다. (80점 미만)`);
      updateProposal(id, { status: 'Rejected' });
    }
  };

  // 2nd Round Handlers
  const handle2ndGradeChange = (id: string, grade: 'S' | 'A' | 'B' | 'C') => {
    updateProposal(id, { grade2nd: grade });
  };

  const submit2ndReview = (id: string) => {
    const p = proposals.find(item => item.id === id);
    if (!p?.grade2nd) return toast.error("등급을 선택해주세요.");

    toast.success(`제안 ${id} 건이 최종 ${p.grade2nd}등급으로 확정되었습니다! (포상 정산 대기)`);
    updateProposal(id, { status: 'Completed' });
    // TODO: Add mileage logic here
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">심의 위원회</h1>
          <p className="text-slate-500 mt-1">1차 스크리닝 및 2차 등급 확정 평가를 수행합니다.</p>
        </div>

        <div className="flex bg-slate-200 p-1 rounded-lg">
          <button
            onClick={() => setActiveRound('1st')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${activeRound === '1st' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Filter size={16} /> 1차 심의 (스크리닝)
          </button>
          <button
            onClick={() => setActiveRound('2nd')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${activeRound === '2nd' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Star size={16} /> 2차 심의 (등급 확정)
          </button>
        </div>
      </div>

      {/* Info Bar */}
      {activeRound === '1st' ? (
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex flex-col md:flex-row gap-4 text-sm text-blue-800">
          <div className="flex items-center gap-2 font-bold"><Layers size={18} /> 1차 심의 규칙:</div>
          <div className="flex gap-4 opacity-80">
            <span>• 필요성 (40점)</span>
            <span>• 실현성 (60점)</span>
            <span className="font-bold">• 커트라인: 80점 (미만 자동 탈락)</span>
          </div>
        </div>
      ) : (
        <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl flex flex-col md:flex-row gap-4 text-sm text-purple-800">
          <div className="flex items-center gap-2 font-bold"><Award size={18} /> 2차 심의 규칙:</div>
          <div className="flex gap-4 opacity-80">
            <span>• 사업 영향도 평가</span>
            <span>• 최종 등급(S/A/B/C) 확정</span>
          </div>
        </div>
      )}

      {/* Proposal List */}
      <div className="grid gap-4">
        {filteredProposals.length === 0 && (
          <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-gray-200 border-dashed">
            해당 단계에 대기중인 제안이 없습니다.
          </div>
        )}

        {filteredProposals.map((prop) => (
          <div key={prop.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col lg:flex-row gap-6">
            {/* Proposal Content */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-mono font-bold rounded">{prop.id}</span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs font-bold uppercase rounded">대상부서: {prop.targetDepartment}</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{prop.title}</h3>
                <p className="text-slate-500 text-sm mt-1">{prop.summary}</p>
              </div>
              {prop.deptReviewComment && (
                <div className="text-xs bg-slate-50 p-2 rounded border border-slate-100 text-slate-600">
                  <span className="font-bold">실행 부서 의견:</span> {prop.deptReviewComment}
                </div>
              )}
            </div>

            {/* Evaluation Action Area */}
            <div className="lg:w-[400px] bg-slate-50 p-5 rounded-xl border border-gray-200">

              {activeRound === '1st' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">필요성 (40점)</label>
                      <input
                        type="number"
                        value={prop.score1st?.necessity || ''}
                        onChange={(e) => handle1stScoreChange(prop.id, 'necessity', e.target.value)}
                        className="w-full text-center font-bold border-gray-300 rounded focus:ring-primary focus:border-primary bg-white text-slate-900"
                        max={40}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">실현성 (60점)</label>
                      <input
                        type="number"
                        value={prop.score1st?.feasibility || ''}
                        onChange={(e) => handle1stScoreChange(prop.id, 'feasibility', e.target.value)}
                        className="w-full text-center font-bold border-gray-300 rounded focus:ring-primary focus:border-primary bg-white text-slate-900"
                        max={60}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div>
                      <div className="text-xs text-slate-400 uppercase font-bold">총점</div>
                      <div className={`text-2xl font-black ${prop.score1st?.passed ? 'text-primary' : 'text-slate-400'}`}>
                        {prop.score1st?.total || 0}<span className="text-sm text-slate-300 font-normal">/100</span>
                      </div>
                    </div>
                    <button
                      onClick={() => submit1stReview(prop.id)}
                      className={`px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-all flex items-center gap-2
                        ${prop.score1st?.passed
                          ? 'bg-primary text-white hover:bg-primary-hover'
                          : 'bg-white border border-gray-200 text-slate-400 hover:text-red-500'}`}
                    >
                      {prop.score1st?.passed ? <>2차 상정 <ArrowRight size={16} /></> : '탈락 처리'}
                    </button>
                  </div>
                </div>
              )}

              {activeRound === '2nd' && (
                <div className="space-y-4">
                  <div className="bg-white p-3 rounded border border-gray-200 mb-2">
                    <span className="text-xs text-slate-400 font-bold uppercase block mb-1">1차 심의 점수</span>
                    <span className="text-lg font-bold text-slate-700">{prop.score1st?.total} 점</span>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">최종 등급 부여</label>
                    <div className="grid grid-cols-4 gap-2">
                      {['S', 'A', 'B', 'C'].map((g) => (
                        <button
                          key={g}
                          onClick={() => handle2ndGradeChange(prop.id, g as any)}
                          className={`py-2 rounded font-black text-sm border transition-all
                            ${prop.grade2nd === g
                              ? 'bg-primary text-white border-primary ring-2 ring-primary/30'
                              : 'bg-white text-slate-400 border-gray-200 hover:border-primary hover:text-primary'}
                          `}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => submit2ndReview(prop.id)}
                    className="w-full mt-2 py-3 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={16} /> 최종 확정 및 포상
                  </button>
                </div>
              )}

            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Evaluation;