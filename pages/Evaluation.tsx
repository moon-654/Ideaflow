import React, { useState } from 'react';
import { useProposalStore } from '../context/ProposalContext';
import { Search, Filter, Layers, Star, CheckCircle, ArrowRight, Award, ChevronDown, ChevronUp, DollarSign, Sparkles, Loader2, Wand2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { stripHtml } from '../utils/html';
import DOMPurify from 'dompurify';
import { aiService } from '../services/aiService';
import { ReviewerEvaluation } from '../types';

interface AIAnalysisResult {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  scores: Record<string, number>;
  reasoning: string;
}

const Evaluation: React.FC = () => {
  const { proposals, updateProposal, settings, currentUser, addReviewerEvaluation, hasUserReviewed, getReviewerCount } = useProposalStore();
  const [activeRound, setActiveRound] = useState<'1st' | '2nd'>(() => {
    return currentUser.role === '2차 심의위원' ? '2nd' : '1st';
  });
  const [filterText, setFilterText] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'completed' | 'all'>('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [analyzingIds, setAnalyzingIds] = useState<Record<string, boolean>>({});
  const [aiResults, setAiResults] = useState<Record<string, AIAnalysisResult>>({});

  // Local scores for current reviewer (before submission)
  const [localScores, setLocalScores] = useState<Record<string, Record<string, number>>>({});
  const [localComments, setLocalComments] = useState<Record<string, string>>({});
  const [doubleImpact, setDoubleImpact] = useState<Record<string, boolean>>({}); // 성과의 크기 2배 적용

  // 2nd round AI analysis state
  const [analyzing2ndIds, setAnalyzing2ndIds] = useState<Record<string, boolean>>({});
  const [aiResults2nd, setAiResults2nd] = useState<Record<string, any>>({});

  // Get dynamic settings
  const criteria = settings.evaluationCriteria || [];
  const criteria2nd = settings.evaluation2ndCriteria || [];
  const cutoff = settings.evaluationCutoff || 60;
  const grades = settings.grades || [];
  const totalMaxPoints = criteria.reduce((sum, c) => sum + c.maxPoints, 0);
  const totalMaxPoints2nd = criteria2nd.reduce((sum, c) => sum + c.maxPoints, 0);
  const requiredReviewers1st = Math.ceil((settings.totalReviewers1st || 3) / 2) + 1; // Majority
  const requiredReviewers2nd = Math.ceil((settings.totalReviewers2nd || 5) / 2) + 1;

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Filter logic - includes sub-tab filtering
  const filteredProposals = proposals.filter(p => {
    // Round filter
    const matchesRound = activeRound === '1st'
      ? p.status === '1st_Review'
      : p.status === '2nd_Review';

    // Search filter
    const matchesSearch = p.title.toLowerCase().includes(filterText.toLowerCase()) || p.id.includes(filterText);

    // Sub-tab filter
    const round = activeRound;
    const userReviewed = hasUserReviewed(p.id, currentUser.id, round);

    let matchesSubTab = true;
    if (activeSubTab === 'pending') {
      matchesSubTab = !userReviewed; // Only show proposals not yet reviewed by this user
    } else if (activeSubTab === 'completed') {
      matchesSubTab = userReviewed; // Only show proposals reviewed by this user
    }
    // 'all' shows everything (no additional filter)

    return matchesRound && matchesSearch && matchesSubTab;
  });

  // Count for badges
  const pendingCount = proposals.filter(p => {
    const matchesRound = activeRound === '1st' ? p.status === '1st_Review' : p.status === '2nd_Review';
    return matchesRound && !hasUserReviewed(p.id, currentUser.id, activeRound);
  }).length;

  const completedCount = proposals.filter(p => {
    const matchesRound = activeRound === '1st' ? p.status === '1st_Review' : p.status === '2nd_Review';
    return matchesRound && hasUserReviewed(p.id, currentUser.id, activeRound);
  }).length;

  const allCount = proposals.filter(p => {
    return activeRound === '1st' ? p.status === '1st_Review' : p.status === '2nd_Review';
  }).length;

  // Local score handlers (for current reviewer before submission)
  const handleLocalScoreChange = (proposalId: string, criteriaId: string, value: string, maxPoints: number) => {
    const num = parseInt(value) || 0;
    const clamped = Math.min(maxPoints, Math.max(0, num));

    setLocalScores(prev => ({
      ...prev,
      [proposalId]: {
        ...(prev[proposalId] || {}),
        [criteriaId]: clamped
      }
    }));
  };

  const getLocalTotal = (proposalId: string, round: '1st' | '2nd'): number => {
    const scores = localScores[proposalId] || {};
    const criteriaList = round === '1st' ? criteria : criteria2nd;

    let total = 0;
    criteriaList.forEach(c => {
      const score = scores[c.id] || 0;
      // 성과의 크기 항목은 2배 적용 체크박스 선택 시 2배
      if (round === '2nd' && c.id === 'impact' && doubleImpact[proposalId]) {
        total += score * 2;
      } else {
        total += score;
      }
    });
    return total;
  };

  // 2차 AI Analysis Handler
  const handleAI2ndAnalyze = async (proposalId: string) => {
    if (!aiService.hasKey()) {
      toast.error('AI 기능을 사용하려면 프로필에서 API Key를 먼저 등록해주세요.');
      return;
    }

    setAnalyzing2ndIds(prev => ({ ...prev, [proposalId]: true }));

    try {
      const proposal = proposals.find(p => p.id === proposalId);
      if (!proposal) throw new Error('제안을 찾을 수 없습니다.');

      const proposalBody = `
현황 문제점: ${proposal.currentProblem || ''}
개선 방안: ${proposal.improvementPlan || ''}
기대 효과: ${proposal.expectedEffect || ''}
예상 금액: ${proposal.expectedAmount ? proposal.expectedAmount.toLocaleString() + '원' : '미입력'}
      `;

      const response = await aiService.analyze2ndRound(proposal.title, proposalBody, criteria2nd);

      if (response.text && !response.error) {
        const result = aiService.parseJSON(response.text);
        setAiResults2nd(prev => ({ ...prev, [proposalId]: result }));

        // Auto-set double impact if AI recommends it
        if (result.shouldDoubleImpact) {
          setDoubleImpact(prev => ({ ...prev, [proposalId]: true }));
        }

        toast.success('2차 AI 분석이 완료되었습니다!');
      } else {
        throw new Error(response.error || 'AI 분석 실패');
      }
    } catch (error) {
      console.error('2nd AI Analysis error:', error);
      toast.error('AI 분석 중 오류가 발생했습니다.');
    } finally {
      setAnalyzing2ndIds(prev => ({ ...prev, [proposalId]: false }));
    }
  };

  // Apply 2nd AI scores
  const apply2ndAIScores = (proposalId: string) => {
    const result = aiResults2nd[proposalId];
    if (!result?.scores) return;

    const newScores: Record<string, number> = {};
    criteria2nd.forEach(c => {
      // Map criteria names to IDs
      const score = result.scores[c.name];
      if (score !== undefined) {
        newScores[c.id] = Math.min(c.maxPoints, Math.max(0, score));
      }
    });

    setLocalScores(prev => ({
      ...prev,
      [proposalId]: { ...(prev[proposalId] || {}), ...newScores }
    }));

    toast.success('AI 추천 점수가 적용되었습니다.');
  };

  // Submit individual reviewer's evaluation
  const submitMyEvaluation = (proposalId: string, round: '1st' | '2nd') => {
    const scores = localScores[proposalId] || {};
    const criteriaList = round === '1st' ? criteria : criteria2nd;

    // Validate all criteria have scores
    const missingCriteria = criteriaList.filter(c => scores[c.id] === undefined || scores[c.id] === 0);
    if (missingCriteria.length > 0) {
      toast.error(`모든 항목에 점수를 입력해주세요: ${missingCriteria.map(c => c.name).join(', ')}`);
      return;
    }

    const total = getLocalTotal(proposalId, round);

    const evaluation: ReviewerEvaluation = {
      id: `${currentUser.id}-${proposalId}-${Date.now()}`,
      reviewerId: currentUser.id,
      reviewerName: currentUser.name,
      evaluatedAt: new Date().toISOString(),
      round,
      scores,
      total,
      comment: localComments[proposalId] || ''
    };

    addReviewerEvaluation(proposalId, evaluation);

    // Clear local state for this proposal
    setLocalScores(prev => {
      const newState = { ...prev };
      delete newState[proposalId];
      return newState;
    });
    setLocalComments(prev => {
      const newState = { ...prev };
      delete newState[proposalId];
      return newState;
    });

    toast.success(`${round === '1st' ? '1차' : '2차'} 심의 평가가 제출되었습니다!`);
  };

  // Finalize review round (Admin only - after majority achieved)
  const finalize1stReview = (id: string) => {
    const p = proposals.find(item => item.id === id);
    if (!p?.aggregated1st) {
      toast.error('집계된 평가 결과가 없습니다.');
      return;
    }

    const reviewerCount = p.aggregated1st.reviewerCount;
    if (reviewerCount < requiredReviewers1st) {
      toast.error(`최소 ${requiredReviewers1st}명의 심의위원 평가가 필요합니다. (현재: ${reviewerCount}명)`);
      return;
    }

    if (p.aggregated1st.passed) {
      toast.success(`제안 ${id} 건이 2차 심의로 상정되었습니다! (평균 ${p.aggregated1st.averageTotal}점)`);
      updateProposal(id, { status: '2nd_Review' });
    } else {
      toast.error(`제안 ${id} 건이 기준 점수 미달로 탈락 처리되었습니다. (${p.aggregated1st.averageTotal}점 < ${cutoff}점)`);
      updateProposal(id, { status: 'Rejected' });
    }
  };

  const finalize2ndReview = (id: string) => {
    const p = proposals.find(item => item.id === id);
    if (!p?.aggregated2nd) {
      toast.error('집계된 평가 결과가 없습니다.');
      return;
    }

    const reviewerCount = p.aggregated2nd.reviewerCount;
    if (reviewerCount < requiredReviewers2nd) {
      toast.error(`최소 ${requiredReviewers2nd}명의 심의위원 평가가 필요합니다. (현재: ${reviewerCount}명)`);
      return;
    }

    const grade = grades.find(g => g.id === p.aggregated2nd?.finalGrade);
    const gradeName = grade?.name || p.aggregated2nd.finalGrade;
    const rewardAmount = p.aggregated2nd.rewardAmount.toLocaleString('ko-KR');

    toast.success(`제안 ${id} 건이 최종 ${gradeName}으로 확정되었습니다! (포상금: ${rewardAmount}원)`);
    updateProposal(id, { status: 'Completed', grade2nd: p.aggregated2nd.finalGrade });
  };

  // AI Handlers
  const handleAIAnalyze = async (proposalId: string) => {
    if (!aiService.hasKey()) {
      toast.error('AI 기능을 사용하려면 프로필에서 API Key를 먼저 등록해주세요.');
      return;
    }

    const p = proposals.find(item => item.id === proposalId);
    if (!p) return;

    setAnalyzingIds(prev => ({ ...prev, [proposalId]: true }));
    try {
      const criteriaList = criteria.map(c => ({ id: c.id, name: c.name, maxPoints: c.maxPoints }));

      const response = await aiService.analyzeProposal(
        p.title,
        stripHtml(p.currentProblem + ' ' + p.improvementPlan + ' ' + p.expectedEffect),
        criteriaList
      );

      if (response.error) {
        toast.error(`AI 오류: ${response.error}`);
        return;
      }

      let cleanedText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
      const result = JSON.parse(cleanedText);

      setAiResults(prev => ({ ...prev, [proposalId]: result }));
      toast.success('AI 심사 분석이 완료되었습니다!');

    } catch (error) {
      console.error(error);
      toast.error('AI 분석 중 오류가 발생했습니다.');
    } finally {
      setAnalyzingIds(prev => ({ ...prev, [proposalId]: false }));
    }
  };

  const applyAIScores = (proposalId: string) => {
    const result = aiResults[proposalId];
    if (!result || !result.scores) return;

    const newScores: Record<string, number> = {};

    // Map AI score names to criteria IDs
    criteria.forEach(c => {
      if (result.scores[c.name] !== undefined) {
        newScores[c.id] = Math.min(c.maxPoints, Math.max(0, result.scores[c.name]));
      }
    });

    // Update localScores state (for multi-reviewer submission)
    setLocalScores(prev => ({
      ...prev,
      [proposalId]: { ...(prev[proposalId] || {}), ...newScores }
    }));

    toast.success('AI 추천 점수가 적용되었습니다. 평가 제출 버튼을 눌러주세요.');
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

      {/* Sub-Tab Navigation */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setActiveSubTab('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2
            ${activeSubTab === 'pending'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-500 border border-gray-200 hover:border-blue-300 hover:text-blue-600'}`}
        >
          📥 대기중
          {pendingCount > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] min-w-[18px] text-center
              ${activeSubTab === 'pending' ? 'bg-white/20 text-white' : 'bg-red-500 text-white animate-pulse-subtle'}`}>
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveSubTab('completed')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2
            ${activeSubTab === 'completed'
              ? 'bg-green-600 text-white shadow-sm'
              : 'bg-white text-slate-500 border border-gray-200 hover:border-green-300 hover:text-green-600'}`}
        >
          ✓ 내 심사 완료
          {completedCount > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] min-w-[18px] text-center
              ${activeSubTab === 'completed' ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'}`}>
              {completedCount}
            </span>
          )}
        </button>
        {currentUser.role === 'Admin' && (
          <button
            onClick={() => setActiveSubTab('all')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2
              ${activeSubTab === 'all'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-white text-slate-500 border border-gray-200 hover:border-slate-400 hover:text-slate-700'}`}
          >
            📊 전체 현황
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] min-w-[18px] text-center
              ${activeSubTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {allCount}
            </span>
          </button>
        )}
      </div>

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
                  {/* AI Analyze Button */}
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase">심사 평가</span>
                    <button
                      onClick={() => handleAIAnalyze(prop.id)}
                      disabled={analyzingIds[prop.id]}
                      className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded flex items-center gap-1 hover:bg-purple-200 transition-colors font-bold disabled:opacity-50"
                    >
                      {analyzingIds[prop.id] ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      AI 심사 보조
                    </button>
                  </div>

                  {/* AI Result Box */}
                  {aiResults[prop.id] && (
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 text-sm space-y-3 mb-4 animate-fade-in relative">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-purple-800 flex items-center gap-2">
                          <Wand2 size={14} /> AI 분석 리포트
                        </h4>
                        <button
                          onClick={() => setAiResults(prev => { const n = { ...prev }; delete n[prop.id]; return n; })}
                          className="text-purple-400 hover:text-purple-600"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-slate-700">📌 요약</p>
                        <p className="text-slate-600 text-xs">{aiResults[prop.id].summary}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="font-bold text-green-700 text-xs">👍 강점</p>
                          <ul className="list-disc pl-3 text-[10px] text-slate-600">
                            {aiResults[prop.id].strengths.map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                        <div>
                          <p className="font-bold text-red-700 text-xs">👎 약점</p>
                          <ul className="list-disc pl-3 text-[10px] text-slate-600">
                            {aiResults[prop.id].weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                          </ul>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-slate-700">💡 심사평</p>
                        <p className="text-slate-600 text-xs">{aiResults[prop.id].reasoning}</p>
                      </div>
                      <button
                        onClick={() => applyAIScores(prop.id)}
                        className="w-full py-1.5 bg-purple-600 text-white rounded text-xs font-bold hover:bg-purple-700 transition-colors"
                      >
                        AI 추천 점수 적용하기
                      </button>
                    </div>
                  )}

                  {/* Check if user already reviewed */}
                  {hasUserReviewed(prop.id, currentUser.id, '1st') ? (
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-center">
                      <CheckCircle className="mx-auto text-green-500 mb-2" size={24} />
                      <p className="text-sm font-bold text-green-700">평가 완료</p>
                      <p className="text-xs text-green-600">이미 이 제안에 대한 평가를 제출하셨습니다.</p>
                    </div>
                  ) : (
                    <>
                      {/* Dynamic criteria inputs */}
                      <div className={`grid gap-4 ${criteria.length <= 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {criteria.map(c => (
                          <div key={c.id}>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                              {c.name} ({c.maxPoints}점)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max={c.maxPoints}
                              value={localScores[prop.id]?.[c.id] || ''}
                              onChange={(e) => handleLocalScoreChange(prop.id, c.id, e.target.value, c.maxPoints)}
                              className="w-full text-center font-bold border-gray-300 rounded focus:ring-primary focus:border-primary bg-white text-slate-900"
                              placeholder="0"
                            />
                          </div>
                        ))}
                      </div>

                      {/* Comment Input */}
                      <div className="mt-4">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          심사 코멘트 (선택)
                        </label>
                        <textarea
                          value={localComments[prop.id] || ''}
                          onChange={(e) => setLocalComments(prev => ({ ...prev, [prop.id]: e.target.value }))}
                          placeholder="심사 의견을 입력해주세요..."
                          className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-primary focus:border-primary resize-none"
                          rows={2}
                        />
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div>
                          <div className="text-xs text-slate-400 uppercase font-bold">내 평가 총점</div>
                          <div className="text-xl font-black text-primary">
                            {getLocalTotal(prop.id, '1st')}<span className="text-sm text-slate-300 font-normal">/{totalMaxPoints}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => submitMyEvaluation(prop.id, '1st')}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-all flex items-center gap-2"
                        >
                          <CheckCircle size={16} /> 평가 제출
                        </button>
                      </div>
                    </>
                  )}

                  {/* Aggregated Results Display */}
                  {prop.aggregated1st && (
                    <div className={`p-4 rounded-lg border mt-4 ${prop.aggregated1st.passed ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Users size={16} className={prop.aggregated1st.passed ? 'text-blue-600' : 'text-red-600'} />
                        <span className={`text-xs font-bold ${prop.aggregated1st.passed ? 'text-blue-700' : 'text-red-700'}`}>
                          집계 결과 ({prop.aggregated1st.reviewerCount}명 참여 / 필요: {requiredReviewers1st}명)
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className={`text-xs ${prop.aggregated1st.passed ? 'text-blue-500' : 'text-red-500'}`}>평균 점수</div>
                          <div className={`text-2xl font-black ${prop.aggregated1st.passed ? 'text-blue-700' : 'text-red-700'}`}>
                            {prop.aggregated1st.averageTotal}점
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xs ${prop.aggregated1st.passed ? 'text-blue-500' : 'text-red-500'}`}>커트라인</div>
                          <div className={`text-lg font-bold ${prop.aggregated1st.passed ? 'text-blue-600' : 'text-red-600'}`}>
                            {cutoff}점
                          </div>
                          <div className={`text-xs font-bold ${prop.aggregated1st.passed ? 'text-green-600' : 'text-red-600'}`}>
                            {prop.aggregated1st.passed ? '✓ 통과' : '✕ 미달'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Admin: Individual Reviewer Details */}
                  {currentUser.role === 'Admin' && (
                    <div className="mt-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <h4 className="text-xs font-bold text-slate-600 uppercase mb-3 flex items-center gap-2">
                        <Users size={14} /> 심사자별 상세 ({prop.reviews1st?.length || 0}/{settings.totalReviewers1st || 3}명)
                      </h4>
                      {prop.reviews1st && prop.reviews1st.length > 0 ? (
                        <div className="space-y-2">
                          {prop.reviews1st.map((review, idx) => (
                            <div key={idx} className="bg-white p-3 rounded border border-slate-200 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                                  {review.reviewerName?.charAt(0) || '?'}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-700">{review.reviewerName}</p>
                                  <p className="text-[10px] text-slate-400">{new Date(review.evaluatedAt).toLocaleString('ko-KR')}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-black text-primary">{review.total}점</div>
                                {review.comment && (
                                  <p className="text-[10px] text-slate-500 max-w-[150px] truncate" title={review.comment}>
                                    "{review.comment}"
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-slate-400 text-sm">
                          <p>⏳ 아직 제출된 심사가 없습니다.</p>
                          <p className="text-xs mt-1">심의위원들이 평가를 제출하면 여기에 표시됩니다.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Admin Finalize Button */}
                  {currentUser.role === 'Admin' && prop.aggregated1st && (
                    <button
                      onClick={() => finalize1stReview(prop.id)}
                      className={`w-full mt-2 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2
                        ${prop.aggregated1st.passed
                          ? 'bg-primary text-white hover:bg-primary-hover'
                          : 'bg-red-500 text-white hover:bg-red-600'}`}
                    >
                      {prop.aggregated1st.passed ? (
                        <><ArrowRight size={16} /> 2차 심의 상정 ({prop.aggregated1st.reviewerCount}/{settings.totalReviewers1st}명)</>
                      ) : (
                        <><CheckCircle size={16} /> 탈락 처리 ({prop.aggregated1st.reviewerCount}/{settings.totalReviewers1st}명)</>
                      )}
                    </button>
                  )}
                </div>
              )}

              {activeRound === '2nd' && (
                <div className="space-y-4">
                  {/* Aggregated 1st Round Score */}
                  <div className="bg-white p-3 rounded border border-gray-200 mb-2">
                    <span className="text-xs text-slate-400 font-bold uppercase block mb-1">1차 심의 평균 점수</span>
                    <span className="text-lg font-bold text-slate-700">
                      {prop.aggregated1st?.averageTotal || prop.score1st?.total || 0} 점
                    </span>
                  </div>

                  {/* Check if user already reviewed */}
                  {hasUserReviewed(prop.id, currentUser.id, '2nd') ? (
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-center">
                      <CheckCircle className="mx-auto text-green-500 mb-2" size={24} />
                      <p className="text-sm font-bold text-green-700">평가 완료</p>
                      <p className="text-xs text-green-600">이미 이 제안에 대한 평가를 제출하셨습니다.</p>
                    </div>
                  ) : (
                    <>
                      {/* 2차 AI Analysis Button */}
                      <div className="flex items-center gap-2 mb-3">
                        <button
                          onClick={() => handleAI2ndAnalyze(prop.id)}
                          disabled={analyzing2ndIds[prop.id]}
                          className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-200 transition-all disabled:opacity-50"
                        >
                          {analyzing2ndIds[prop.id] ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                          2차 AI 심사 보조
                        </button>
                      </div>

                      {/* 2nd AI Result Box */}
                      {aiResults2nd[prop.id] && (
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 text-sm space-y-3 mb-4 animate-fade-in">
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-purple-800 flex items-center gap-2">
                              <Wand2 size={14} /> 2차 AI 분석 결과
                            </h4>
                            <button
                              onClick={() => setAiResults2nd(prev => { const n = { ...prev }; delete n[prop.id]; return n; })}
                              className="text-purple-400 hover:text-purple-600"
                            >
                              ✕
                            </button>
                          </div>
                          <p className="text-xs text-slate-600">{aiResults2nd[prop.id].summary}</p>
                          <p className="text-xs text-purple-700 font-medium">{aiResults2nd[prop.id].reasoning}</p>
                          <p className="text-xs text-purple-800 font-bold">📊 {aiResults2nd[prop.id].recommendation}</p>
                          <button
                            onClick={() => apply2ndAIScores(prop.id)}
                            className="w-full py-1.5 bg-purple-600 text-white rounded text-xs font-bold hover:bg-purple-700 transition-colors"
                          >
                            AI 추천 점수 적용하기
                          </button>
                        </div>
                      )}

                      {/* 2nd Round Criteria Inputs */}
                      <div className="grid gap-3">
                        {criteria2nd.map(c => (
                          <div key={c.id}>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                              {c.name} ({c.maxPoints}점){c.id === 'impact' && doubleImpact[prop.id] && <span className="text-purple-600 ml-1">×2</span>}
                            </label>
                            <input
                              type="number"
                              min="0"
                              max={c.maxPoints}
                              value={localScores[prop.id]?.[c.id] || ''}
                              onChange={(e) => handleLocalScoreChange(prop.id, c.id, e.target.value, c.maxPoints)}
                              className="w-full text-center font-bold border-gray-300 rounded focus:ring-primary focus:border-primary bg-white text-slate-900"
                              placeholder="0"
                            />
                          </div>
                        ))}
                      </div>

                      {/* 성과의 크기 2배 적용 Checkbox */}
                      <div className="flex items-center gap-2 mt-3 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                        <input
                          type="checkbox"
                          id={`double-${prop.id}`}
                          checked={doubleImpact[prop.id] || false}
                          onChange={(e) => setDoubleImpact(prev => ({ ...prev, [prop.id]: e.target.checked }))}
                          className="w-4 h-4 text-yellow-600 rounded focus:ring-yellow-500"
                        />
                        <label htmlFor={`double-${prop.id}`} className="text-xs text-yellow-800 font-medium">
                          성과의 크기 2배 적용 (제안 내용에서 특정 항목 선정 시)
                        </label>
                      </div>

                      {/* Comment Input */}
                      <div className="mt-3">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          심사 코멘트 (선택)
                        </label>
                        <textarea
                          value={localComments[prop.id] || ''}
                          onChange={(e) => setLocalComments(prev => ({ ...prev, [prop.id]: e.target.value }))}
                          placeholder="심사 의견을 입력해주세요..."
                          className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-primary focus:border-primary resize-none"
                          rows={2}
                        />
                      </div>

                      {/* Local Total */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                        <div>
                          <div className="text-xs text-slate-400 uppercase font-bold">내 평가 총점</div>
                          <div className="text-xl font-black text-primary">
                            {getLocalTotal(prop.id, '2nd')}<span className="text-sm text-slate-300 font-normal">/{totalMaxPoints2nd}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => submitMyEvaluation(prop.id, '2nd')}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg font-bold text-sm hover:bg-purple-700 transition-all flex items-center gap-2"
                        >
                          <CheckCircle size={16} /> 평가 제출
                        </button>
                      </div>
                    </>
                  )}

                  {/* Aggregated Results Display */}
                  {prop.aggregated2nd && (
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 mt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Users size={16} className="text-purple-600" />
                        <span className="text-xs font-bold text-purple-700">
                          집계 결과 ({prop.aggregated2nd.reviewerCount}명 참여 / 필요: {requiredReviewers2nd}명)
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-purple-500">평균 점수</div>
                          <div className="text-2xl font-black text-purple-700">
                            {prop.aggregated2nd.averageTotal}점
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-purple-500">예상 등급</div>
                          <div className="text-xl font-black text-purple-700">{prop.aggregated2nd.finalGrade}</div>
                          <div className="text-xs text-purple-600">{prop.aggregated2nd.rewardAmount.toLocaleString('ko-KR')}원</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Admin Finalize Button */}
                  {currentUser.role === 'Admin' && prop.aggregated2nd && (
                    <button
                      onClick={() => finalize2ndReview(prop.id)}
                      className="w-full mt-2 py-3 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={16} /> 최종 확정 ({prop.aggregated2nd.reviewerCount}/{settings.totalReviewers2nd}명)
                    </button>
                  )}
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

