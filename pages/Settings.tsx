import React, { useState, useEffect } from 'react';
import { useProposalStore } from '../context/ProposalContext';
import { Save, Bell, Users, Coins, ToggleLeft, ToggleRight, Plus, Trash2, Mail, Shield, Search } from 'lucide-react';
import { toast } from 'sonner';

const Settings: React.FC = () => {
  const { settings, updateSettings, syncUsersFromOpenProject, users } = useProposalStore();

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Local state for edits (initialized from store)
  // No local state for simple settings, use store directly for inputs like API Key to avoid sync issues
  // But for the bulk save pattern used here, we might want to keep it consistent.
  // Ideally, refactor to direct store updates or full local state.
  // Given the previous step added direct updateSettings calls for OpenProject, we leave this as is.
  const [notifications, setNotifications] = useState(settings.notifications);
  const [mileageRules, setMileageRules] = useState(settings.mileageRules);
  const [members, setMembers] = useState(settings.members);

  // Sync local state when store changes
  useEffect(() => {
    setNotifications(settings.notifications);
    setMileageRules(settings.mileageRules);
    setMembers(settings.members);
  }, [settings]);

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleMileageChange = (key: keyof typeof mileageRules, val: string) => {
    setMileageRules(prev => ({ ...prev, [key]: parseInt(val) || 0 }));
  };

  const removeMember = (id: number) => {
    setMembers(prev => prev.filter(m => m.id !== id));
  };

  const handleSave = () => {
    updateSettings({
      notifications,
      mileageRules,
      members
    });
    toast.success('시스템 설정이 저장되었습니다.');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">시스템 설정</h1>
          <p className="text-slate-500 mt-1">알림, 포상 정책 및 심의 위원 권한을 관리합니다.</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all active:scale-95"
        >
          <Save size={18} /> 설정 저장
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. Mileage Policy Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-slate-50 flex items-center gap-2">
            <Coins className="text-amber-500" size={20} />
            <h3 className="font-bold text-slate-900">마일리지 적립 정책</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">제안 등록 (참가상)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={mileageRules.registration}
                    onChange={(e) => handleMileageChange('registration', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded font-bold text-slate-900 bg-white focus:ring-primary focus:border-primary"
                  />
                  <span className="text-sm text-slate-400">점</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">부서 검토 통과</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={mileageRules.deptPass}
                    onChange={(e) => handleMileageChange('deptPass', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded font-bold text-slate-900 bg-white focus:ring-primary focus:border-primary"
                  />
                  <span className="text-sm text-slate-400">점</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <label className="text-xs font-bold text-slate-500 uppercase block mb-3">최종 등급별 포상</label>
              <div className="grid grid-cols-2 gap-4">
                {['S', 'A', 'B', 'C'].map((grade) => (
                  <div key={grade} className="flex items-center justify-between p-3 rounded bg-slate-50 border border-gray-200">
                    <span className="font-bold text-slate-700 w-8">{grade}급</span>
                    <div className="flex items-center gap-2 w-32">
                      <input
                        type="number"
                        value={mileageRules[`grade${grade}` as keyof typeof mileageRules]}
                        onChange={(e) => handleMileageChange(`grade${grade}` as keyof typeof mileageRules, e.target.value)}
                        className="w-full px-2 py-1 text-right border border-gray-300 rounded text-sm font-bold text-slate-900 bg-white focus:ring-primary focus:border-primary"
                      />
                      <span className="text-xs text-slate-400">점</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Notification Settings */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-fit">
          <div className="p-5 border-b border-gray-100 bg-slate-50 flex items-center gap-2">
            <Bell className="text-primary" size={20} />
            <h3 className="font-bold text-slate-900">자동 알림 설정</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {[
              { key: 'newProposal', label: '제안 접수 알림', desc: '실행 부서장에게 메일 발송' },
              { key: 'deptReview', label: '부서 검토 완료 알림', desc: '관리자에게 1차 상정 대기 알림' },
              { key: 'reject', label: '반려 알림', desc: '제안자에게 반려 사유 포함 메일 발송' },
              { key: 'finalGrade', label: '최종 결과 통보', desc: '제안자에게 등급 및 포상 내역 발송' },
            ].map((item) => (
              <div key={item.key} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <p className="font-bold text-slate-900">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
                <button
                  onClick={() => toggleNotification(item.key as keyof typeof notifications)}
                  className={`text-2xl transition-colors ${notifications[item.key as keyof typeof notifications] ? 'text-primary' : 'text-slate-300'}`}
                >
                  {notifications[item.key as keyof typeof notifications] ? <ToggleRight size={36} fill="currentColor" /> : <ToggleLeft size={36} />}
                </button>
              </div>
            ))}
          </div>
          <div className="p-4 bg-slate-50 border-t border-gray-100 text-center">
            <button className="text-xs font-bold text-slate-500 flex items-center justify-center gap-1 hover:text-primary">
              <Mail size={12} /> 메일 템플릿 편집
            </button>
          </div>
          <div className="p-4 bg-slate-50 border-t border-gray-100 text-center">
            <button className="text-xs font-bold text-slate-500 flex items-center justify-center gap-1 hover:text-primary">
              <Mail size={12} /> 메일 템플릿 편집
            </button>
          </div>
        </div>

        {/* 3. OpenProject Integration */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-fit">
          <div className="p-5 border-b border-gray-100 bg-slate-50 flex items-center gap-2">
            <Users className="text-blue-600" size={20} />
            <h3 className="font-bold text-slate-900">OpenProject 연동</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">API 서버 주소</label>
              <input
                type="text"
                value={settings.openProject.apiUrl}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded text-slate-500 bg-gray-100 cursor-not-allowed"
              />
              <p className="text-xs text-slate-400">서버 주소는 고정되어 있습니다.</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">API Key</label>
              <input
                type="password"
                placeholder="OpenProject API Key 입력"
                value={settings.openProject.apiKey}
                onChange={(e) => updateSettings({
                  openProject: { ...settings.openProject, apiKey: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded text-slate-900 focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="pt-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-500">
                  마지막 동기화: {settings.openProject.lastSync ? new Date(settings.openProject.lastSync).toLocaleString() : '없음'}
                </span>
              </div>
              <button
                onClick={async () => {
                  // const { syncUsersFromOpenProject } = useProposalStore.getState(); // Removed incorrect usage
                  try {
                    toast.loading('OpenProject 사용자 동기화 중...');
                    await syncUsersFromOpenProject();
                    toast.dismiss();
                    toast.success('사용자 동기화가 완료되었습니다.');
                  } catch (e) {
                    toast.dismiss();
                    toast.error('동기화 실패: ' + (e instanceof Error ? e.message : '알 수 없는 오류'));
                  }
                }}
                className="w-full py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Users size={16} /> 사용자 정보 동기화
              </button>

              <div className="border-t border-gray-100 my-4 pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-slate-500 font-bold uppercase">프로젝트 동기화</span>
                  <span className="text-xs text-slate-500">
                    {settings.openProject.projects?.length || 0}개 프로젝트
                  </span>
                </div>
                <button
                  onClick={async () => {
                    const { syncProjectsFromOpenProject } = useProposalStore.getState();
                    try {
                      toast.loading('OpenProject 프로젝트 동기화 중...');
                      await syncProjectsFromOpenProject();
                      toast.dismiss();
                      toast.success('프로젝트 동기화가 완료되었습니다.');
                    } catch (e) {
                      toast.dismiss();
                      toast.error('동기화 실패: ' + (e instanceof Error ? e.message : '알 수 없는 오류'));
                    }
                  }}
                  className="w-full py-2 bg-purple-600 text-white font-bold rounded hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Users size={16} /> 프로젝트 목록 동기화
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="text-purple-600" size={20} />
              <h3 className="font-bold text-slate-900">심의 위원 관리</h3>
            </div>
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="text-xs font-bold flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-slate-50 transition-colors"
            >
              <Plus size={14} /> 위원 추가
            </button>
          </div>

          {/* User Search/Selection Area (Conditionally Rendered or Modal) */}
          {isSearchModalOpen && (
            <div className="p-4 bg-slate-50 border-b border-gray-200 animate-slide-in-down">
              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="사용자 검색 (이름)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary/50"
                    autoFocus
                  />
                </div>
                <button
                  onClick={() => setIsSearchModalOpen(false)}
                  className="px-3 py-2 text-slate-500 hover:text-slate-700 font-bold text-sm"
                >
                  취소
                </button>
              </div>

              {/* Search Results */}
              <div className="max-h-48 overflow-y-auto bg-white rounded border border-gray-200 shadow-sm">
                {users
                  .filter(u => u.name.includes(searchQuery))
                  .slice(0, 100) // Limit results
                  .map(user => (
                    <button
                      key={user.id}
                      onClick={() => {
                        const newMember = {
                          id: Date.now(), // better ID generation needed ideally
                          name: user.name,
                          dept: user.department || '미지정',
                          role: '1차 심의위원' // Default role
                        };
                        setMembers(prev => [...prev, newMember]);
                        setIsSearchModalOpen(false);
                        setSearchQuery('');
                        toast.success(`${user.name}님이 위원으로 추가되었습니다.`);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-purple-50 flex items-center justify-between border-b border-gray-50 last:border-none"
                    >
                      <div>
                        <span className="font-bold text-slate-900">{user.name}</span>
                        <span className="text-xs text-slate-500 ml-2">{user.email}</span>
                      </div>
                      <span className="text-xs font-medium text-slate-400">{user.department}</span>
                    </button>
                  ))}
                {users.filter(u => u.name.includes(searchQuery)).length === 0 && (
                  <div className="p-3 text-center text-slate-400 text-sm">검색 결과가 없습니다.</div>
                )}
              </div>
            </div>
          )}
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-gray-200">
                <tr>
                  <th className="p-4">이름 / 직책</th>
                  <th className="p-4">소속 부서</th>
                  <th className="p-4">권한 역할</th>
                  <th className="p-4 text-center">상태</th>
                  <th className="p-4 text-center">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members.map((member) => (
                  <tr key={member.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-900">{member.name}</td>
                    <td className="p-4 text-slate-500">{member.dept}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold border
                        ${member.role.includes('1차') ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-purple-50 text-purple-700 border-purple-100'}
                      `}>
                        {member.role}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                        <Shield size={12} /> 활성
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => removeMember(member.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {members.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm">등록된 심의 위원이 없습니다.</div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Settings;