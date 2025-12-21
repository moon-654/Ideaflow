import React, { useState, useEffect } from 'react';
import { X, Save, Mail, FileText, Info } from 'lucide-react';
import { EmailTemplate } from '../types';

interface EmailTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    templates: EmailTemplate[];
    onSave: (updatedTemplates: EmailTemplate[]) => void;
}

const EmailTemplateModal: React.FC<EmailTemplateModalProps> = ({ isOpen, onClose, templates, onSave }) => {
    const [localTemplates, setLocalTemplates] = useState<EmailTemplate[]>(templates);
    const [activeTemplateId, setActiveTemplateId] = useState<string>(templates[0]?.id || 'newProposal');

    useEffect(() => {
        if (isOpen) {
            setLocalTemplates(templates);
            setActiveTemplateId(templates[0]?.id || 'newProposal');
        }
    }, [isOpen, templates]);

    if (!isOpen) return null;

    const activeTemplate = localTemplates.find(t => t.id === activeTemplateId);

    const handleUpdate = (field: 'subject' | 'body', value: string) => {
        setLocalTemplates(prev => prev.map(t =>
            t.id === activeTemplateId ? { ...t, [field]: value } : t
        ));
    };

    const handleSave = () => {
        onSave(localTemplates);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-2">
                        <Mail className="text-primary" size={20} />
                        <h2 className="text-lg font-bold text-slate-800">메일 템플릿 편집</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-64 border-r border-gray-100 bg-slate-50/50 p-4 space-y-2 overflow-y-auto">
                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">템플릿 목록</label>
                        {localTemplates.map(t => (
                            <button
                                key={t.id}
                                onClick={() => setActiveTemplateId(t.id)}
                                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTemplateId === t.id
                                        ? 'bg-white shadow-md text-primary border border-gray-100'
                                        : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                            >
                                <FileText size={16} />
                                {t.name}
                            </button>
                        ))}
                    </div>

                    {/* Editor */}
                    <div className="flex-1 p-6 overflow-y-auto bg-white">
                        {activeTemplate ? (
                            <div className="space-y-6 max-w-2xl mx-auto">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">메일 제목</label>
                                    <input
                                        type="text"
                                        value={activeTemplate.subject}
                                        onChange={(e) => handleUpdate('subject', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                                    />
                                </div>

                                <div className="flex-1 flex flex-col">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">메일 본문</label>
                                    <textarea
                                        value={activeTemplate.body}
                                        onChange={(e) => handleUpdate('body', e.target.value)}
                                        className="w-full h-96 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono text-sm leading-relaxed resize-none"
                                    />
                                    <p className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                                        <Info size={12} />
                                        사용 가능한 변수: {'{title}'}, {'{proposer}'}, {'{dept}'}, {'{grade}'}, {'{points}'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400">
                                템플릿을 선택해주세요.
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-slate-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-5 py-2.5 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 shadow-lg shadow-slate-900/20 active:scale-95 transition-all flex items-center gap-2"
                    >
                        <Save size={18} />
                        변경사항 저장
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmailTemplateModal;
