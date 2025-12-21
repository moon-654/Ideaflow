import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProposalStore } from '../context/ProposalContext';
import { Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { loginWithOpenProject } from '../services/openProject';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const { setCurrentUser, users } = useProposalStore();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const processLogin = (user: any) => {
        // Check if user exists in synced users to get their assigned IdeaFlow role
        const syncedUser = users.find(u =>
            u.id === user.id ||
            u.email === user.email ||
            u.name === user.name
        );

        // Determine role:
        // 1. Use existing role from synced users if available
        // 2. If no users exist yet (first user), assign Admin
        // 3. Otherwise, use the default role from login (User)
        let assignedRole = user.role || 'User';

        if (syncedUser && syncedUser.role) {
            assignedRole = syncedUser.role;
        } else if (users.length === 0) {
            // First user becomes Admin
            assignedRole = 'Admin';
            console.log('[Login] First user - automatically assigned Admin role');
        }

        const finalUser = {
            ...user,
            role: assignedRole,
            department: syncedUser?.department || user.department
        };

        setCurrentUser(finalUser);
        toast.success(`환영합니다! ${finalUser.name}님. (${assignedRole})`);
        navigate('/');
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim() || !password) {
            toast.error('아이디와 비밀번호를 입력해주세요.');
            return;
        }

        setIsLoading(true);

        try {
            const result = await loginWithOpenProject(username, password);

            if (result.success && result.user) {
                processLogin(result.user);
            } else {
                toast.error(result.error || '로그인에 실패했습니다.');
            }
        } catch (error) {
            console.error('Login error:', error);
            toast.error('로그인 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter mb-2">ACE제안시스템</h1>
                    <p className="text-slate-500">사내 제안 관리 시스템</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">아이디</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 text-slate-400" size={20} />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-medium"
                                placeholder="OpenProject 아이디 (이메일)"
                                disabled={isLoading}
                                autoComplete="username"
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
                                placeholder="비밀번호"
                                disabled={isLoading}
                                autoComplete="current-password"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !username.trim() || !password}
                        className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <><Loader2 size={20} className="animate-spin" /> 로그인 중...</>
                        ) : (
                            <>로그인 <ArrowRight size={20} /></>
                        )}
                    </button>
                </form>

                <p className="text-center text-xs text-slate-400 mt-6">
                    OpenProject 계정으로 로그인하세요
                </p>
            </div>
        </div>
    );
};

export default Login;
