import React from 'react';
import { X, Mail, CheckCircle, AlertCircle } from 'lucide-react';

export interface EmailMessage {
    to: string;
    subject: string;
    body: string;
}

interface EmailSimulationResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    messages: EmailMessage[];
    title?: string;
}

const EmailSimulationResultModal: React.FC<EmailSimulationResultModalProps> = ({ isOpen, onClose, messages, title = '메일 발송 시뮬레이션 결과' }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[70vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-2">
                        <Mail className="text-primary" size={20} />
                        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                            <CheckCircle size={48} className="text-slate-300" />
                            <p className="font-bold">발송 대상이 없습니다.</p>
                            <p className="text-xs">대기 중인 심의나 알림 설정된 사용자가 없습니다.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 px-1 mb-2">
                                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold ring-1 ring-green-600/20">
                                    총 {messages.length}건
                                </span>
                                <span className="text-xs text-slate-500">
                                    * 실제 발송되지 않고 시뮬레이션된 결과입니다.
                                </span>
                            </div>

                            {messages.map((msg, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold text-slate-400 w-12 shrink-0">To:</span>
                                                <code className="text-sm font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                                                    {msg.to}
                                                </code>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-400 w-12 shrink-0">Subject:</span>
                                                <span className="text-sm font-bold text-slate-900 truncate block">
                                                    {msg.subject}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 p-3 rounded border border-gray-100 text-xs text-slate-600 whitespace-pre-wrap font-mono relative">
                                        {msg.body}
                                        <div className="absolute top-2 right-2 text-[10px] text-green-600 font-bold border border-green-200 bg-green-50 px-1.5 py-0.5 rounded">
                                            Mock Sent
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-slate-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 shadow-lg shadow-slate-900/20 active:scale-95 transition-all"
                    >
                        확인 완료
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmailSimulationResultModal;
