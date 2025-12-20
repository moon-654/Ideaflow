import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProposalStore } from '../context/ProposalContext';
import { ArrowLeft, Calendar, User, Tag, CheckCircle, Clock, AlertCircle, FileText } from 'lucide-react';

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
    const { proposals } = useProposalStore();

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
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Summary */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <FileText size={20} className="text-slate-400" />
                            제안 내용
                        </h3>
                        <div className="prose prose-slate max-w-none">
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">현황 및 문제점</label>
                                <p className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100">
                                    {proposal.currentProblem || "내용이 없습니다."}
                                </p>
                            </div>
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">개선 방안</label>
                                <p className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100">
                                    {proposal.improvementPlan || "내용이 없습니다."}
                                </p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">기대 효과</label>
                                <p className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100">
                                    {proposal.expectedEffect || "내용이 없습니다."}
                                </p>
                            </div>
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
