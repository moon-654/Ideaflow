import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { CompletionReport } from '../types';

interface CompletionReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onEvaluate: (percentage: number, comment: string) => void;
    report: CompletionReport;
    proposalTitle: string;
}

const CompletionReviewModal: React.FC<CompletionReviewModalProps> = ({ isOpen, onClose, onEvaluate, report, proposalTitle }) => {
    const [percentage, setPercentage] = useState<number>(100);
    const [comment, setComment] = useState('');
    const [previewPoints, setPreviewPoints] = useState(0);

    useEffect(() => {
        // Calculate points preview whenever percentage changes
        const finalAmount = Math.floor(report.actualSavingAmount * (percentage / 100));
        const totalAmount = finalAmount * 3; // 3 Years
        const points = Math.floor((totalAmount * 0.01) / 1000);
        setPreviewPoints(points);
    }, [percentage, report.actualSavingAmount]);

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!comment.trim()) {
            toast.error('심사 코멘트를 입력해주세요.');
            return;
        }

        if (confirm(`${previewPoints} 포인트를 지급하시겠습니까?`)) {
            onEvaluate(percentage, comment);
            onClose();
            toast.success('심사가 완료되었습니다.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
                <div className="bg-slate-50 px-8 py-5 flex items-center justify-between border-b border-gray-100 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">성과 심사 (2차 심의)</h2>
                        <p className="text-sm text-slate-500 truncate max-w-md">{proposalTitle}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="overflow-y-auto p-8 space-y-8">
                    {/* Proposer's Report Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">제안자 제출 보고서</h3>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-sm text-slate-500 block mb-1">제세공과금 제외 전 절감액 (제출)</span>
                                    <p className="text-2xl font-black text-slate-900">
                                        {report.actualSavingAmount.toLocaleString()} <span className="text-base font-normal text-slate-500">원</span>
                                    </p>
                                </div>
                                <div>
                                    <span className="text-sm text-slate-500 block mb-1">증빙 자료</span>
                                    {report.evidenceAttachments.length > 0 ? (
                                        <span className="text-blue-600 underline cursor-pointer">첨부파일 확인 ({report.evidenceAttachments.length})</span>
                                    ) : (
                                        <span className="text-slate-400">첨부된 파일 없음</span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <span className="text-sm text-slate-500 block mb-1">증빙 내용</span>
                                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{report.evidenceDescription}</p>
                            </div>
                        </div>
                    </div>

                    {/* Evaluation Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Calculator size={16} /> 심사 및 보상 산정
                        </h3>

                        <div className="p-6 border-2 border-indigo-100 rounded-2xl bg-indigo-50/30 space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-3">인정 비율 결정</label>
                                <div className="flex gap-2">
                                    {[100, 80, 50, 0].map((pct) => (
                                        <button
                                            key={pct}
                                            onClick={() => setPercentage(pct)}
                                            className={`flex-1 py-3 rounded-xl font-bold transition-all border-2 ${percentage === pct
                                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                                    : 'bg-white border-gray-100 text-slate-600 hover:border-indigo-200'
                                                }`}
                                        >
                                            {pct === 0 ? '불인정 (0%)' : `${pct}% 인정`}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-indigo-100 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">인정 연간 절감액</span>
                                    <span className="font-bold text-slate-900">{Math.floor(report.actualSavingAmount * (percentage / 100)).toLocaleString()} 원</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">3년 합산 금액 (x3)</span>
                                    <span className="font-bold text-slate-900">{(Math.floor(report.actualSavingAmount * (percentage / 100)) * 3).toLocaleString()} 원</span>
                                </div>
                                <div className="h-px bg-gray-100 my-2"></div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600 font-bold">지급될 마일리지 (1%)</span>
                                    <span className="text-2xl font-black text-indigo-600">{previewPoints.toLocaleString()} <span className="text-sm font-normal text-slate-500">P</span></span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">심사 코멘트</label>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all min-h-[100px] resize-none bg-white"
                                    placeholder="인정 비율 결정 사유 또는 검토 의견을 작성해주세요."
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-white border-t border-gray-100 flex justify-end gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center gap-2"
                    >
                        <CheckCircle size={20} />
                        심사 완료 및 보상 지급
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CompletionReviewModal;
