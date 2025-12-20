import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProposalStore } from '../context/ProposalContext';
import { Lock, User, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const { setCurrentUser } = useProposalStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();

        // Mock Authentication Logic
        if (email === 'user@example.com' && password === 'password') {
            setCurrentUser({
                id: 'u1',
                name: '김철수',
                dept: '생산관리팀',
                role: 'User',
                email: 'user@example.com'
            });
            toast.success('환영합니다! 김철수님.');
            navigate('/');
        } else if (email === 'reviewer@example.com' && password === 'password') {
            setCurrentUser({
                id: 'u2',
                name: '이영희',
                dept: '품질관리팀',
                role: 'Reviewer',
                email: 'reviewer@example.com'
            });
            toast.success('환영합니다! 이영희 심사위원님.');
            navigate('/');
        } else if (email === 'admin@example.com' && password === 'password') {
            setCurrentUser({
                id: 'u3',
                name: '박관리',
                dept: '인사팀',
                role: 'Admin',
                email: 'admin@example.com'
            });
            toast.success('관리자 모드로 로그인되었습니다.');
            navigate('/');
        } else {
            toast.error('이메일 또는 비밀번호가 올바르지 않습니다.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter mb-2">IdeaFlow</h1>
                    <p className="text-slate-500">사내 제안 관리 시스템</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">이메일</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 text-slate-400" size={20} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-medium"
                                placeholder="user@example.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">비밀번호</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-slate-400" size={20} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-medium"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 active:scale-95"
                    >
                        로그인 <ArrowRight size={20} />
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-100">
                    <p className="text-center text-xs text-slate-400 mb-4 font-bold uppercase">테스트 계정 정보</p>
                    <div className="grid grid-cols-3 gap-2 text-xs text-center">
                        <div className="p-2 bg-slate-50 rounded border border-gray-200 cursor-pointer hover:bg-slate-100" onClick={() => { setEmail('user@example.com'); setPassword('password'); }}>
                            <span className="block font-bold text-slate-700">일반</span>
                            <span className="text-slate-400">user</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded border border-gray-200 cursor-pointer hover:bg-slate-100" onClick={() => { setEmail('reviewer@example.com'); setPassword('password'); }}>
                            <span className="block font-bold text-slate-700">심사</span>
                            <span className="text-slate-400">reviewer</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded border border-gray-200 cursor-pointer hover:bg-slate-100" onClick={() => { setEmail('admin@example.com'); setPassword('password'); }}>
                            <span className="block font-bold text-slate-700">관리자</span>
                            <span className="text-slate-400">admin</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
