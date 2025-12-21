import React, { useState } from 'react';
import { X, Save, Upload, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface CompletionReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { actualSavingAmount: number; evidenceDescription: string; evidenceAttachments: string[] }) => void;
    proposalTitle: string;
}

const CompletionReportModal: React.FC<CompletionReportModalProps> = ({ isOpen, onClose, onSubmit, proposalTitle }) => {
    const [amount, setAmount] = useState<string>('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const numAmount = parseInt(amount.replace(/,/g, ''), 10);
        if (isNaN(numAmount) || numAmount <= 0) {
            toast.error('유효한 금액을 입력해주세요.');
            return;
        }

        if (!description.trim()) {
            toast.error('상세 내용 및 증빙 설명을 입력해주세요.');
            return;
        }

        setIsSubmitting(true);
        setTimeout(() => { // Simulate network
            onSubmit({
                actualSavingAmount: numAmount,
                evidenceDescription: description,
                evidenceAttachments: [] // Mock for now
            });
            setIsSubmitting(false);
            onClose();
            toast.success('완료 보고가 제출되었습니다.');
        }, 800);
    };

    const formatNumber = (num: string) => {
        return num.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAmount(formatNumber(e.target.value));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
                <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-b border-gray-100">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">제안 완료 보고서</h2>
                        <p className="text-xs text-slate-500 truncate max-w-xs">{proposalTitle}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-sm text-blue-700">
                        <AlertCircle className="shrink-0 mt-0.5" size={18} />
                        <div>
                            <p className="font-bold mb-1">성과 보상 안내</p>
                            <p>실제 절감 금액을 증빙하여 제출하면, 심의를 거쳐 <b>연간 절감액의 1% (3년치)</b>를 마일리지로 지급합니다.</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">연간 효과(절감) 금액</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={amount}
                                onChange={handleAmountChange}
                                className="w-full pl-4 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-bold text-lg"
                                placeholder="0"
                            />
                            <span className="absolute right-4 top-3.5 text-slate-400 font-bold">원</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 text-right">
                            예상 보상: {amount ? Math.floor(parseInt(amount.replace(/,/g, ''), 10) * 0.01 * 3 / 1000).toLocaleString() : 0} 포인트
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">증빙 내용 및 설명</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all min-h-[120px] resize-none"
                            placeholder="어떻게 비용을 절감했는지 구체적으로 설명해주세요. (산출 근거 등)"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">첨부 파일 (증빙 자료)</label>
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer group">
                            <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                <Upload size={24} />
                            </div>
                            <p className="text-sm font-medium text-slate-600">클릭하여 파일 업로드</p>
                            <p className="text-xs text-slate-400 mt-1">PDF, Excel, 이미지 파일 (최대 10MB)</p>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-[2] bg-blue-600 text-white py-3 px-4 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? '제출 중...' : <><Save size={18} /> 보고서 제출하기</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CompletionReportModal;
