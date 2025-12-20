import React, { useState, useEffect } from 'react';
import { UploadCloud, ChevronDown } from 'lucide-react';
import { useProposalStore } from '../context/ProposalContext';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

const ProposalEdit: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { proposals, updateProposal, departments, currentUser } = useProposalStore();

    const [category, setCategory] = useState('');
    const [title, setTitle] = useState('');
    const [targetDepartment, setTargetDepartment] = useState('');
    const [currentProblem, setCurrentProblem] = useState('');
    const [improvementPlan, setImprovementPlan] = useState('');
    const [expectedEffect, setExpectedEffect] = useState('');

    useEffect(() => {
        const proposal = proposals.find(p => p.id === id);
        if (proposal) {
            // Verify ownership
            if (proposal.proposer.id !== currentUser.id) {
                toast.error('수정 권한이 없습니다.');
                navigate('/');
                return;
            }

            setCategory(proposal.category);
            setTitle(proposal.title);
            setTargetDepartment(proposal.targetDepartment);
            setCurrentProblem(proposal.currentProblem || proposal.summary || '');
            setImprovementPlan(proposal.improvementPlan || ''); // Need to check if these fields exist in Proposal type
            setExpectedEffect(proposal.expectedEffect || '');
        } else {
            toast.error('제안을 찾을 수 없습니다.');
            navigate('/');
        }
    }, [id, proposals, currentUser, navigate]);

    const handleSubmit = () => {
        if (!category || !title || !targetDepartment || !currentProblem || !improvementPlan || !expectedEffect) {
            toast.error('모든 필수 항목을 입력해주세요.');
            return;
        }

        if (!id) return;

        updateProposal(id, {
            title,
            summary: currentProblem,
            category: category as any,
            targetDepartment: targetDepartment,
            currentProblem,
            improvementPlan,
            expectedEffect,
            status: 'Dept_Review',
            deptReviewComment: ''
        });

        toast.success('제안이 수정되어 재상정되었습니다.');
        navigate(`/proposals/${encodeURIComponent(id)}`);
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in pb-12">
            <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8">
                <span className="font-semibold text-primary">제안 수정</span>
            </nav>

            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">제안 수정</h1>
                <p className="text-slate-500 mt-2 text-lg">반려 사유를 반영하여 내용을 보완해주세요.</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-900">카테고리</label>
                            <div className="relative">
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full h-11 pl-4 pr-10 rounded-lg border border-gray-300 bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none transition-all cursor-pointer"
                                >
                                    <option value="Process">프로세스 개선</option>
                                    <option value="Cost">원가 절감</option>
                                    <option value="Safety">안전/환경</option>
                                    <option value="Welfare">복리후생</option>
                                    <option value="IT">IT/시스템</option>
                                    <option value="Marketing">마케팅</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                            </div>
                        </div>

                        <div className="md:col-span-2 space-y-2">
                            <label className="block text-sm font-bold text-slate-900">제목</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full h-11 px-4 rounded-lg border border-gray-300 bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            />
                        </div>

                        <div className="md:col-span-3 space-y-2">
                            <label className="block text-sm font-bold text-slate-900">실행(검토) 부서</label>
                            <div className="relative">
                                <select
                                    value={targetDepartment}
                                    onChange={(e) => setTargetDepartment(e.target.value)}
                                    className="w-full h-11 pl-4 pr-10 rounded-lg border border-gray-300 bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none transition-all cursor-pointer"
                                >
                                    {departments.map((dept) => (
                                        <option key={dept.id} value={dept.name}>{dept.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                            </div>
                        </div>
                    </div>

                    <hr className="border-gray-100" />

                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-900">현황 및 문제점</label>
                        <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                            <textarea
                                value={currentProblem}
                                onChange={(e) => setCurrentProblem(e.target.value)}
                                className="w-full p-4 border-none focus:ring-0 resize-y min-h-[120px] placeholder:text-slate-300 bg-white text-slate-900"
                            ></textarea>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-900">개선 방안</label>
                        <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                            <textarea
                                value={improvementPlan}
                                onChange={(e) => setImprovementPlan(e.target.value)}
                                className="w-full p-4 border-none focus:ring-0 resize-y min-h-[200px] placeholder:text-slate-300 bg-white text-slate-900"
                            ></textarea>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-900">기대 효과</label>
                        <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                            <textarea
                                value={expectedEffect}
                                onChange={(e) => setExpectedEffect(e.target.value)}
                                className="w-full p-4 border-none focus:ring-0 resize-y min-h-[120px] placeholder:text-slate-300 bg-white text-slate-900"
                            ></textarea>
                        </div>
                    </div>

                </div>

                <div className="bg-slate-50 px-8 py-5 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="px-6 py-2.5 rounded-lg text-slate-600 font-medium hover:bg-slate-200 transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-8 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold shadow-lg shadow-primary/25 transition-all active:scale-95"
                    >
                        수정 완료 및 재상정
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProposalEdit;
