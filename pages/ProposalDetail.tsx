import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProposalStore } from '../context/ProposalContext';
import { ArrowLeft, Calendar, User, Tag, CheckCircle, Clock, AlertCircle, FileText, MessageCircle, Send, Trash2, DollarSign, AtSign } from 'lucide-react';
import { toast } from 'sonner';
import DOMPurify from 'dompurify';
import { extractMentions, filterUsersForMention, getCurrentMentionQuery, renderWithMentions } from '../utils/mentionUtils';

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
    const { proposals, currentUser, addComment, deleteComment, settings, addUnifiedComment, replyToComment, users, addNotification } = useProposalStore();
    const [newComment, setNewComment] = useState('');
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [showMentionDropdown, setShowMentionDropdown] = useState(false);
    const commentInputRef = useRef<HTMLInputElement>(null);

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
    const isCoAuthor = proposal.coAuthors?.some((a: any) => a.id === currentUser.id);
    const isMyProposal = proposal.proposer.id === currentUser.id || isCoAuthor;

    // Handle comment input change with mention detection
    const handleCommentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setNewComment(value);

        const cursorPos = e.target.selectionStart || 0;
        const query = getCurrentMentionQuery(value, cursorPos);
        setMentionQuery(query);
        setShowMentionDropdown(query !== null && query.length > 0);
    };

    // Insert mention into comment
    const insertMention = (userName: string) => {
        if (!mentionQuery) return;

        const cursorPos = commentInputRef.current?.selectionStart || newComment.length;
        const beforeMention = newComment.substring(0, cursorPos - mentionQuery.length - 1);
        const afterMention = newComment.substring(cursorPos);
        const newValue = `${beforeMention}@${userName} ${afterMention}`;

        setNewComment(newValue);
        setShowMentionDropdown(false);
        setMentionQuery(null);
        commentInputRef.current?.focus();
    };

    const handleAddComment = () => {
        if (!newComment.trim()) {
            toast.error('코멘트 내용을 입력해주세요.');
            return;
        }

        // Extract mentions and send notifications
        const mentions = extractMentions(newComment);
        mentions.forEach(mentionName => {
            const mentionedUser = users.find(u =>
                u.name.toLowerCase() === mentionName.toLowerCase() ||
                u.name.split(' ')[0].toLowerCase() === mentionName.toLowerCase()
            );
            if (mentionedUser && mentionedUser.id !== currentUser.id) {
                addNotification({
                    type: 'mention',
                    title: '당신이 멘션되었습니다',
                    message: `${currentUser.name}님이 제안 "${proposal.title}"에서 당신을 멘션했습니다.`,
                    recipientId: mentionedUser.id,
                    link: `/proposals/${proposal.id}`,
                });
            }
        });

        addComment(proposal.id, newComment.trim());
        setNewComment('');
        setShowMentionDropdown(false);
        toast.success('코멘트가 등록되었습니다.');
    };

    // Filtered users for mention dropdown
    const mentionSuggestions = mentionQuery ? filterUsersForMention(users, mentionQuery) : [];

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
                            <p className="text-sm mt-1">
                                {proposal.rejectReason || proposal.deptReviewComment || '심사 과정에서 반려되었습니다. (사유 미기재)'}
                            </p>
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

                    {/* Unified Comments Section */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <MessageCircle size={20} className="text-slate-400" />
                            커뮤니케이션
                            {((proposal.unifiedComments?.length || 0) + (proposal.comments?.length || 0)) > 0 && (
                                <span className="text-sm font-normal text-slate-400">
                                    ({(proposal.unifiedComments?.length || 0) + (proposal.comments?.length || 0)})
                                </span>
                            )}
                        </h3>

                        {/* Comment Input */}
                        <div className="flex gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <User size={18} />
                            </div>
                            <div className="flex-1 relative">
                                <textarea
                                    ref={commentInputRef}
                                    value={newComment}
                                    onChange={handleCommentInputChange}
                                    placeholder="의견이나 질문을 남겨주세요... (@이름으로 멘션 가능)"
                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                                    rows={3}
                                />
                                {/* Mention Autocomplete Dropdown */}
                                {showMentionDropdown && mentionSuggestions.length > 0 && (
                                    <div className="absolute left-0 bottom-full mb-1 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
                                        <div className="p-2 border-b border-gray-100 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                            <AtSign size={10} /> 멘션 대상 선택
                                        </div>
                                        {mentionSuggestions.map(user => (
                                            <button
                                                key={user.id}
                                                onClick={() => insertMention(user.name)}
                                                className="w-full text-left px-4 py-2 text-sm hover:bg-primary/5 flex items-center justify-between group transition-colors"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                        <User size={12} />
                                                    </div>
                                                    <span className="font-medium text-slate-700 group-hover:text-primary">{user.name}</span>
                                                </div>
                                                <span className="text-[10px] text-slate-400">{user.id}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div className="flex justify-end mt-2">
                                    <button
                                        onClick={() => {
                                            if (!newComment.trim()) return;
                                            addUnifiedComment(proposal.id, {
                                                proposalId: proposal.id,
                                                authorId: currentUser.id,
                                                authorName: currentUser.name,
                                                authorRole: currentUser.role,
                                                type: 'general',
                                                content: newComment.trim(),
                                                visibility: 'public',
                                            });
                                            setNewComment('');
                                            toast.success('코멘트가 등록되었습니다.');
                                        }}
                                        disabled={!newComment.trim()}
                                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        <Send size={16} />
                                        등록
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Unified Comments List */}
                        <div className="space-y-3">
                            {/* Show Review Feedback (reviews1st, reviews2nd) */}
                            {proposal.reviews1st?.filter(r => r.comment).map((review, idx) => (
                                <div key={`review1st-${idx}`} className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                            <CheckCircle size={18} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs px-2 py-0.5 bg-blue-200 text-blue-800 rounded font-bold">1차 심사</span>
                                                <span className="font-bold text-slate-900">
                                                    {settings.blindMode?.proposer && isMyProposal ? `심사자 ${idx + 1}` : review.reviewerName}
                                                </span>
                                                <span className="text-xs text-slate-400">{new Date(review.evaluatedAt).toLocaleDateString('ko-KR')}</span>
                                            </div>
                                            <p className="text-slate-700 whitespace-pre-wrap">"{renderWithMentions(review.comment)}"</p>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {proposal.reviews2nd?.filter(r => r.comment).map((review, idx) => (
                                <div key={`review2nd-${idx}`} className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                                            <CheckCircle size={18} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs px-2 py-0.5 bg-purple-200 text-purple-800 rounded font-bold">2차 심사</span>
                                                <span className="font-bold text-slate-900">
                                                    {settings.blindMode?.proposer && isMyProposal ? `심사자 ${idx + 1}` : review.reviewerName}
                                                </span>
                                                <span className="text-xs text-slate-400">{new Date(review.evaluatedAt).toLocaleDateString('ko-KR')}</span>
                                            </div>
                                            <p className="text-slate-700 whitespace-pre-wrap">"{renderWithMentions(review.comment)}"</p>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Show Unified Comments with replies */}
                            {proposal.unifiedComments?.filter(c => !c.parentId).map(comment => {
                                const replies = proposal.unifiedComments?.filter(c => c.parentId === comment.id) || [];
                                const typeStyles: Record<string, { bg: string, badge: string, badgeText: string }> = {
                                    'general': { bg: 'bg-slate-50 border-slate-100', badge: 'bg-slate-200 text-slate-700', badgeText: '일반' },
                                    'supplement_request': { bg: 'bg-orange-50 border-orange-100', badge: 'bg-orange-200 text-orange-800', badgeText: '보완 요청' },
                                    'review_1st': { bg: 'bg-blue-50 border-blue-100', badge: 'bg-blue-200 text-blue-800', badgeText: '1차 심사' },
                                    'review_2nd': { bg: 'bg-purple-50 border-purple-100', badge: 'bg-purple-200 text-purple-800', badgeText: '2차 심사' },
                                    'dept_review': { bg: 'bg-green-50 border-green-100', badge: 'bg-green-200 text-green-800', badgeText: '부서 검토' },
                                };
                                const style = typeStyles[comment.type] || typeStyles['general'];

                                return (
                                    <div key={comment.id} className={`p-4 rounded-lg border ${style.bg}`}>
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                                                <User size={18} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    {comment.type !== 'general' && (
                                                        <span className={`text-xs px-2 py-0.5 rounded font-bold ${style.badge}`}>{style.badgeText}</span>
                                                    )}
                                                    <span className="font-bold text-slate-900">{comment.authorName}</span>
                                                    <span className="text-xs text-slate-400">{new Date(comment.createdAt).toLocaleDateString('ko-KR')}</span>
                                                </div>
                                                <p className="text-slate-700 whitespace-pre-wrap">{renderWithMentions(comment.content)}</p>

                                                {/* Reply button */}
                                                <button
                                                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                                    className="text-xs text-primary hover:underline mt-2"
                                                >
                                                    💬 답글 달기
                                                </button>

                                                {/* Reply input */}
                                                {replyingTo === comment.id && (
                                                    <div className="mt-3 flex gap-2">
                                                        <input
                                                            value={replyContent}
                                                            onChange={(e) => setReplyContent(e.target.value)}
                                                            placeholder="답글 입력..."
                                                            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-primary focus:border-primary"
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                if (replyContent.trim()) {
                                                                    replyToComment(proposal.id, comment.id, replyContent.trim());
                                                                    setReplyContent('');
                                                                    setReplyingTo(null);
                                                                    toast.success('답글이 등록되었습니다.');
                                                                }
                                                            }}
                                                            className="px-3 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-hover"
                                                        >
                                                            등록
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Replies */}
                                                {replies.length > 0 && (
                                                    <div className="mt-3 pl-4 border-l-2 border-gray-200 space-y-2">
                                                        {replies.map(reply => (
                                                            <div key={reply.id} className="text-sm">
                                                                <span className="font-bold text-slate-700">{reply.authorName}</span>
                                                                <span className="text-slate-400 ml-2 text-xs">{new Date(reply.createdAt).toLocaleDateString('ko-KR')}</span>
                                                                <p className="text-slate-600 mt-0.5">{renderWithMentions(reply.content)}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Legacy comments */}
                            {proposal.comments?.map(comment => (
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
                                        <p className="text-slate-700 mt-1 whitespace-pre-wrap">{renderWithMentions(comment.content)}</p>
                                    </div>
                                </div>
                            ))}

                            {/* Empty state */}
                            {(!proposal.unifiedComments?.length && !proposal.comments?.length && !proposal.reviews1st?.filter(r => r.comment).length && !proposal.reviews2nd?.filter(r => r.comment).length) && (
                                <p className="text-center text-slate-400 py-8">
                                    아직 코멘트가 없습니다. 첫 코멘트를 남겨보세요!
                                </p>
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

                    {/* Revision History */}
                    {proposal.revisions && proposal.revisions.length > 0 && (
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <FileText size={16} className="text-slate-400" />
                                수정 이력
                                <span className="text-xs font-normal text-slate-400">(v{proposal.currentVersion || proposal.revisions.length + 1})</span>
                            </h3>
                            <div className="space-y-3">
                                {proposal.revisions.slice().reverse().map((rev, idx) => (
                                    <details key={rev.id} className="group">
                                        <summary className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-bold">v{rev.version}</span>
                                                <span className="text-sm text-slate-700">{rev.changeNote || '내용 수정'}</span>
                                            </div>
                                            <span className="text-xs text-slate-400">{new Date(rev.createdAt).toLocaleDateString('ko-KR')}</span>
                                        </summary>
                                        <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm space-y-2">
                                            <div className="flex items-center gap-2 text-slate-500 text-xs mb-2">
                                                <User size={12} />
                                                {rev.createdByName}
                                            </div>
                                            {/* Diff comparison */}
                                            <div className="space-y-2">
                                                {rev.snapshot.title !== proposal.title && (
                                                    <div>
                                                        <span className="text-xs text-slate-400">제목 변경:</span>
                                                        <div className="flex gap-2 text-xs mt-1">
                                                            <span className="px-2 py-1 bg-red-50 text-red-700 rounded line-through">{rev.snapshot.title}</span>
                                                            <span className="text-slate-400">→</span>
                                                            <span className="px-2 py-1 bg-green-50 text-green-700 rounded">{proposal.title}</span>
                                                        </div>
                                                    </div>
                                                )}
                                                {rev.snapshot.summary !== proposal.summary && rev.snapshot.summary && (
                                                    <div>
                                                        <span className="text-xs text-slate-400">요약 변경됨</span>
                                                    </div>
                                                )}
                                                {rev.snapshot.currentProblem !== proposal.currentProblem && rev.snapshot.currentProblem && (
                                                    <div>
                                                        <span className="text-xs text-slate-400">현황 및 문제점 변경됨</span>
                                                    </div>
                                                )}
                                                {rev.snapshot.improvementPlan !== proposal.improvementPlan && rev.snapshot.improvementPlan && (
                                                    <div>
                                                        <span className="text-xs text-slate-400">개선안 변경됨</span>
                                                    </div>
                                                )}
                                                {rev.snapshot.expectedEffect !== proposal.expectedEffect && rev.snapshot.expectedEffect && (
                                                    <div>
                                                        <span className="text-xs text-slate-400">기대효과 변경됨</span>
                                                    </div>
                                                )}
                                                {rev.snapshot.expectedAmount !== proposal.expectedAmount && (
                                                    <div>
                                                        <span className="text-xs text-slate-400">예상 금액:</span>
                                                        <div className="flex gap-2 text-xs mt-1">
                                                            <span className="px-2 py-1 bg-red-50 text-red-700 rounded">₩{rev.snapshot.expectedAmount?.toLocaleString() || 0}</span>
                                                            <span className="text-slate-400">→</span>
                                                            <span className="px-2 py-1 bg-green-50 text-green-700 rounded">₩{proposal.expectedAmount?.toLocaleString() || 0}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </details>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Supplement Request Status */}
                    {proposal.supplementRequests && proposal.supplementRequests.some(r => r.status === 'pending') && (
                        <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                            <h3 className="text-sm font-bold text-orange-800 mb-2 flex items-center gap-2">
                                ⏳ 보완 요청 대기 중
                            </h3>
                            {proposal.supplementRequests.filter(r => r.status === 'pending').map(req => (
                                <div key={req.id} className="text-sm text-orange-700 mb-2">
                                    <p className="font-medium">{req.reason}</p>
                                    <p className="text-xs text-orange-500 mt-1">
                                        요청자: {req.requestedByName} | 기한: {new Date(req.deadline).toLocaleDateString('ko-KR')}
                                    </p>
                                </div>
                            ))}
                            {isMyProposal && proposal.canEditDuringReview && (
                                <button
                                    onClick={() => navigate(`/proposals/${proposal.id}/edit`)}
                                    className="mt-2 w-full py-2 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition-colors text-sm"
                                >
                                    📝 보완 수정하기
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProposalDetail;

