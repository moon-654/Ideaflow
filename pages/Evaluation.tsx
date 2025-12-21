import React, { useState } from 'react';
import { useProposalStore } from '../context/ProposalContext';
import { Search, Filter, Layers, Star, CheckCircle, ArrowRight, Award, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { stripHtml } from '../utils/html';
import DOMPurify from 'dompurify';

const Evaluation: React.FC = () => {
  const { proposals, updateProposal, settings, currentUser } = useProposalStore();
  const [activeRound, setActiveRound] = useState<'1st' | '2nd'>(() => {
    return currentUser.role === '2차 심의위원' ? '2nd' : '1st';
  });
  const [filterText, setFilterText] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Get dynamic settings
  const criteria = settings.evaluationCriteria || [];
  const cutoff = settings.evaluationCutoff || 80;
  const grades = settings.grades || [];
  const totalMaxPoints = criteria.reduce((sum, c) => sum + c.maxPoints, 0);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Filter logic
  const filteredProposals = proposals.filter(p => {
    const matchesRound = activeRound === '1st'
      ? p.status === '1st_Review'
      : p.status === '2nd_Review';
    const matchesSearch = p.title.toLowerCase().includes(filterText.toLowerCase()) || p.id.includes(filterText);
    return matchesRound && matchesSearch;
  });

  // 1st Round Handlers - Dynamic criteria
  const handle1stScoreChange = (id: string, criteriaId: string, val: string) => {
    const criterion = criteria.find(c => c.id === criteriaId);
    if (!criterion) return;

    const num = parseInt(val) || 0;
    const clamped = Math.min(criterion.maxPoints, Math.max(0, num));

    const p = proposals.find(item => item.id === id);
    if (!p) return;

    const currentScore = p.score1st || { total: 0, passed: false };
    const newScore = { ...currentScore, [criteriaId]: clamped };

    // Calculate total from all criteria
    newScore.total = criteria.reduce((sum, c) => sum + (newScore[c.id] || 0), 0);
    newScore.passed = newScore.total >= cutoff;

    updateProposal(id, { score1st: newScore });
  };

  const submit1stReview = (id: string) => {
    const p = proposals.find(item => item.id === id);
    if (p?.score1st?.passed) {
      toast.success(`제안 ${id} 건이 2차 심의로 상정되었습니다! (+2 마일리지)`);
      updateProposal(id, { status: '2nd_Review' });
    } else {
      toast.error(`제안 ${id} 건이 기준 점수 미달로 탈락 처리되었습니다. (${cutoff}점 미만)`);
      updateProposal(id, { status: 'Rejected' });
    }
  };

  // 2nd Round Handlers - Dynamic grades
  const handle2ndGradeChange = (id: string, gradeId: string) => {
    updateProposal(id, { grade2nd: gradeId });
  };

  const submit2ndReview = (id: string) => {
    const p = proposals.find(item => item.id === id);
    if (!p?.grade2nd) return toast.error("등급을 선택해주세요.");

    const grade = grades.find(g => g.id === p.grade2nd);
    const gradeName = grade?.name || p.grade2nd;
    toast.success(`제안 ${id} 건이 최종 ${gradeName}으로 확정되었습니다! (포상 정산 대기)`);
    updateProposal(id, { status: 'Completed' });
  };

  // Calculate counts for badges
  const pending1st = proposals.filter(p => p.status === '1st_Review').length;
  const pending2nd = proposals.filter(p => p.status === '2nd_Review').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">심의 위원회</h1>
          <p className="text-slate-500 mt-1">1차 스크리닝 및 2차 등급 확정 평가를 수행합니다.</p>
        </div>

        <div className="flex bg-slate-200 p-1 rounded-lg">
          {(currentUser.role === 'Admin' || currentUser.role === 'Reviewer' || currentUser.role === '1차 심의위원') && (
            <button
              onClick={() => setActiveRound('1st')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${activeRound === '1st' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Filter size={16} /> 1차 심의 (스크리닝)
              {pending1st > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center animate-pulse-subtle">
                  {pending1st}
                </span>
              )}
            </button>
          )}
          {(currentUser.role === 'Admin' || currentUser.role === 'Reviewer' || currentUser.role === '2차 심의위원') && (
            <button
              onClick={() => setActiveRound('2nd')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${activeRound === '2nd' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Star size={16} /> 2차 심의 (등급 확정)
              {pending2nd > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center animate-pulse-subtle">
                  {pending2nd}
                </span>
              )}
            </button>
          )}
        </div>
      </div>


      {/* Info Bar - Dynamic */}
      {
        activeRound === '1st' ? (
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex flex-col md:flex-row gap-4 text-sm text-blue-800">
            <div className="flex items-center gap-2 font-bold"><Layers size={18} /> 1차 심의 규칙:</div>
            <div className="flex gap-4 opacity-80 flex-wrap">
              {criteria.map(c => (
                <span key={c.id}>• {c.name} ({c.maxPoints}점)</span>
              ))}
              <span className="font-bold">• 커트라인: {cutoff}점 (미만 자동 탈락)</span>
            </div>
          </div>
        ) : (
          <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl flex flex-col md:flex-row gap-4 text-sm text-purple-800">
            <div className="flex items-center gap-2 font-bold"><Award size={18} /> 2차 심의 규칙:</div>
            <div className="flex gap-4 opacity-80 flex-wrap">
              <span>• 사업 영향도 평가</span>
              <span>• 최종 등급({grades.map(g => g.id).join('/')}) 확정</span>
            </div>
          </div>
        )
      }

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
                <p className="text-slate-500 text-sm mt-1 line-clamp-2">{stripHtml(prop.summary)}</p>
              </div>

              {/* Expand/Collapse Button */}
              <button
                onClick={() => toggleExpand(prop.id)}
                className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-hover transition-colors"
              >
                {expandedId === prop.id ? (
                  <><ChevronUp size={16} /> 접기</>
                ) : (
                  <><ChevronDown size={16} /> 상세 보기</>
                )}
              </button>

              {/* Expanded Detail Section */}
              {expandedId === prop.id && (
                <div className="space-y-4 border-t border-slate-100 pt-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">현황 및 문제점</label>
                    <div
                      className="text-slate-700 text-sm leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(prop.currentProblem || '<p class="text-slate-400">내용이 없습니다.</p>') }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">개선 방안</label>
                    <div
                      className="text-slate-700 text-sm leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(prop.improvementPlan || '<p class="text-slate-400">내용이 없습니다.</p>') }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">기대 효과</label>
                    <div
                      className="text-slate-700 text-sm leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(prop.expectedEffect || '<p class="text-slate-400">내용이 없습니다.</p>') }}
                    />
                  </div>
                  {prop.expectedAmount && (
                    <div className="flex items-center gap-2 bg-green-50 p-3 rounded-lg border border-green-100">
                      <DollarSign size={18} className="text-green-600" />
                      <span className="text-sm font-bold text-green-700">
                        예상 효과 금액: {prop.expectedAmount.toLocaleString('ko-KR')}원 / 연
                      </span>
                    </div>
                  )}
                </div>
              )}

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
                  {/* Dynamic criteria inputs */}
                  <div className={`grid gap-4 ${criteria.length <= 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {criteria.map(c => (
                      <div key={c.id}>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          {c.name} ({c.maxPoints}점)
                        </label>
                        <input
                          type="number"
                          value={prop.score1st?.[c.id] || ''}
                          onChange={(e) => handle1stScoreChange(prop.id, c.id, e.target.value)}
                          className="w-full text-center font-bold border-gray-300 rounded focus:ring-primary focus:border-primary bg-white text-slate-900"
                          max={c.maxPoints}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div>
                      <div className="text-xs text-slate-400 uppercase font-bold">총점</div>
                      <div className={`text-2xl font-black ${prop.score1st?.passed ? 'text-primary' : 'text-slate-400'}`}>
                        {prop.score1st?.total || 0}<span className="text-sm text-slate-300 font-normal">/{totalMaxPoints}</span>
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
                    <div className={`grid gap-2 ${grades.length <= 4 ? `grid-cols-${grades.length}` : 'grid-cols-4'}`}>
                      {grades.map((g) => (
                        <button
                          key={g.id}
                          onClick={() => handle2ndGradeChange(prop.id, g.id)}
                          className={`py-2 rounded font-black text-sm border transition-all
                            ${prop.grade2nd === g.id
                              ? 'bg-primary text-white border-primary ring-2 ring-primary/30'
                              : 'bg-white text-slate-400 border-gray-200 hover:border-primary hover:text-primary'}
                          `}
                        >
                          {g.id}
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
    </div >
  );
};

export default Evaluation;

