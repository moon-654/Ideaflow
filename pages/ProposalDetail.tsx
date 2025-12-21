import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProposalStore } from '../context/ProposalContext';
import { ArrowLeft, Calendar, User, Tag, CheckCircle, Clock, AlertCircle, FileText, MessageCircle, Send, Trash2, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import DOMPurify from 'dompurify';

const STATUS_STEPS = [
    { id: 'New', label: '신규 등록' },
    { id: 'Dept_Review', label: '부서 검토' },
    { id: '1st_Review', label: '1차 심의' },
    { id: '2nd_Review', label: '2차 심의' },
    { id: 'Completed', label: '최종 완료' },
];

const ProposalDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { proposals, currentUser, addComment, deleteComment, settings } = useProposalStore();
    const [newComment, setNewComment] = useState('');

    const proposal = proposals.find(p => p.id === id);

    if (!proposal) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-slate-500">
                <AlertCircle size={48} className="mb-4 text-slate-300" />
                <p className="text-lg font-medium">제안을 찾을 수 없습니다.</p>
                <button
                    onClick={() => navigate(-1)}
                    className="mt-4 text-primary hover:underline"
                >
                    뒤로 가기
                </button>
            </div>
        );
    }

    const currentStepIndex = STATUS_STEPS.findIndex(s => s.id === proposal.status);
    const isRejected = proposal.status === 'Rejected';
    const isModificationRequested = proposal.status === 'Modification_Requested';
    const isMyProposal = proposal.proposer.id === currentUser.id;

    const handleAddComment = () => {
        if (!newComment.trim()) {
            toast.error('코멘트 내용을 입력해주세요.');
            return;
        }
        addComment(proposal.id, newComment.trim());
        setNewComment('');
        toast.success('코멘트가 등록되었습니다.');
    };

    const handleDeleteComment = (commentId: string) => {
        if (window.confirm('이 코멘트를 삭제하시겠습니까?')) {
            deleteComment(proposal.id, commentId);
            toast.success('코멘트가 삭제되었습니다.');
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-10">
            {/* Header & Navigation */}
            <div className="flex items-center gap-4 mb-2">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        {proposal.title}
                        <span className="text-sm font-normal text-slate-400 px-2 py-1 bg-slate-100 rounded-md">
                            {proposal.id}
                        </span>
                    </h1>
                </div>
            </div>

            {/* Status Timeline */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-6">진행 상태</h3>
                <div className="relative flex justify-between items-center px-4">
                    {/* Progress Bar Background */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 -z-10" />

                    {/* Active Progress Bar */}
                    {!isRejected && (
                        <div
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary transition-all duration-500 -z-10"
                            style={{ width: `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
                        />
                    )}

                    {STATUS_STEPS.map((step, index) => {
                        const isCompleted = !isRejected && index <= currentStepIndex;
                        const isCurrent = !isRejected && index === currentStepIndex;

                        return (
                            <div key={step.id} className="flex flex-col items-center gap-2 bg-white px-2">
                                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300
                  ${isCompleted
                                        ? 'bg-primary border-primary text-white'
                                        : 'bg-white border-slate-200 text-slate-300'}
                  ${isCurrent ? 'ring-4 ring-primary/20 scale-110' : ''}
                `}>
                                    {isCompleted ? <CheckCircle size={14} strokeWidth={3} /> : <div className="w-2 h-2 rounded-full bg-current" />}
                                </div>
                                <span className={`text-xs font-medium ${isCompleted ? 'text-primary' : 'text-slate-400'}`}>
                                    {step.label}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {isRejected && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-red-700">
                        <AlertCircle size={20} className="shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-sm">반려됨</p>
                            <p className="text-sm mt-1">이 제안은 심사 과정에서 반려되었습니다.</p>
                        </div>
                    </div>
                )}

                {isModificationRequested && (
                    <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-start gap-3 text-orange-700">
                            <AlertCircle size={20} className="shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-bold text-sm">수정 요청됨</p>
                                <p className="text-sm mt-1">{proposal.deptReviewComment || '수정이 필요합니다.'}</p>
                            </div>
                        </div>
                        {isMyProposal && (
                            <button
                                onClick={() => navigate(`/proposals/${encodeURIComponent(proposal.id)}/edit`)}
                                className="mt-4 w-full px-4 py-2 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition-colors"
                            >
                                수정 후 재상정하기
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Evaluation Results Section - For Proposer */}
            {isMyProposal && (proposal.status === '2nd_Review' || proposal.status === 'Completed' || proposal.status === 'Rejected') && (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <CheckCircle size={20} className="text-primary" />
                        심의 평가 결과
                    </h3>

                    {/* 1차 심의 결과 */}
                    {(proposal.aggregated1st || proposal.reviews1st?.length) && (
                        <div className="mb-6">
                            <h4 className="text-sm font-bold text-blue-700 mb-3 flex items-center gap-2">
                                📊 1차 심의 결과
                            </h4>
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm text-blue-600">평균 점수</span>
                                    <span className={`text-xl font-black ${proposal.aggregated1st?.passed ? 'text-green-600' : 'text-red-600'}`}>
                                        {proposal.aggregated1st?.averageTotal || proposal.score1st?.total || 0}점
                                        {proposal.aggregated1st?.passed ? ' (통과)' : ' (미달)'}
                                    </span>
                                </div>
                                {proposal.reviews1st && proposal.reviews1st.length > 0 && (
                                    <div className="space-y-2 mt-4 pt-4 border-t border-blue-200">
                                        <p className="text-xs font-bold text-blue-600 uppercase">심사 코멘트</p>
                                        {proposal.reviews1st.filter(r => r.comment).map((review, idx) => (
                                            <div key={idx} className="bg-white p-3 rounded border border-blue-100 text-sm">
                                                <p className="text-slate-700">"{review.comment}"</p>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    — {settings.blindMode?.proposer ? `심사자 ${idx + 1}` : review.reviewerName}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 2차 심의 결과 */}
                    {(proposal.aggregated2nd || proposal.reviews2nd?.length) && (
                        <div>
                            <h4 className="text-sm font-bold text-purple-700 mb-3 flex items-center gap-2">
                                🏆 2차 심의 결과
                            </h4>
                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm text-purple-600">최종 등급</span>
                                    <div className="text-right">
                                        <span className="text-xl font-black text-purple-700">
                                            {proposal.aggregated2nd?.finalGrade || proposal.grade2nd || '-'}
                                        </span>
                                        {proposal.aggregated2nd?.rewardAmount && (
                                            <p className="text-xs text-purple-500">
                                                포상금: {proposal.aggregated2nd.rewardAmount.toLocaleString('ko-KR')}원
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {proposal.reviews2nd && proposal.reviews2nd.length > 0 && (
                                    <div className="space-y-2 mt-4 pt-4 border-t border-purple-200">
                                        <p className="text-xs font-bold text-purple-600 uppercase">심사 코멘트</p>
                                        {proposal.reviews2nd.filter(r => r.comment).map((review, idx) => (
                                            <div key={idx} className="bg-white p-3 rounded border border-purple-100 text-sm">
                                                <p className="text-slate-700">"{review.comment}"</p>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    — {settings.blindMode?.proposer ? `심사자 ${idx + 1}` : review.reviewerName}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* No results yet */}
                    {!proposal.aggregated1st && !proposal.reviews1st?.length && !proposal.aggregated2nd && !proposal.reviews2nd?.length && (
                        <p className="text-slate-400 text-sm text-center py-4">
                            아직 심의 결과가 없습니다.
                        </p>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Summary */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <FileText size={20} className="text-slate-400" />
                            제안 내용
                        </h3>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">현황 및 문제점</label>
                                <div
                                    className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100 prose prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(proposal.currentProblem || '<p class="text-slate-400">내용이 없습니다.</p>') }}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">개선 방안</label>
                                <div
                                    className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100 prose prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(proposal.improvementPlan || '<p class="text-slate-400">내용이 없습니다.</p>') }}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">기대 효과</label>
                                <div
                                    className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100 prose prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(proposal.expectedEffect || '<p class="text-slate-400">내용이 없습니다.</p>') }}
                                />
                            </div>
                            {proposal.expectedAmount && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">예상 효과 금액</label>
                                    <div className="flex items-center gap-2 bg-green-50 p-4 rounded-lg border border-green-100">
                                        <DollarSign size={20} className="text-green-600" />
                                        <span className="text-xl font-bold text-green-700">
                                            {proposal.expectedAmount.toLocaleString('ko-KR')}
                                        </span>
                                        <span className="text-green-600">원 / 연</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Review Comments */}
                    {proposal.deptReviewComment && (
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-900 mb-4">부서 검토 의견</h3>
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-blue-800 text-sm leading-relaxed">
                                {proposal.deptReviewComment}
                            </div>
                        </div>
                    )}

                    {/* Comments Section */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <MessageCircle size={20} className="text-slate-400" />
                            코멘트
                            {proposal.comments && proposal.comments.length > 0 && (
                                <span className="text-sm font-normal text-slate-400">({proposal.comments.length})</span>
                            )}
                        </h3>

                        {/* Comment Input */}
                        <div className="flex gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <User size={18} />
                            </div>
                            <div className="flex-1">
                                <textarea
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="의견이나 질문을 남겨주세요..."
                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                                    rows={3}
                                />
                                <div className="flex justify-end mt-2">
                                    <button
                                        onClick={handleAddComment}
                                        disabled={!newComment.trim()}
                                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        <Send size={16} />
                                        등록
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Comments List */}
                        <div className="space-y-4">
                            {(!proposal.comments || proposal.comments.length === 0) ? (
                                <p className="text-center text-slate-400 py-8">
                                    아직 코멘트가 없습니다. 첫 코멘트를 남겨보세요!
                                </p>
                            ) : (
                                proposal.comments.map(comment => (
                                    <div key={comment.id} className="flex gap-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
                                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                                            <User size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-900">{comment.author.name}</span>
                                                    <span className="text-xs text-slate-400">{comment.author.department}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-slate-400">{formatDate(comment.createdAt)}</span>
                                                    {(comment.author.id === currentUser.id || currentUser.role === 'Admin') && (
                                                        <button
                                                            onClick={() => handleDeleteComment(comment.id)}
                                                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                                            title="삭제"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-slate-700 mt-1 whitespace-pre-wrap">{comment.content}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    {/* Meta Info */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                        <div>
                            <label className="text-xs text-slate-400 font-bold uppercase">제안자</label>
                            <div className="flex items-center gap-3 mt-2">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                    <User size={20} />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900">{proposal.proposer.name} {proposal.proposer.role}</p>
                                    <p className="text-xs text-slate-500">{proposal.proposer.department}</p>
                                </div>
                            </div>
                        </div>

                        <hr className="border-gray-100" />

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-slate-400 font-bold uppercase">등록일</label>
                                <div className="flex items-center gap-2 mt-1 text-sm font-medium text-slate-700">
                                    <Calendar size={14} />
                                    {proposal.date}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 font-bold uppercase">카테고리</label>
                                <div className="flex items-center gap-2 mt-1 text-sm font-medium text-slate-700">
                                    <Tag size={14} />
                                    {proposal.category}
                                </div>
                            </div>
                        </div>

                        {proposal.targetDepartment && (
                            <div>
                                <label className="text-xs text-slate-400 font-bold uppercase">실행 부서</label>
                                <p className="mt-1 text-sm font-medium text-slate-700">{proposal.targetDepartment}</p>
                            </div>
                        )}
                    </div>

                    {/* Scores (If available) */}
                    {proposal.score1st && (
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-900 mb-4">1차 심사 결과</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">필요성 (40)</span>
                                    <span className="font-bold text-slate-900">{proposal.score1st.necessity}점</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">실현 가능성 (60)</span>
                                    <span className="font-bold text-slate-900">{proposal.score1st.feasibility}점</span>
                                </div>
                                <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                                    <span className="font-bold text-slate-900">총점</span>
                                    <span className={`text-lg font-black ${proposal.score1st.passed ? 'text-primary' : 'text-red-500'}`}>
                                        {proposal.score1st.total}점
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProposalDetail;

