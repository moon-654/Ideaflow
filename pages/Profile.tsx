import React, { useState, useEffect } from 'react';
import { useProposalStore } from '../context/ProposalContext';
import { User, Mail, Building, Award, FileText, CheckCircle, TrendingUp, Calendar, ArrowRight, Bell, Sparkles, Key } from 'lucide-react';
import { Link } from 'react-router-dom';
import { stripHtml } from '../utils/html';
import { aiService } from '../services/aiService';
import { toast } from 'sonner';

const Profile: React.FC = () => {
    const { currentUser, proposals, mileageLogs, updateUser } = useProposalStore();

    // AI Key State
    const [apiKey, setApiKey] = useState('');
    const [hasKey, setHasKey] = useState(false);
    const [showKeyInput, setShowKeyInput] = useState(false);

    useEffect(() => {
        setHasKey(aiService.hasKey());
    }, []);

    const handleSaveKey = () => {
        if (!apiKey.trim()) {
            toast.error('API Key를 입력해주세요.');
            return;
        }
        aiService.saveKey(apiKey.trim());
        setHasKey(true);
        setApiKey('');
        setShowKeyInput(false);
        toast.success('Gemini API Key가 저장되었습니다.');
    };

    const handleDeleteKey = () => {
        if (window.confirm('정말 API Key를 삭제하시겠습니까? 관련 기능을 사용할 수 없게 됩니다.')) {
            aiService.removeKey();
            setHasKey(false);
            toast.success('API Key가 삭제되었습니다.');
        }
    };

    // Calculate Stats
    const myProposals = proposals.filter(p => p.proposer.id === currentUser.id);
    const totalProposals = myProposals.length;
    const acceptedProposals = myProposals.filter(p => p.status === 'Completed').length;
    const adoptionRate = totalProposals > 0 ? Math.round((acceptedProposals / totalProposals) * 100) : 0;

    const totalMileage = mileageLogs
        .filter(l => l.userId === currentUser.id)
        .reduce((sum, log) => sum + log.points, 0);

    const recentActivity = myProposals.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const STATUS_LABELS: Record<string, string> = {
        'New': '신규 등록',
        'Dept_Review': '부서 검토',
        '1st_Review': '1차 심의',
        '2nd_Review': '2차 심의',
        'Completed': '최종 완료',
        'Rejected': '반려됨'
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <h1 className="text-2xl font-bold text-slate-900">마이 페이지</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: User Profile & Stats */}
                <div className="space-y-6">
                    {/* User Profile Card */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center">
                        <div className="w-24 h-24 mx-auto bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                            <User size={48} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">{currentUser.name} {currentUser.role !== 'User' && `(${currentUser.role})`}</h2>
                        <p className="text-slate-500 text-sm mt-1">{currentUser.department}</p>

                        <div className="mt-6 space-y-3 text-left">
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                <Mail size={16} className="text-slate-400" />
                                <span>{currentUser.email || '이메일 미등록'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                <Building size={16} className="text-slate-400" />
                                <span>{currentUser.department}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                <Calendar size={16} className="text-slate-400" />
                                <span>입사일: 2023.01.01</span>
                            </div>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="font-bold text-slate-900 mb-4">활동 요약</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                        <FileText size={20} />
                                    </div>
                                    <span className="text-sm font-medium text-slate-700">총 제안</span>
                                </div>
                                <span className="text-lg font-bold text-slate-900">{totalProposals}건</span>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                                        <TrendingUp size={20} />
                                    </div>
                                    <span className="text-sm font-medium text-slate-700">채택률</span>
                                </div>
                                <span className="text-lg font-bold text-slate-900">{adoptionRate}%</span>
                            </div>

                            <Link to="/rewards" className="flex items-center justify-between p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg group-hover:bg-purple-200 transition-colors">
                                        <Award size={20} />
                                    </div>
                                    <span className="text-sm font-medium text-slate-700">마일리지</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-bold text-slate-900">{totalMileage.toLocaleString()}</span>
                                    <ArrowRight size={14} className="text-purple-400" />
                                </div>
                            </Link>
                        </div>
                    </div>


                    {/* Notification Settings */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Bell size={18} className="text-amber-500" />
                            알림 설정
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-medium text-slate-900">실시간 이메일 알림</div>
                                    <div className="text-xs text-slate-500">중요 이벤트 발생 시 즉시 메일 수신</div>
                                </div>
                                <button
                                    onClick={() => updateUser(currentUser.id, {
                                        emailPreferences: {
                                            daily: currentUser.emailPreferences?.daily ?? true,
                                            instant: !(currentUser.emailPreferences?.instant ?? true)
                                        }
                                    })}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${(currentUser.emailPreferences?.instant ?? true) ? 'bg-slate-900' : 'bg-slate-200'
                                        }`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${(currentUser.emailPreferences?.instant ?? true) ? 'translate-x-6' : 'translate-x-1'
                                        }`} />
                                </button>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-medium text-slate-900">일일 요약 알림</div>
                                    <div className="text-xs text-slate-500">매일 아침 대기 중인 업무 요약 수신</div>
                                </div>
                                <button
                                    onClick={() => updateUser(currentUser.id, {
                                        emailPreferences: {
                                            instant: currentUser.emailPreferences?.instant ?? true,
                                            daily: !(currentUser.emailPreferences?.daily ?? true)
                                        }
                                    })}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${(currentUser.emailPreferences?.daily ?? true) ? 'bg-slate-900' : 'bg-slate-200'
                                        }`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${(currentUser.emailPreferences?.daily ?? true) ? 'translate-x-6' : 'translate-x-1'
                                        }`} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* AI Configuration */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden mt-6">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                        <Sparkles size={100} className="text-purple-600" />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2 relative z-10">
                        <Sparkles size={18} className="text-purple-600" />
                        AI Co-pilot 설정
                    </h3>

                    <div className="relative z-10">
                        {hasKey ? (
                            <div className="bg-green-50 p-4 rounded-lg border border-green-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                        <CheckCircle size={16} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-green-800">Gemini 연동 완료</p>
                                        <p className="text-xs text-green-600">AI 기능을 사용할 준비가 되었습니다.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleDeleteKey}
                                    className="text-xs text-slate-400 hover:text-red-500 underline"
                                >
                                    연동 해제
                                </button>
                            </div>
                        ) : (
                            <div>
                                <p className="text-sm text-slate-600 mb-4">
                                    Google Gemini API Key를 등록하면 제안서 작성 및 심사 보조 기능을 사용할 수 있습니다.
                                </p>

                                {!showKeyInput ? (
                                    <button
                                        onClick={() => setShowKeyInput(true)}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors"
                                    >
                                        <Key size={16} />
                                        API Key 등록하기
                                    </button>
                                ) : (
                                    <div className="space-y-3 animate-fade-in-up">
                                        <input
                                            type="password"
                                            placeholder="Gemini API Key 입력"
                                            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm"
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleSaveKey}
                                                className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700"
                                            >
                                                저장
                                            </button>
                                            <button
                                                onClick={() => setShowKeyInput(false)}
                                                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200"
                                            >
                                                취소
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-400 text-center">
                                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-600">
                                                API Key 발급받기
                                            </a>
                                            {' '} (Key는 브라우저에만 저장됩니다)
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Activity History */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-slate-900">나의 제안 이력</h3>
                            <Link to="/proposals" className="text-sm text-primary font-medium hover:underline">새 제안 등록</Link>
                        </div>

                        <div className="divide-y divide-gray-100">
                            {recentActivity.length === 0 ? (
                                <div className="p-12 text-center text-slate-400">
                                    등록된 제안이 없습니다.
                                </div>
                            ) : (
                                recentActivity.map(proposal => (
                                    <Link
                                        key={proposal.id}
                                        to={`/proposals/${encodeURIComponent(proposal.id)}`}
                                        className="block p-6 hover:bg-slate-50 transition-colors group"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider
                        ${proposal.status === 'New' ? 'bg-blue-100 text-blue-700' :
                                                    proposal.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                                        proposal.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                                            'bg-slate-100 text-slate-700'}
                      `}>
                                                {STATUS_LABELS[proposal.status] || proposal.status}
                                            </span>
                                            <span className="text-xs text-slate-400">{proposal.date}</span>
                                        </div>
                                        <h4 className="text-base font-bold text-slate-900 mb-1 group-hover:text-primary transition-colors">
                                            {proposal.title}
                                        </h4>
                                        <p className="text-sm text-slate-500 line-clamp-1">
                                            {stripHtml(proposal.summary)}
                                        </p>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default Profile;
