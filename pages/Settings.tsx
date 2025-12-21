import React, { useState, useEffect } from 'react';
import { useProposalStore } from '../context/ProposalContext';
import { Save, Bell, Users, Coins, ToggleLeft, ToggleRight, Plus, Trash2, Mail, Shield, Search, Edit2, CheckCircle, X, List, Server } from 'lucide-react';
import { toast } from 'sonner';
import EmailTemplateModal from '../components/EmailTemplateModal';
import { generateDailyDigest, simulateSendEmail, sendEmailViaBackend } from '../services/notificationService';
import EmailSimulationResultModal, { EmailMessage } from '../components/EmailSimulationResultModal';

const Settings: React.FC = () => {
  const { settings, updateSettings, syncUsersFromOpenProject, syncProjectsFromOpenProject, users, updateUser, updateUserRole, proposals, systemLogs } = useProposalStore();


  const [searchQuery, setSearchQuery] = useState('');
  const [showPrivilegedOnly, setShowPrivilegedOnly] = useState(false);

  // Input states for new items
  const [newCategory, setNewCategory] = useState('');
  const [newCriteriaName, setNewCriteriaName] = useState('');
  const [newCriteriaPoints, setNewCriteriaPoints] = useState('');
  const [newGradeName, setNewGradeName] = useState('');
  const [newGradePoints, setNewGradePoints] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPoints, setEditPoints] = useState('');

  const startEditing = (id: string, name: string, points?: number) => {
    setEditingId(id);
    setEditName(name);
    setEditPoints(points ? points.toString() : '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
    setEditPoints('');
  };


  // Local state for edits (initialized from store)
  // No local state for simple settings, use store directly for inputs like API Key to avoid sync issues
  // But for the bulk save pattern used here, we might want to keep it consistent.
  // Ideally, refactor to direct store updates or full local state.
  // Given the previous step added direct updateSettings calls for OpenProject, we leave this as is.
  const [notifications, setNotifications] = useState(settings.notifications);
  const [mileageRules, setMileageRules] = useState(settings.mileageRules);
  const [emailConfig, setEmailConfig] = useState(settings.emailConfig);
  const [emailTemplates, setEmailTemplates] = useState(settings.emailTemplates || []);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Simulation State
  const [isSimulationModalOpen, setIsSimulationModalOpen] = useState(false);
  const [simulationMessages, setSimulationMessages] = useState<EmailMessage[]>([]);
  const [simulationTitle, setSimulationTitle] = useState('');

  // Tab State
  const [activeTab, setActiveTab] = useState<'general' | 'users' | 'system'>('general');


  // Sync local state when store changes
  useEffect(() => {
    setNotifications(settings.notifications);
    setMileageRules(settings.mileageRules);
    setEmailConfig(settings.emailConfig);
    setEmailTemplates(settings.emailTemplates || []);

  }, [settings]);

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleMileageChange = (key: keyof typeof mileageRules, val: string) => {
    setMileageRules(prev => ({ ...prev, [key]: parseInt(val) || 0 }));
  };

  const handleEmailConfigChange = (key: keyof typeof emailConfig, val: any) => {
    setEmailConfig(prev => ({ ...prev, [key]: val }));
  };



  const handleSave = () => {
    updateSettings({
      notifications,
      mileageRules,
      emailConfig,
      emailTemplates,

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

      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-6 py-3 font-bold text-sm transition-colors relative ${activeTab === 'general' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
        >
          일반 설정
          {activeTab === 'general' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900"></div>}
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-3 font-bold text-sm transition-colors relative ${activeTab === 'users' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
        >
          사용자 및 조직
          {activeTab === 'users' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900"></div>}
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`px-6 py-3 font-bold text-sm transition-colors relative ${activeTab === 'system' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
        >
          시스템 및 알림
          {activeTab === 'system' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900"></div>}
        </button>
      </div>

      <div className="space-y-6">

        {/* 1. Mileage Policy Section */}
        {activeTab === 'general' && (
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
                        <span className="text-sm text-slate-400">점</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Evaluation Settings Section */}
        {activeTab === 'general' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-slate-50 flex items-center gap-2">
              <Shield className="text-purple-500" size={20} />
              <h3 className="font-bold text-slate-900">심의 설정</h3>
            </div>
            <div className="p-6 space-y-6">
              {/* Blind Mode Toggles */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-3">블라인드 모드</label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded bg-slate-50 border border-gray-200">
                    <div>
                      <span className="font-medium text-slate-700">평가자에게 제안자 숨기기</span>
                      <p className="text-xs text-slate-400 mt-0.5">심의 시 제안자 이름이 "***"로 표시됩니다</p>
                    </div>
                    <button
                      onClick={() => updateSettings({
                        blindMode: {
                          ...settings.blindMode,
                          evaluator: !settings.blindMode?.evaluator
                        }
                      })}
                      className={`p-1 rounded-full transition-colors ${settings.blindMode?.evaluator ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-400'}`}
                    >
                      {settings.blindMode?.evaluator ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded bg-slate-50 border border-gray-200">
                    <div>
                      <span className="font-medium text-slate-700">제안자에게 평가자 숨기기</span>
                      <p className="text-xs text-slate-400 mt-0.5">제안자가 평가 결과 확인 시 평가자 이름이 숨겨집니다</p>
                    </div>
                    <button
                      onClick={() => updateSettings({
                        blindMode: {
                          ...settings.blindMode,
                          proposer: !settings.blindMode?.proposer
                        }
                      })}
                      className={`p-1 rounded-full transition-colors ${settings.blindMode?.proposer ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-400'}`}
                    >
                      {settings.blindMode?.proposer ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Reviewer Count Settings */}
              <div className="pt-4 border-t border-gray-100">
                <label className="text-xs font-bold text-slate-500 uppercase block mb-3">심의위원 인원 설정</label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-600">1차 심의위원 수</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={settings.totalReviewers1st || 3}
                        onChange={(e) => updateSettings({ totalReviewers1st: parseInt(e.target.value) || 3 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded font-bold text-slate-900 bg-white focus:ring-primary focus:border-primary"
                      />
                      <span className="text-sm text-slate-400">명</span>
                    </div>
                    <p className="text-xs text-slate-400">과반수({Math.ceil((settings.totalReviewers1st || 3) / 2) + 1}명) 참여 시 확정 가능</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-600">2차 심의위원 수</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={settings.totalReviewers2nd || 5}
                        onChange={(e) => updateSettings({ totalReviewers2nd: parseInt(e.target.value) || 5 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded font-bold text-slate-900 bg-white focus:ring-primary focus:border-primary"
                      />
                      <span className="text-sm text-slate-400">명</span>
                    </div>
                    <p className="text-xs text-slate-400">과반수({Math.ceil((settings.totalReviewers2nd || 5) / 2) + 1}명) 참여 시 확정 가능</p>
                  </div>
                </div>
              </div>

              {/* Contribution Management Settings */}
              <div className="pt-4 border-t border-gray-100">
                <label className="text-xs font-bold text-slate-500 uppercase block mb-3">공동 제안 관리</label>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded bg-slate-50 border border-gray-200">
                    <div>
                      <span className="font-medium text-slate-700">공동 제안 및 기여율 관리 사용</span>
                      <p className="text-xs text-slate-400 mt-0.5">제안 등록 시 다수의 제안자가 기여율을 설정할 수 있습니다.</p>
                    </div>
                    <button
                      onClick={() => updateSettings({
                        contribution: {
                          ...settings.contribution,
                          enabled: !settings.contribution?.enabled
                        }
                      })}
                      className={`p-1 rounded-full transition-colors ${settings.contribution?.enabled ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-400'}`}
                    >
                      {settings.contribution?.enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                    </button>
                  </div>

                  {settings.contribution?.enabled && (
                    <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-600">최대 공동 제안자 수 (제안자 제외)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={settings.contribution?.maxCoAuthors || 3}
                            onChange={(e) => updateSettings({
                              contribution: {
                                ...settings.contribution,
                                maxCoAuthors: parseInt(e.target.value) || 3
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded font-bold text-slate-900 bg-white focus:ring-primary focus:border-primary"
                          />
                          <span className="text-sm text-slate-400">명</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Evaluation Cutoff */}
              <div className="pt-4 border-t border-gray-100">
                <label className="text-xs font-bold text-slate-500 uppercase block mb-3">1차 심의 커트라인</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.evaluationCutoff || 60}
                    onChange={(e) => updateSettings({ evaluationCutoff: parseInt(e.target.value) || 60 })}
                    className="w-32 px-3 py-2 border border-gray-300 rounded font-bold text-slate-900 bg-white focus:ring-primary focus:border-primary"
                  />
                  <span className="text-sm text-slate-400">점 미만 자동 탈락 (100점 만점)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Notification Settings */}
        {activeTab === 'system' && (
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
              <button
                onClick={() => setIsTemplateModalOpen(true)}
                className="text-xs font-bold text-slate-500 flex items-center justify-center gap-1 hover:text-primary transition-colors"
              >
                <Mail size={12} /> 메일 템플릿 편집
              </button>
            </div>
          </div>
        )}

        <EmailTemplateModal
          isOpen={isTemplateModalOpen}
          onClose={() => setIsTemplateModalOpen(false)}
          templates={emailTemplates}
          onSave={(updated) => setEmailTemplates(updated)}
        />

        {/* 3. OpenProject Integration */}
        {activeTab === 'users' && (
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
        )}

        {/* 4. Email Server Configuration */}
        {activeTab === 'system' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-fit">
            <div className="p-5 border-b border-gray-100 bg-slate-50 flex items-center gap-2">
              <Mail className="text-indigo-600" size={20} />
              <h3 className="font-bold text-slate-900">이메일 공급자 구성</h3>
            </div>
            <div className="p-6 space-y-4">

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">이메일 배달 방법</label>
                <select
                  value={emailConfig?.deliveryMethod || 'smtp'}
                  onChange={(e) => handleEmailConfigChange('deliveryMethod', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-slate-900 bg-white focus:ring-primary focus:border-primary"
                >
                  <option value="smtp">smtp</option>
                  <option value="sendmail">sendmail</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">SMTP 서버</label>
                <input
                  type="text"
                  value={emailConfig?.smtpServer || ''}
                  onChange={(e) => handleEmailConfigChange('smtpServer', e.target.value)}
                  placeholder="예: gwsmtp.ktbizoffice.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-slate-900 bg-white focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">SMTP 포트</label>
                <input
                  type="text"
                  value={emailConfig?.smtpPort || '587'}
                  onChange={(e) => handleEmailConfigChange('smtpPort', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-slate-900 bg-white focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">SMTP HELO 도메인</label>
                <input
                  type="text"
                  value={emailConfig?.smtpHeloDomain || ''}
                  onChange={(e) => handleEmailConfigChange('smtpHeloDomain', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-slate-900 bg-white focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">SMTP 인증</label>
                <select
                  value={emailConfig?.smtpAuth || 'login'}
                  onChange={(e) => handleEmailConfigChange('smtpAuth', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-slate-900 bg-white focus:ring-primary focus:border-primary"
                >
                  <option value="none">none</option>
                  <option value="plain">plain</option>
                  <option value="login">login</option>
                  <option value="cram-md5">cram-md5</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">SMTP 사용자 이름</label>
                <input
                  type="text"
                  value={emailConfig?.smtpUsername || ''}
                  onChange={(e) => handleEmailConfigChange('smtpUsername', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-slate-900 bg-white focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">SMTP 비밀번호</label>
                <input
                  type="password"
                  value={emailConfig?.smtpPassword || ''}
                  onChange={(e) => handleEmailConfigChange('smtpPassword', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-slate-900 bg-white focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="enableStartTls"
                  checked={emailConfig?.enableStartTls || false}
                  onChange={(e) => handleEmailConfigChange('enableStartTls', e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="enableStartTls" className="text-sm font-medium text-slate-700 select-none">
                  사용 가능한 경우 자동으로 STARTTLS 사용
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enableSsl"
                  checked={emailConfig?.enableSsl || false}
                  onChange={(e) => handleEmailConfigChange('enableSsl', e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="enableSsl" className="text-sm font-medium text-slate-700 select-none">
                  SSL 연결 사용
                </label>
              </div>

              <div className="pt-4 border-t border-gray-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const dummyMsg: EmailMessage = {
                      to: users.find(u => u.role === 'Admin')?.email || 'admin@example.com',
                      subject: '[테스트] IdeaFlow 메일 발송 테스트',
                      body: '이것은 메일 발송 설정 테스트를 위한 시뮬레이션 메일입니다.\n\nSMTP 설정이 올바르다면 실제 발송되었을 것입니다.\n(현재는 Frontend-only Mock 모드입니다.)'
                    };
                    setSimulationMessages([dummyMsg]);
                    setSimulationTitle('테스트 이메일 발송 결과');
                    setIsSimulationModalOpen(true);
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded hover:bg-slate-200 transaction-colors flex items-center gap-2 text-sm"
                >
                  <Mail size={16} /> 테스트 이메일 보내기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const msgs = generateDailyDigest(users, proposals, emailConfig);
                    setSimulationMessages(msgs);
                    setSimulationTitle('일일 요약 (Daily Digest) 시뮬레이션 결과');
                    setIsSimulationModalOpen(true);
                  }}
                  className="px-4 py-2 bg-indigo-50 text-indigo-700 font-bold rounded hover:bg-indigo-100 transaction-colors flex items-center gap-2 text-sm"
                >
                  <List size={16} /> 일일 요약 발송 시뮬레이션
                </button>
              </div>

              <div className="pt-2 border-t border-gray-100 mt-2">
                <p className="text-xs font-bold text-red-500 mb-2 flex items-center gap-1">
                  <Server size={12} /> 실제 발송 (Python Backend 필요)
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const dummyMsg: EmailMessage = {
                        to: users.find(u => u.role === 'Admin')?.email || 'admin@example.com',
                        subject: '[실제발송] IdeaFlow 메일 테스트',
                        body: '이 메일은 IdeaFlow Python Backend를 통해 실제 SMTP 서버로 발송된 테스트 메일입니다.'
                      };
                      const promise = sendEmailViaBackend(dummyMsg, emailConfig);
                      toast.promise(promise, {
                        loading: 'Backend로 전송 중...',
                        success: '메일 발송 성공!',
                        error: (data) => `발송 실패: ${data.error}`
                      });
                    }}
                    className="px-4 py-2 bg-red-50 text-red-700 font-bold rounded hover:bg-red-100 transaction-colors flex items-center gap-2 text-sm"
                  >
                    <Server size={16} /> 실제 발송 테스트
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const msgs = generateDailyDigest(users, proposals, emailConfig);
                      if (msgs.length === 0) {
                        toast.info('발송할 건이 없습니다.');
                        return;
                      }
                      if (!confirm(`총 ${msgs.length}건의 실제 메일을 발송하시겠습니까?`)) return;

                      toast.loading(`총 ${msgs.length}건 발송 시작...`);
                      let successCount = 0;
                      let failCount = 0;

                      for (const msg of msgs) {
                        const res = await sendEmailViaBackend(msg, emailConfig);
                        if (res.success) successCount++;
                        else failCount++;
                      }
                      toast.dismiss();
                      if (failCount === 0) toast.success(`총 ${successCount}건 발송 완료`);
                      else toast.error(`성공 ${successCount}건 / 실패 ${failCount}건`);
                    }}
                    className="px-4 py-2 bg-red-50 text-red-700 font-bold rounded hover:bg-red-100 transaction-colors flex items-center gap-2 text-sm"
                  >
                    <Server size={16} /> 일일 요약 실제 발송
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        <EmailSimulationResultModal
          isOpen={isSimulationModalOpen}
          onClose={() => setIsSimulationModalOpen(false)}
          messages={simulationMessages}
          title={simulationTitle}
        />


        {/* User Permission Management */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-slate-50 flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-gradient-to-r from-indigo-500 to-blue-500"></div>
              <h3 className="font-bold text-slate-900">사용자 권한 관리</h3>
            </div>
            <div className="p-4">
              <div className="mb-4 relative">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="이름 또는 부서 검색..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="showPrivilegedOnly"
                  checked={showPrivilegedOnly}
                  onChange={(e) => setShowPrivilegedOnly(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="showPrivilegedOnly" className="text-sm font-medium text-slate-700 select-none flex items-center gap-1">
                  <Shield size={14} className="text-indigo-600" /> 권한 보유자만 보기 (Admin, 심의위원 등)
                </label>
              </div>

              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-xs text-slate-500 border-b border-gray-100">
                      <th className="p-3 font-semibold">이름</th>
                      <th className="p-3 font-semibold">이메일</th>
                      <th className="p-3 font-semibold">부서</th>
                      <th className="p-3 font-semibold">역할</th>
                      <th className="p-3 font-semibold text-center">부서 검토 권한</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.filter(u => {
                      const matchesSearch = u.name.includes(searchQuery) || u.department.includes(searchQuery);
                      if (!matchesSearch) return false;
                      if (showPrivilegedOnly) {
                        return u.role !== 'User' || u.canDeptReview;
                      }
                      return true;
                    }).map(user => (
                      <tr key={user.id} className="group hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-sm font-bold text-slate-900 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-600">
                            {user.name[0]}
                          </div>
                          {user.name}
                        </td>
                        <td className="p-3 text-sm text-slate-500">{user.email || '-'}</td>
                        <td className="p-3 text-sm text-slate-500">{user.department}</td>
                        <td className="p-3">
                          <select
                            value={user.role}
                            onChange={(e) => updateUserRole(user.id, e.target.value)}
                            className="px-2 py-1 border border-gray-200 rounded text-xs text-slate-700 focus:outline-none focus:border-primary"
                          >
                            <option value="User">일반 사용자</option>
                            <option value="1차 심의위원">1차 심의위원</option>
                            <option value="2차 심의위원">2차 심의위원</option>
                            <option value="Admin">관리자 (Admin)</option>
                          </select>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => updateUser(user.id, { canDeptReview: !user.canDeptReview })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${user.canDeptReview ? 'bg-indigo-600' : 'bg-gray-200'}`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${user.canDeptReview ? 'translate-x-6' : 'translate-x-1'}`}
                            />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 4. Category Management */}
        {activeTab === 'general' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-slate-50 flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-gradient-to-r from-blue-500 to-purple-500"></div>
              <h3 className="font-bold text-slate-900">제안 카테고리 관리</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="새 카테고리 이름"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newCategory.trim()) {
                      const newCat = { id: `cat-${Date.now()}`, name: newCategory.trim(), color: 'blue' };
                      updateSettings({ categories: [...(settings.categories || []), newCat] });
                      setNewCategory('');
                      toast.success(`'${newCat.name}' 카테고리가 추가되었습니다.`);
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (newCategory.trim()) {
                      const newCat = { id: `cat-${Date.now()}`, name: newCategory.trim(), color: 'blue' };
                      updateSettings({ categories: [...(settings.categories || []), newCat] });
                      setNewCategory('');
                      toast.success(`'${newCat.name}' 카테고리가 추가되었습니다.`);
                    } else {
                      toast.error('카테고리 이름을 입력해주세요.');
                    }
                  }}
                  className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded hover:bg-slate-800 transition-colors flex items-center gap-1"
                >
                  <Plus size={14} /> 추가
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2">
                {(settings.categories || []).map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    {editingId === cat.id ? (
                      <div className="flex flex-1 items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2 py-1 border border-primary rounded text-sm"
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            const updated = (settings.categories || []).map(c =>
                              c.id === cat.id ? { ...c, name: editName } : c
                            );
                            updateSettings({ categories: updated });
                            cancelEditing();
                            toast.success('수정되었습니다.');
                          }}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                        >
                          <CheckCircle size={16} />
                        </button>
                        <button onClick={cancelEditing} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full bg-${cat.color}-500`}></div>
                          <span className="font-medium text-slate-700">{cat.name}</span>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEditing(cat.id, cat.name)}
                            className="p-1 text-slate-400 hover:text-blue-500 rounded hover:bg-blue-50"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => {
                              updateSettings({ categories: settings.categories.filter(c => c.id !== cat.id) });
                              toast.success('삭제되었습니다.');
                            }}
                            className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {(settings.categories || []).length === 0 && (
                  <div className="text-center text-slate-400 text-sm py-4">등록된 카테고리가 없습니다.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 5. Evaluation Criteria Management */}
        {activeTab === 'general' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-slate-50 flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-gradient-to-r from-green-500 to-teal-500"></div>
              <h3 className="font-bold text-slate-900">1차 심의 기준 관리</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="기준 이름 (예: 효과성)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                  value={newCriteriaName}
                  onChange={(e) => setNewCriteriaName(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="배점"
                  className="w-20 px-3 py-2 border border-gray-300 rounded text-sm"
                  value={newCriteriaPoints}
                  onChange={(e) => setNewCriteriaPoints(e.target.value)}
                />
                <button
                  onClick={() => {
                    if (newCriteriaName.trim() && newCriteriaPoints) {
                      const newCrit = { id: `crit-${Date.now()}`, name: newCriteriaName.trim(), maxPoints: parseInt(newCriteriaPoints) || 10 };
                      updateSettings({ evaluationCriteria: [...(settings.evaluationCriteria || []), newCrit] });
                      setNewCriteriaName('');
                      setNewCriteriaPoints('');
                      toast.success(`'${newCrit.name}' 기준이 추가되었습니다.`);
                    } else {
                      toast.error('이름과 배점을 모두 입력해주세요.');
                    }
                  }}
                  className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded hover:bg-slate-800 transition-colors flex items-center gap-1"
                >
                  <Plus size={14} /> 추가
                </button>
              </div>

              <div className="space-y-2">
                {(settings.evaluationCriteria || []).map(crit => (
                  <div key={crit.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    {editingId === crit.id ? (
                      <div className="flex flex-1 items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2 py-1 border border-primary rounded text-sm"
                          placeholder="이름"
                        />
                        <input
                          type="number"
                          value={editPoints}
                          onChange={(e) => setEditPoints(e.target.value)}
                          className="w-20 px-2 py-1 border border-primary rounded text-sm"
                          placeholder="점수"
                        />
                        <button
                          onClick={() => {
                            const updated = (settings.evaluationCriteria || []).map(c =>
                              c.id === crit.id ? { ...c, name: editName, maxPoints: parseInt(editPoints) || 0 } : c
                            );
                            updateSettings({ evaluationCriteria: updated });
                            cancelEditing();
                            toast.success('수정되었습니다.');
                          }}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                        >
                          <CheckCircle size={16} />
                        </button>
                        <button onClick={cancelEditing} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-slate-700">{crit.name}</span>
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">{crit.maxPoints}점</span>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEditing(crit.id, crit.name, crit.maxPoints)}
                            className="p-1 text-slate-400 hover:text-blue-500 rounded hover:bg-blue-50"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => {
                              updateSettings({ evaluationCriteria: settings.evaluationCriteria.filter(c => c.id !== crit.id) });
                              toast.success('삭제되었습니다.');
                            }}
                            className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 pt-3 mt-3">
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">커트라인 (최소 통과 점수)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={settings.evaluationCutoff || 80}
                    onChange={(e) => updateSettings({ evaluationCutoff: parseInt(e.target.value) || 0 })}
                    className="w-24 px-3 py-2 border border-gray-300 rounded font-bold text-slate-900 text-center"
                  />
                  <span className="text-sm text-slate-500">점 이상 통과</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 6. Grade Management */}
        {activeTab === 'general' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-slate-50 flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-gradient-to-r from-amber-500 to-orange-500"></div>
              <h3 className="font-bold text-slate-900">2차 심의 등급 관리</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="등급명 (예: 특급)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm min-w-0"
                  value={newGradeName}
                  onChange={(e) => setNewGradeName(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="포인트"
                  className="w-20 px-3 py-2 border border-gray-300 rounded text-sm"
                  value={newGradePoints}
                  onChange={(e) => setNewGradePoints(e.target.value)}
                />
                <button
                  onClick={() => {
                    if (newGradeName.trim() && newGradePoints) {
                      const newGrade = { id: `grade-${Date.now()}`, name: newGradeName.trim(), mileagePoints: parseInt(newGradePoints) || 0, color: 'slate' };
                      updateSettings({ grades: [...(settings.grades || []), newGrade] });
                      setNewGradeName('');
                      setNewGradePoints('');
                      toast.success(`'${newGrade.name}' 등급이 추가되었습니다.`);
                    } else {
                      toast.error('등급명과 포인트를 모두 입력해주세요.');
                    }
                  }}
                  className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded hover:bg-slate-800 transition-colors flex items-center gap-1 whitespace-nowrap"
                >
                  <Plus size={14} /> 추가
                </button>
              </div>

              <div className="space-y-2">
                {(settings.grades || []).map(grade => (
                  <div key={grade.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    {editingId === grade.id ? (
                      <div className="flex flex-1 items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2 py-1 border border-primary rounded text-sm"
                        />
                        <input
                          type="number"
                          value={editPoints}
                          onChange={(e) => setEditPoints(e.target.value)}
                          className="w-20 px-2 py-1 border border-primary rounded text-sm"
                        />
                        <button
                          onClick={() => {
                            const updated = (settings.grades || []).map(g =>
                              g.id === grade.id ? { ...g, name: editName, mileagePoints: parseInt(editPoints) || 0 } : g
                            );
                            updateSettings({ grades: updated });
                            cancelEditing();
                            toast.success('수정되었습니다.');
                          }}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                        >
                          <CheckCircle size={16} />
                        </button>
                        <button onClick={cancelEditing} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-lg text-slate-800">{grade.name}</span>
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded">{grade.mileagePoints}pt</span>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEditing(grade.id, grade.name, grade.mileagePoints)}
                            className="p-1 text-slate-400 hover:text-blue-500 rounded hover:bg-blue-50"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => {
                              updateSettings({ grades: settings.grades.filter(g => g.id !== grade.id) });
                              toast.success('삭제되었습니다.');
                            }}
                            className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {(settings.grades || []).length === 0 && (
                  <div className="text-center text-slate-400 text-sm py-4">등록된 등급이 없습니다.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* System Logs */}
        {activeTab === 'system' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden md:col-span-2">
            <div className="p-5 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-slate-600"></div>
                <h3 className="font-bold text-slate-900">시스템 로그 (System Logs)</h3>
              </div>
              <div className="text-xs text-slate-500">최근 100건 표시</div>
            </div>
            <div className="max-h-96 overflow-y-auto p-4">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2">시간</th>
                    <th className="px-3 py-2">레벨</th>
                    <th className="px-3 py-2">사용자</th>
                    <th className="px-3 py-2">액션</th>
                    <th className="px-3 py-2">상세</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {systemLogs.slice(0, 100).map(log => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-500 font-mono text-xs">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${log.level === 'Error' ? 'bg-red-100 text-red-700' :
                          log.level === 'Warning' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-50 text-blue-700'
                          }`}>
                          {log.level}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-700">{log.user}</td>
                      <td className="px-3 py-2 font-medium text-slate-900">{log.action}</td>
                      <td className="px-3 py-2 text-slate-600 truncate max-w-xs" title={log.details}>
                        {log.details}
                      </td>
                    </tr>
                  ))}
                  {systemLogs.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-8 text-slate-400">로그가 없습니다.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Settings;