import React, { useState } from 'react';
import { useProposalStore } from '../context/ProposalContext';
import { Users, Building, Activity, AlertCircle, Plus, Trash2, Shield, Search } from 'lucide-react';
import { toast } from 'sonner';

const Admin: React.FC = () => {
    const { users, departments, systemLogs, addUser, removeUser, updateUserRole, addDepartment, removeDepartment } = useProposalStore();
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'depts' | 'logs'>('overview');

    // User Management State
    const [newUser, setNewUser] = useState({ name: '', dept: '', role: 'User' });
    const [newDept, setNewDept] = useState({ name: '', managerId: '' });

    const handleAddUser = () => {
        if (!newUser.name || !newUser.dept) {
            toast.error('이름과 부서를 입력해주세요.');
            return;
        }
        addUser({
            id: `user-${Date.now()}`,
            name: newUser.name,
            department: newUser.dept,
            role: newUser.role,
            avatarUrl: ''
        });
        setNewUser({ name: '', dept: '', role: 'User' });
        toast.success('사용자가 추가되었습니다.');
    };

    const handleAddDept = () => {
        if (!newDept.name) {
            toast.error('부서명을 입력해주세요.');
            return;
        }
        addDepartment({
            id: `dept-${Date.now()}`,
            name: newDept.name,
            managerId: newDept.managerId
        });
        setNewDept({ name: '', managerId: '' });
        toast.success('부서가 추가되었습니다.');
    };

    const handleRoleChange = (userId: string, newRole: string, userName: string) => {
        updateUserRole(userId, newRole);
        const roleNames: Record<string, string> = {
            User: '일반 사용자',
            Reviewer: '심사위원',
            Admin: '관리자'
        };
        toast.success(`${userName}님의 권한이 ${roleNames[newRole] || newRole}(으)로 변경되었습니다.`);
    };

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-gray-200 pb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">관리자 대시보드</h1>
                    <p className="text-slate-500 mt-1">사용자, 부서 및 시스템 로그를 통합 관리합니다.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
                {[
                    { id: 'overview', label: '시스템 개요', icon: <Activity size={18} /> },
                    { id: 'users', label: '사용자 관리', icon: <Users size={18} /> },
                    { id: 'depts', label: '부서 관리', icon: <Building size={18} /> },
                    { id: 'logs', label: '시스템 로그', icon: <AlertCircle size={18} /> },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors
              ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}
            `}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="min-h-[400px]">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="text-slate-500 font-bold text-sm mb-2">총 사용자</h3>
                            <p className="text-3xl font-black text-slate-900">{users.length}명</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="text-slate-500 font-bold text-sm mb-2">총 부서</h3>
                            <p className="text-3xl font-black text-slate-900">{departments.length}개</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="text-slate-500 font-bold text-sm mb-2">오늘의 로그</h3>
                            <p className="text-3xl font-black text-slate-900">{systemLogs.filter(l => l.timestamp.startsWith(new Date().toISOString().split('T')[0])).length}건</p>
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-4 bg-slate-50 border-b border-gray-100 flex gap-2">
                            <input
                                placeholder="이름"
                                className="px-3 py-2 border rounded text-sm"
                                value={newUser.name}
                                onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                            />
                            <input
                                placeholder="부서"
                                className="px-3 py-2 border rounded text-sm"
                                value={newUser.dept}
                                onChange={e => setNewUser({ ...newUser, dept: e.target.value })}
                            />
                            <select
                                className="px-3 py-2 border rounded text-sm"
                                value={newUser.role}
                                onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                            >
                                <option value="User">일반 사용자</option>
                                <option value="Reviewer">심사위원</option>
                                <option value="Admin">관리자</option>
                            </select>
                            <button
                                onClick={handleAddUser}
                                className="px-4 py-2 bg-primary text-white rounded text-sm font-bold hover:bg-primary-hover"
                            >
                                추가
                            </button>
                        </div>
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-gray-200">
                                <tr>
                                    <th className="p-4">이름</th>
                                    <th className="p-4">부서</th>
                                    <th className="p-4">권한</th>
                                    <th className="p-4 text-center">관리</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {users.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50">
                                        <td className="p-4 font-bold">{user.name}</td>
                                        <td className="p-4 text-slate-500">{user.department}</td>
                                        <td className="p-4">
                                            <select
                                                className={`px-2 py-1 rounded text-xs font-bold border cursor-pointer
                                                    ${user.role === 'Admin' ? 'bg-red-50 text-red-700 border-red-200' :
                                                        user.role === 'Reviewer' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                            'bg-blue-50 text-blue-700 border-blue-200'}
                                                `}
                                                value={user.role}
                                                onChange={(e) => handleRoleChange(user.id, e.target.value, user.name)}
                                            >
                                                <option value="User">일반 사용자</option>
                                                <option value="Reviewer">심사위원</option>
                                                <option value="Admin">관리자</option>
                                            </select>
                                        </td>
                                        <td className="p-4 text-center">
                                            <button onClick={() => removeUser(user.id)} className="text-slate-400 hover:text-red-500">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'depts' && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-4 bg-slate-50 border-b border-gray-100 flex gap-2">
                            <input
                                placeholder="부서명"
                                className="px-3 py-2 border rounded text-sm"
                                value={newDept.name}
                                onChange={e => setNewDept({ ...newDept, name: e.target.value })}
                            />
                            <button
                                onClick={handleAddDept}
                                className="px-4 py-2 bg-primary text-white rounded text-sm font-bold hover:bg-primary-hover"
                            >
                                추가
                            </button>
                        </div>
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-gray-200">
                                <tr>
                                    <th className="p-4">부서명</th>
                                    <th className="p-4">관리자 ID</th>
                                    <th className="p-4 text-center">관리</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {departments.map(dept => (
                                    <tr key={dept.id} className="hover:bg-slate-50">
                                        <td className="p-4 font-bold">{dept.name}</td>
                                        <td className="p-4 text-slate-500">{dept.managerId || '-'}</td>
                                        <td className="p-4 text-center">
                                            <button onClick={() => removeDepartment(dept.id)} className="text-slate-400 hover:text-red-500">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'logs' && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-gray-200">
                                <tr>
                                    <th className="p-4">시간</th>
                                    <th className="p-4">레벨</th>
                                    <th className="p-4">사용자</th>
                                    <th className="p-4">활동</th>
                                    <th className="p-4">상세</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {systemLogs.length === 0 ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-slate-400">로그가 없습니다.</td></tr>
                                ) : (
                                    systemLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-slate-50">
                                            <td className="p-4 text-slate-500 font-mono text-xs">{log.timestamp}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold
                          ${log.level === 'Error' ? 'bg-red-100 text-red-700' :
                                                        log.level === 'Warning' ? 'bg-orange-100 text-orange-700' :
                                                            'bg-blue-100 text-blue-700'}
                        `}>
                                                    {log.level}
                                                </span>
                                            </td>
                                            <td className="p-4 font-bold">{log.user}</td>
                                            <td className="p-4">{log.action}</td>
                                            <td className="p-4 text-slate-500 truncate max-w-xs">{log.details}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Admin;
