import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Proposal, MileageLog, User, Department, SystemLog, Comment, SettingsState, ReviewerEvaluation, UnifiedComment, ProposalRevision, SupplementRequest, Notification, ProposalStatus, CompletionReport, PayoutBatch } from '../types';
import { sendInstantNotification } from '../services/notificationService';
import { MOCK_PROPOSALS, MOCK_MILEAGE_LOGS, CURRENT_USER } from '../constants';
import { proposalsApi, usersApi, departmentsApi, mileageApi, settingsApi, healthApi } from '../services/apiService';
const MOCK_USERS: User[] = [
    { id: 'user1', name: '김철수', role: 'User', department: '생산관리팀', avatarUrl: '' },
    { id: 'user2', name: '이영희', role: 'Reviewer', department: '인사팀', avatarUrl: '' },
    { id: 'user3', name: '박민수', role: 'Admin', department: 'IT지원팀', avatarUrl: '' },
    // IdeaFlow Admin - 문현진
    { id: '5', name: 'Hyunjin', role: 'Admin', department: 'Moon', avatarUrl: '', email: 'hyunjin_moon@ashimori.co.kr' },
];

const MOCK_DEPARTMENTS: Department[] = [
    { id: 'dept1', name: '생산관리팀', managerId: 'user1' },
    { id: 'dept2', name: '인사팀', managerId: 'user2' },
    { id: 'dept3', name: 'IT지원팀', managerId: 'user3' },
    { id: 'dept4', name: '영업팀', managerId: '' },
];



interface ProposalContextType {
    proposals: Proposal[];
    mileageLogs: MileageLog[];
    currentUser: User;
    users: User[];
    departments: Department[];
    systemLogs: SystemLog[];
    settings: SettingsState;
    notifications: Notification[];  // In-app notifications
    addProposal: (proposal: Proposal) => Promise<void>;
    updateProposal: (id: string, updates: Partial<Proposal>) => Promise<void>;
    addMileageLog: (log: MileageLog) => Promise<void>;
    updateMileageLog: (id: string, updates: Partial<MileageLog>) => void;
    updateSettings: (updates: Partial<SettingsState>) => Promise<void>;
    setCurrentUser: (user: User) => void;
    addUser: (user: User) => void;
    removeUser: (id: string) => void;
    updateUserRole: (userId: string, newRole: string) => Promise<void>;
    updateUser: (userId: string, updates: Partial<User>) => void;
    syncUsersFromOpenProject: () => Promise<void>;
    syncProjectsFromOpenProject: () => Promise<void>;
    addDepartment: (dept: Department) => void;
    removeDepartment: (id: string) => void;
    addSystemLog: (log: SystemLog) => void;
    addComment: (proposalId: string, content: string) => void;
    deleteComment: (proposalId: string, commentId: string) => void;
    // Multi-reviewer evaluation functions
    addReviewerEvaluation: (proposalId: string, evaluation: ReviewerEvaluation) => void;
    getReviewerCount: (proposalId: string, round: '1st' | '2nd') => number;
    hasUserReviewed: (proposalId: string, userId: string, round: '1st' | '2nd') => boolean;
    // Unified Comment System
    addUnifiedComment: (proposalId: string, comment: Omit<UnifiedComment, 'id' | 'createdAt'>) => void;
    replyToComment: (proposalId: string, parentId: string, content: string) => void;
    // Revision System
    createRevision: (proposalId: string, changeNote?: string) => void;
    requestSupplement: (proposalId: string, reason: string) => void;
    completeSupplementRequest: (proposalId: string, requestId: string, revisionId: string) => void;
    // Notification System
    addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
    markNotificationRead: (notificationId: string) => void;
    markAllNotificationsRead: () => void;
    getUnreadNotificationCount: () => number;
    // Admin Proposal Management
    softDeleteProposal: (proposalId: string, reason?: string) => void;
    archiveProposal: (proposalId: string, reason?: string) => void;
    hideProposal: (proposalId: string) => void;
    unhideProposal: (proposalId: string) => void;
    restoreProposal: (proposalId: string) => void;
    forceStatusChange: (proposalId: string, newStatus: ProposalStatus) => void;
    transferOwnership: (proposalId: string, newOwnerId: string, newOwnerName: string) => void;
    bulkArchive: (proposalIds: string[], reason?: string) => void;
    bulkDelete: (proposalIds: string[], reason?: string) => void;
    updateCoAuthors: (proposalId: string, coAuthors: { id: string; name: string; department: string }[]) => void;
    // Completion Report
    submitCompletionReport: (proposalId: string, report: Omit<CompletionReport, 'id'>) => void;
    evaluateCompletionReport: (proposalId: string, recognizedPercentage: number, comment: string) => void;
    distributeReward: (proposal: Proposal, type: MileageLog['type'], totalPoints: number, description: string) => void;
    agreeToContribution: (proposalId: string) => void;
    addManualMileageLog: (userId: string, points: number, reason: string) => void;
    voidMileageLog: (logId: string, reason: string) => void;
    deleteMileageLog: (logId: string) => void;
    bulkDeleteMileageLogs: (logIds: string[]) => void;
    processSelectedPayouts: (logIds: string[]) => string; // Returns new Batch ID
}

const ProposalContext = createContext<ProposalContextType | undefined>(undefined);

export const ProposalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // API connection state
    const [isApiConnected, setIsApiConnected] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize state from localStorage or fall back to constants
    const [proposals, setProposals] = useState<Proposal[]>(() => {
        const saved = localStorage.getItem('ideaflow_proposals');
        return saved ? JSON.parse(saved) : MOCK_PROPOSALS;
    });

    const [mileageLogs, setMileageLogs] = useState<MileageLog[]>(() => {
        const saved = localStorage.getItem('ideaflow_mileage');
        return saved ? JSON.parse(saved) : MOCK_MILEAGE_LOGS;
    });

    // Guest user for unauthenticated state (id is empty to trigger login redirect)
    const GUEST_USER: User = { id: '', name: '', role: 'User', department: '', avatarUrl: '' };

    const [currentUser, setCurrentUser] = useState<User>(() => {
        const saved = localStorage.getItem('ideaflow_user');
        // Return guest user if not logged in - triggers login redirect in Layout
        return saved ? JSON.parse(saved) : GUEST_USER;
    });

    const [users, setUsers] = useState<User[]>(() => {
        const saved = localStorage.getItem('ideaflow_users');
        return saved ? JSON.parse(saved) : MOCK_USERS;
    });

    const [departments, setDepartments] = useState<Department[]>(() => {
        const saved = localStorage.getItem('ideaflow_departments');
        return saved ? JSON.parse(saved) : MOCK_DEPARTMENTS;
    });

    const [systemLogs, setSystemLogs] = useState<SystemLog[]>(() => {
        const saved = localStorage.getItem('ideaflow_logs');
        return saved ? JSON.parse(saved) : [];
    });

    // In-app notifications
    const [notifications, setNotifications] = useState<Notification[]>(() => {
        const saved = localStorage.getItem('ideaflow_notifications');
        return saved ? JSON.parse(saved) : [];
    });

    const [payoutBatches, setPayoutBatches] = useState<PayoutBatch[]>(() => {
        const saved = localStorage.getItem('ideaflow_payout_batches');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('ideaflow_payout_batches', JSON.stringify(payoutBatches));
    }, [payoutBatches]);

    const [settings, setSettings] = useState<SettingsState>(() => {
        const saved = localStorage.getItem('ideaflow_settings');
        const defaults: SettingsState = {
            notifications: {
                newProposal: true,
                deptReview: true,
                reject: false,
                finalGrade: true,
            },
            mileageRules: {
                registration: 1,
                deptPass: 2,
                gradeS: 100,
                gradeA: 50,
                gradeB: 30,
                gradeC: 10,
            },
            openProject: {
                apiUrl: 'http://192.168.0.200:8085/',
                apiKey: '',
                lastSync: null,
                projects: [],
            },
            emailConfig: {
                deliveryMethod: 'smtp',
                smtpServer: '',
                smtpPort: '587',
                smtpHeloDomain: '',
                smtpAuth: 'login',
                smtpUsername: '',
                smtpPassword: '',
                enableStartTls: true,
                enableSsl: false,
            },
            emailTemplates: [
                { id: 'newProposal', name: '제안 등록 알림', subject: '[제안시스템] 새로운 제안이 등록되었습니다', body: '{userName}님이 새로 제안을 등록했습니다.\n\n제목: {title}\n요약: {summary}\n\n시스템에 접속하여 확인해주세요.' },
                { id: 'deptReview', name: '부서 검토 완료', subject: '[제안시스템] 부서 검토가 완료되었습니다', body: '제안이 부서 검토를 통과하여 심의 대기 중입니다.\n\n제목: {title}\n부서: {dept}\n\n심의를 진행해주세요.' },
                { id: 'reject', name: '제안 반려 알림', subject: '[제안시스템] 제안이 반려되었습니다', body: '아쉽게도 제안이 반려되었습니다.\n\n제목: {title}\n반려 사유: {rejectReason}\n\n다음에 더 좋은 제안 부탁드립니다.' },
                { id: 'finalGrade', name: '최종 심의 결과', subject: '[제안시스템] 최종 심의 결과 안내', body: '축하합니다! 제안이 최종 심의를 통과했습니다.\n\n제목: {title}\n최종 등급: {grade}\n포상 포인트: {points}점\n\n참여해 주셔서 감사합니다.' },
            ],

            // New configurable settings
            categories: [
                { id: 'process', name: '프로세스 개선', color: 'blue' },
                { id: 'cost', name: '원가 절감', color: 'green' },
                { id: 'safety', name: '안전/환경', color: 'red' },
                { id: 'welfare', name: '복리후생', color: 'purple' },
                { id: 'it', name: 'IT/시스템', color: 'indigo' },
                { id: 'marketing', name: '마케팅', color: 'orange' },
            ],
            evaluationCriteria: [
                { id: 'effect', name: '기대효과', maxPoints: 25, description: '재무/비재무적 효과 평가' },
                { id: 'creativity', name: '창의성', maxPoints: 25, description: '아이디어 혁신성 평가' },
                { id: 'feasibility', name: '실현 가능성', maxPoints: 25, description: '실행 가능성 평가' },
                { id: 'specificity', name: '제안 구체성', maxPoints: 25, description: '제안 완성도 평가' },
            ],
            evaluationCutoff: 60, // 100점 만점 기준 60점 이상 통과
            grades: [
                { id: 'S', name: 'S등급', mileagePoints: 100, color: 'amber', minScore: 28, maxScore: 30, rewardAmount: 300000 },
                { id: 'A', name: 'A등급', mileagePoints: 50, color: 'blue', minScore: 26, maxScore: 27, rewardAmount: 200000 },
                { id: 'B', name: 'B등급', mileagePoints: 30, color: 'green', minScore: 24, maxScore: 25, rewardAmount: 100000 },
                { id: 'C', name: 'C등급', mileagePoints: 20, color: 'teal', minScore: 21, maxScore: 23, rewardAmount: 50000 },
                { id: 'D', name: 'D등급', mileagePoints: 10, color: 'slate', minScore: 16, maxScore: 20, rewardAmount: 20000 },
                { id: 'P', name: '제안상', mileagePoints: 5, color: 'gray', minScore: 12, maxScore: 15, rewardAmount: 2000 },
            ],

            // 2nd Round Evaluation Criteria (각 5점 만점)
            evaluation2ndCriteria: [
                { id: 'insight', name: '착안점', maxPoints: 5, description: '아이디어 착안의 독창성' },
                { id: 'difficulty', name: '실현의 난이도', maxPoints: 5, description: '구현 난이도 평가' },
                { id: 'importance', name: '중요성 및 긴급성', maxPoints: 5, description: '중요성과 긴급성의 평균' },
                { id: 'impact', name: '성과의 크기', maxPoints: 5, description: '예상 효과 금액 기준' },
                { id: 'efficiency', name: '업무능률 향상', maxPoints: 5, description: '업무 효율성 개선 정도' },
            ],

            // Blind Mode Settings
            blindMode: {
                evaluator: false, // 평가자에게 제안자 정보 숨김
                proposer: false,  // 제안자에게 평가자 정보 숨김
            },

            // Required reviewers for grade confirmation (majority rule)
            totalReviewers1st: 3,
            totalReviewers2nd: 5,

            // Supplement Request Settings
            supplementDeadlineDays: 7,  // Default 1 week

            // Contribution Settings
            contribution: {
                enabled: true,
                maxCoAuthors: 3
            }
        };
        if (saved) {
            const parsed = JSON.parse(saved);
            // Merge with defaults to ensure new fields exist
            return { ...defaults, ...parsed };
        }
        return defaults;
    });

    // ========================================
    // API Data Loading Effect
    // Load data from server on mount, fallback to localStorage
    // ========================================
    useEffect(() => {
        const loadDataFromApi = async () => {
            try {
                // Check if API server is available
                const health = await healthApi.check();
                if (health.status !== 'ok') throw new Error('API not healthy');

                setIsApiConnected(true);
                console.log('✅ API Server connected, loading data...');

                // Load all data from API in parallel
                const [apiProposals, apiUsers, apiDepartments, apiMileage, apiSettings] = await Promise.all([
                    proposalsApi.getAll().catch(() => null),
                    usersApi.getAll().catch(() => null),
                    departmentsApi.getAll().catch(() => null),
                    mileageApi.getAll().catch(() => null),
                    settingsApi.getAll().catch(() => null),
                ]);

                // Only update state if we got valid data from API
                if (apiProposals && Array.isArray(apiProposals) && apiProposals.length > 0) {
                    setProposals(apiProposals);
                    console.log(`📦 Loaded ${apiProposals.length} proposals from API`);
                }
                if (apiUsers && Array.isArray(apiUsers) && apiUsers.length > 0) {
                    setUsers(apiUsers);
                    console.log(`👥 Loaded ${apiUsers.length} users from API`);
                }
                if (apiDepartments && Array.isArray(apiDepartments) && apiDepartments.length > 0) {
                    setDepartments(apiDepartments);
                    console.log(`🏢 Loaded ${apiDepartments.length} departments from API`);
                }
                if (apiMileage && Array.isArray(apiMileage) && apiMileage.length > 0) {
                    setMileageLogs(apiMileage);
                    console.log(`💰 Loaded ${apiMileage.length} mileage logs from API`);
                }
                if (apiSettings && typeof apiSettings === 'object' && Object.keys(apiSettings).length > 0) {
                    setSettings(prev => ({ ...prev, ...apiSettings }));
                    console.log('⚙️ Loaded settings from API');
                }

            } catch (error) {
                console.warn('⚠️ API Server not available, using localStorage:', error);
                setIsApiConnected(false);
            } finally {
                setIsLoading(false);
            }
        };

        loadDataFromApi();
    }, []); // Run once on mount


    // Migration: Fix Role and Department for existing sessions
    useEffect(() => {
        let updates: any = {};

        // Fix Role
        if (currentUser.role === '시스템 관리자') {
            updates.role = 'Admin';
        }

        // Fix Department (legacy 'dept' property)
        if (!currentUser.department && (currentUser as any).dept) {
            updates.department = (currentUser as any).dept;
        }

        if (Object.keys(updates).length > 0) {
            setCurrentUser(prev => ({ ...prev, ...updates }));
        }
    }, [currentUser]);

    // Migration: Move 'New' proposals to 'Dept_Review' if targetDepartment is set
    useEffect(() => {
        const hasNewProposals = proposals.some(p => p.status === 'New' && p.targetDepartment);
        if (hasNewProposals) {
            setProposals(prev => prev.map(p =>
                (p.status === 'New' && p.targetDepartment)
                    ? { ...p, status: 'Dept_Review' }
                    : p
            ));
        }
    }, [proposals]);

    // Persistence Effects
    useEffect(() => {
        localStorage.setItem('ideaflow_proposals', JSON.stringify(proposals));
    }, [proposals]);

    useEffect(() => {
        localStorage.setItem('ideaflow_mileage', JSON.stringify(mileageLogs));
    }, [mileageLogs]);

    useEffect(() => {
        localStorage.setItem('ideaflow_user', JSON.stringify(currentUser));
    }, [currentUser]);

    useEffect(() => {
        localStorage.setItem('ideaflow_users', JSON.stringify(users));

        // Auto-sync currentUser from users list (to reflect role/permission changes immediately)
        const freshUser = users.find(u => u.id === currentUser.id);
        if (freshUser) {
            // Check if any critical field changed
            if (JSON.stringify(freshUser) !== JSON.stringify(currentUser)) {
                setCurrentUser(freshUser);
            }
        }
    }, [users]);

    useEffect(() => {
        localStorage.setItem('ideaflow_departments', JSON.stringify(departments));
    }, [departments]);

    useEffect(() => {
        localStorage.setItem('ideaflow_logs', JSON.stringify(systemLogs));
    }, [systemLogs]);

    useEffect(() => {
        localStorage.setItem('ideaflow_settings', JSON.stringify(settings));
    }, [settings]);

    // Safety: Force Admin for Owner
    useEffect(() => {
        if (currentUser.email === 'hyunjin_moon@ashimori.co.kr' && currentUser.role !== 'Admin') {
            console.log('[Safety] Forcing Admin Role for Owner');
            const newRole = 'Admin';
            setCurrentUser(prev => ({ ...prev, role: newRole }));
            setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, role: newRole } : u));
        }
    }, [currentUser.email, currentUser.role, currentUser.id]);

    // Migration: Backfill proposalNumber for legacy proposals
    React.useEffect(() => {
        setProposals(prev => {
            const needsMigration = prev.some(p => !p.proposalNumber);
            if (!needsMigration) return prev;

            console.log('Migrating legacy proposals...');
            // Sort by date to assign numbers sequentially
            const sorted = [...prev].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            let seqCounter = 1;
            const updated = sorted.map(p => {
                if (p.proposalNumber) return p;

                const year = new Date(p.date).getFullYear();
                const num = `AKC_IP-${year}-${String(seqCounter++).padStart(3, '0')}`;
                return { ...p, proposalNumber: num };
            });

            return updated;
        });
    }, []); // Run once on mount


    // Actions
    const addProposal = async (newProposal: Proposal) => {
        // Generate Document Number if missing
        let proposalWithNumber = { ...newProposal };
        if (!proposalWithNumber.proposalNumber) {
            const year = new Date().getFullYear();
            const prefix = `AKC_IP-${year}`;

            // Find max sequence for current year
            const existingNumbers = proposals
                .map(p => p.proposalNumber)
                .filter((num): num is string => !!num && num.startsWith(prefix))
                .map(num => {
                    const parts = num.split('-');
                    return parseInt(parts[2], 10);
                })
                .filter(n => !isNaN(n));

            const maxSeq = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
            const nextSeq = maxSeq + 1;

            proposalWithNumber.proposalNumber = `${prefix}-${String(nextSeq).padStart(3, '0')}`;
        }

        // Save to database via API
        try {
            if (isApiConnected) {
                const { proposalsApi } = await import('../services/apiService');
                await proposalsApi.create(proposalWithNumber);
                console.log('✅ Proposal saved to database:', proposalWithNumber.proposalNumber);
            }
        } catch (error) {
            console.error('❌ Failed to save proposal to DB, using localStorage fallback:', error);
        }

        setProposals(prev => [proposalWithNumber, ...prev]);

        // Trigger Notification: New Proposal
        if (settings.notifications.newProposal) {
            sendInstantNotification('newProposal', proposalWithNumber, {
                users,
                config: settings.emailConfig,
                templates: settings.emailTemplates || [],
                notifySettings: settings.notifications,
                addSystemLog
            });
        }

        // Award Registration Mileage
        const regPoints = settings.mileageRules.registration || 0;
        if (regPoints > 0) {
            distributeReward(proposalWithNumber, 'Registration', regPoints, '제안 등록 마일리지');
        }
    };

    const updateProposal = async (id: string, updates: Partial<Proposal>) => {
        // Save to database via API first
        try {
            if (isApiConnected) {
                const { proposalsApi } = await import('../services/apiService');
                await proposalsApi.update(id, updates);
                console.log('✅ Proposal updated in database:', id);
            }
        } catch (error) {
            console.error('❌ Failed to update proposal in DB:', error);
        }

        setProposals(prev => prev.map(p => {
            if (p.id !== id) return p;

            // Safety Guard: Revoke edit permission on Reject or Status Advance
            let safetyUpdates = {};
            if (updates.status === 'Rejected' || updates.status === '1st_Review' || updates.status === 'Dept_Review') {
                safetyUpdates = { canEditDuringReview: false };
            }

            return { ...p, ...updates, ...safetyUpdates };
        }));

        // Trigger Notification on Status Change
        const target = proposals.find(p => p.id === id);
        if (target && updates.status && updates.status !== target.status) {
            const newProposal = { ...target, ...updates } as Proposal;
            // ... (keep notification logic same) ...

            const contextData = {
                users,
                config: settings.emailConfig,
                templates: settings.emailTemplates || [],
                notifySettings: settings.notifications,
                addSystemLog
            };

            if (newProposal.status === '1st_Review') { // Passed Dept Review
                sendInstantNotification('deptReview', newProposal, contextData);

                // Award Dept Pass Mileage (if transitioning from Dept_Review -> 1st_Review)
                // Note: Check previous status to avoid duplicate awards if just updating fields
                if (target.status === 'Dept_Review') {
                    const passPoints = settings.mileageRules.deptPass || 0;
                    if (passPoints > 0) {
                        distributeReward(newProposal, 'Dept_Pass', passPoints, '부서 검토 통과 마일리지');
                    }
                }

            } else if (newProposal.status === 'Rejected') {
                sendInstantNotification('reject', newProposal, contextData);
            } else if (newProposal.status === 'Completed') {
                sendInstantNotification('finalGrade', newProposal, contextData);
            }
        }
    };

    const addMileageLog = async (log: MileageLog) => {
        // Save to database via API
        try {
            if (isApiConnected) {
                const { mileageApi } = await import('../services/apiService');
                await mileageApi.create(log);
                console.log('✅ Mileage log saved to database:', log.id);
            }
        } catch (error) {
            console.error('❌ Failed to save mileage log to DB:', error);
        }

        setMileageLogs(prev => [log, ...prev]);
    };

    const updateMileageLog = (id: string, updates: Partial<MileageLog>) => {
        setMileageLogs(prev => prev.map(log => log.id === id ? { ...log, ...updates } : log));
    };

    const updateSettings = async (updates: Partial<SettingsState>) => {
        // Save to database via API
        try {
            if (isApiConnected) {
                const { settingsApi } = await import('../services/apiService');
                await settingsApi.bulkUpdate(updates);
                console.log('✅ Settings saved to database');
            }
        } catch (error) {
            console.error('❌ Failed to save settings to DB:', error);
        }

        setSettings(prev => ({ ...prev, ...updates }));
    };

    const addUser = (user: User) => setUsers(prev => [...prev, user]);
    const removeUser = (id: string) => setUsers(prev => prev.filter(u => u.id !== id));

    const updateUserRole = async (userId: string, newRole: string) => {
        // Save to database via API
        try {
            if (isApiConnected) {
                const { usersApi } = await import('../services/apiService');
                await usersApi.update(userId, { role: newRole });
                console.log('✅ User role updated in database:', userId);
            }
        } catch (error) {
            console.error('❌ Failed to update user role in DB:', error);
        }

        setUsers(prev => prev.map(u =>
            u.id === userId ? { ...u, role: newRole } : u
        ));

        // Sync currentUser if applicable
        if (currentUser.id === userId) {
            setCurrentUser(prev => ({ ...prev, role: newRole }));
        }

        // Add system log for role change
        const targetUser = users.find(u => u.id === userId);
        if (targetUser) {
            addSystemLog({
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                user: currentUser.name,
                action: 'Role Change',
                details: `${targetUser.name}의 역할을 ${newRole}(으)로 변경`,
                level: 'Info'
            });
        }
    };

    const updateUser = (userId: string, updates: Partial<User>) => {
        setUsers(prev => prev.map(u =>
            u.id === userId ? { ...u, ...updates } : u
        ));

        // Sync currentUser if applicable
        if (currentUser.id === userId) {
            setCurrentUser(prev => ({ ...prev, ...updates }));
        }
    };

    const addDepartment = (dept: Department) => setDepartments(prev => [...prev, dept]);
    const removeDepartment = (id: string) => setDepartments(prev => prev.filter(d => d.id !== id));

    const addSystemLog = (log: SystemLog) => setSystemLogs(prev => [log, ...prev]);

    const addComment = (proposalId: string, content: string) => {
        const newComment: Comment = {
            id: `comment-${Date.now()}`,
            proposalId,
            author: currentUser,
            content,
            createdAt: new Date().toISOString()
        };
        setProposals(prev => prev.map(p =>
            p.id === proposalId
                ? { ...p, comments: [...(p.comments || []), newComment] }
                : p
        ));
    };

    const deleteComment = (proposalId: string, commentId: string) => {
        setProposals(prev => prev.map(p =>
            p.id === proposalId
                ? { ...p, comments: (p.comments || []).filter(c => c.id !== commentId) }
                : p
        ));
    };

    const syncUsersFromOpenProject = async () => {
        if (!settings.openProject.apiKey) {
            throw new Error('API Key is missing');
        }

        try {
            // Dynamically import to avoid circular dependency or context issues if needed
            const { fetchOpenProjectUsers } = await import('../services/openProject');
            const opUsers = await fetchOpenProjectUsers(settings.openProject.apiKey);

            // Merge or Replace users? For now, we'll append unique ones or update existing by ID matches
            // Ideally we might want a full sync. Let's filter out existing MOCK users if we want to replace, 
            // but safer to just add/update.

            setUsers(prev => {
                const newUsers = [...prev];
                opUsers.forEach(opUser => {
                    const index = newUsers.findIndex(u => u.id === opUser.id);
                    if (index >= 0) {
                        // Update existing: PROTECT Identity & Role
                        const existing = newUsers[index];

                        // Merge strategies:
                        // 1. Remote Authoritative: Name, Avatar, Department
                        // 2. Local Authoritative: Role, CanDeptReview, EmailPreferences
                        // 3. Conditional: Email (Remote if present, else Local)

                        const updated = {
                            ...existing,
                            name: opUser.name,
                            avatarUrl: opUser.avatarUrl,
                            department: opUser.department,
                            // Do NOT overwrite role or canDeptReview
                        };

                        if (opUser.email) {
                            updated.email = opUser.email;
                        }

                        // Safety Guard: Force Admin for specific user
                        if (updated.email === 'hyunjin_moon@ashimori.co.kr') {
                            updated.role = 'Admin';
                        }

                        newUsers[index] = updated;
                    } else {
                        // New User: Default Role is User
                        const newUser = { ...opUser };
                        if (newUser.email === 'hyunjin_moon@ashimori.co.kr') {
                            newUser.role = 'Admin';
                        }
                        newUsers.push(newUser);
                    }
                });
                return newUsers;
            });

            // Logic Enhancement: Sync Departments from Users
            // Extract unique departments from the fetched users and add them to the departments list if missing
            const uniqueDepts = Array.from(new Set(opUsers.map(u => u.department || '미지정').filter(d => d && d !== '미지정')));
            console.log(`🏢 [OpenProject Sync] Extracted ${uniqueDepts.length} unique departments:`, uniqueDepts);

            let addedDepts: string[] = [];
            setDepartments(prev => {
                const newDepts = [...prev];
                uniqueDepts.forEach(deptName => {
                    if (!newDepts.some(d => d.name === deptName)) {
                        newDepts.push({
                            id: `dept-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            name: deptName,
                            managerId: '' // Manager mapping logic can be added later
                        });
                        addedDepts.push(deptName);
                    }
                });
                console.log(`🏢 [OpenProject Sync] Added ${addedDepts.length} new departments:`, addedDepts);
                console.log(`🏢 [OpenProject Sync] Total departments now: ${newDepts.length}`);
                return newDepts;
            });

            setSettings(prev => ({
                ...prev,
                openProject: {
                    ...prev.openProject,
                    lastSync: new Date().toISOString()
                }
            }));

            // Save users and departments to database
            try {
                if (isApiConnected) {
                    const { usersApi, departmentsApi } = await import('../services/apiService');

                    // Bulk save/update users
                    for (const opUser of opUsers) {
                        try {
                            await usersApi.create(opUser);
                        } catch {
                            // User might already exist, try update
                            try {
                                await usersApi.update(opUser.id, opUser);
                            } catch (err) {
                                console.warn('Failed to save user:', opUser.id, err);
                            }
                        }
                    }
                    console.log(`✅ Saved ${opUsers.length} users to database`);

                    // Save new departments
                    for (const deptName of uniqueDepts) {
                        try {
                            await departmentsApi.create({
                                id: `dept-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                name: deptName
                            });
                        } catch {
                            // Department might already exist, skip
                        }
                    }
                    console.log(`✅ Synced ${uniqueDepts.length} departments to database`);
                }
            } catch (error) {
                console.error('❌ Failed to save OpenProject sync to DB:', error);
            }

            addSystemLog({
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                user: currentUser.name,
                action: 'OpenProject Sync',
                details: `Synced ${opUsers.length} users from OpenProject`,
                level: 'Info'
            });

        } catch (error) {
            console.error('Sync failed:', error);
            addSystemLog({
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                user: currentUser.name,
                action: 'OpenProject Sync Failed',
                details: error instanceof Error ? error.message : 'Unknown error',
                level: 'Error'
            });
            throw error;
        }
    };

    const syncProjectsFromOpenProject = async () => {
        if (!settings.openProject.apiKey) {
            throw new Error('API Key is missing');
        }

        try {
            const { fetchOpenProjectProjects } = await import('../services/openProject');
            const opProjects = await fetchOpenProjectProjects(settings.openProject.apiKey);

            setSettings(prev => ({
                ...prev,
                openProject: {
                    ...prev.openProject,
                    projects: opProjects, // Update projects list
                    lastSync: new Date().toISOString()
                }
            }));

            addSystemLog({
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                user: currentUser.name,
                action: 'OpenProject Project Sync',
                details: `Synced ${opProjects.length} projects from OpenProject`,
                level: 'Info'
            });

        } catch (error) {
            console.error('Project Sync failed:', error);
            addSystemLog({
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                user: currentUser.name,
                action: 'OpenProject Project Sync Failed',
                details: error instanceof Error ? error.message : 'Unknown error',
                level: 'Error'
            });
            throw error;
        }
    };

    // Multi-reviewer evaluation functions
    const addReviewerEvaluation = (proposalId: string, evaluation: ReviewerEvaluation) => {
        setProposals(prev => prev.map(p => {
            if (p.id !== proposalId) return p;

            const round = evaluation.round;
            const reviewsKey = round === '1st' ? 'reviews1st' : 'reviews2nd';
            const aggregatedKey = round === '1st' ? 'aggregated1st' : 'aggregated2nd';

            // Add to reviews array
            const existingReviews = p[reviewsKey] || [];
            const newReviews = [...existingReviews, evaluation];

            // Calculate aggregated scores
            const criteriaIds = Object.keys(evaluation.scores);
            const averageScores: Record<string, number> = {};

            criteriaIds.forEach(criteriaId => {
                const sum = newReviews.reduce((acc, r) => acc + (r.scores[criteriaId] || 0), 0);
                averageScores[criteriaId] = Math.round((sum / newReviews.length) * 10) / 10;
            });

            const averageTotal = Math.round(
                newReviews.reduce((acc, r) => acc + r.total, 0) / newReviews.length * 10
            ) / 10;

            if (round === '1st') {
                const passed = averageTotal >= settings.evaluationCutoff;
                const requiredReviewers = settings.totalReviewers1st || 1;
                const allReviewersComplete = newReviews.length >= requiredReviewers;

                // Auto-finalize if all required reviewers have submitted
                let newStatus = p.status;
                if (allReviewersComplete) {
                    newStatus = passed ? '2nd_Review' : 'Rejected';
                }

                return {
                    ...p,
                    status: newStatus,
                    reviews1st: newReviews,
                    aggregated1st: {
                        averageScores,
                        averageTotal,
                        passed,
                        reviewerCount: newReviews.length
                    }
                };
            } else {
                // Determine grade based on score thresholds
                let finalGrade = 'P';
                let rewardAmount = 2000;

                for (const grade of settings.grades) {
                    if (grade.minScore && grade.maxScore) {
                        if (averageTotal >= grade.minScore && averageTotal <= grade.maxScore) {
                            finalGrade = grade.id;
                            rewardAmount = grade.rewardAmount || 0;
                            break;
                        }
                    }
                }

                const requiredReviewers = settings.totalReviewers2nd || 1;
                const allReviewersComplete = newReviews.length >= requiredReviewers;

                // Auto-finalize if all required reviewers have submitted
                let newStatus = p.status;
                if (allReviewersComplete) {
                    newStatus = 'Completed';
                }

                const updatedProposal = {
                    ...p,
                    status: newStatus,
                    grade2nd: allReviewersComplete ? finalGrade : p.grade2nd,
                    reviews2nd: newReviews,
                    aggregated2nd: {
                        averageScores,
                        averageTotal,
                        finalGrade,
                        rewardAmount,
                        reviewerCount: newReviews.length
                    }
                };

                // Award Grade Mileage if Completed
                if (newStatus === 'Completed' && p.status !== 'Completed') {
                    const gradePoints = settings.grades.find(g => g.id === finalGrade)?.mileagePoints || 0;
                    if (gradePoints > 0) {
                        // We use setTimeout to ensure state update has processed if needed, or just call directly.
                        // Here we need to call distributeReward but we can't because we are INSIDE setProposals updater!
                        // This is an issue. 'distributeReward' calls 'addMileageLog' which calls 'setMileageLogs'.
                        // Calling setState inside another setState updater is generally fine in React 18, but logic-wise...
                        // We should trigger a side effect or do it outside.
                    }
                }

                return updatedProposal;
            }
        }));

        // Side Effect for Grade Reward: Since we can't easily do async dispatch inside map,
        // we'll duplicate the "Check Completion" logic outside or use a useEffect on proposals change?
        // Using useEffect is cleaner to catch "Status changed to Completed".
        // But we already have a notification trigger in updateProposal. 
        // THIS function `addReviewerEvaluation` updates state directly.
        // It DOES NOT call `updateProposal`. 

        // Solution: We should move the "Completion Check" logic to a separate effect or
        // Just execute it here by reading the *calculated* values.

        // Let's re-read the state afterwards? No.
        // We will execute the reward AFTER setProposals.
        // But we need the computed 'finalGrade' and 'updatedProposal'.

        // BETTER APPROACH:
        // Calculate the update first.
        // Then setProposals.
        // Then if completed, call distributeReward.
    };

    const getReviewerCount = (proposalId: string, round: '1st' | '2nd'): number => {
        const proposal = proposals.find(p => p.id === proposalId);
        if (!proposal) return 0;

        const reviews = round === '1st' ? proposal.reviews1st : proposal.reviews2nd;
        return reviews?.length || 0;
    };

    const hasUserReviewed = (proposalId: string, userId: string, round: '1st' | '2nd'): boolean => {
        const proposal = proposals.find(p => p.id === proposalId);
        if (!proposal) return false;

        const reviews = round === '1st' ? proposal.reviews1st : proposal.reviews2nd;
        return reviews?.some(r => r.reviewerId === userId) || false;
    };

    // Unified Comment System
    const distributeReward = (proposal: Proposal, type: MileageLog['type'], totalPoints: number, description: string) => {
        // Registration points go ONLY to the proposer (simplified)
        if (type === 'Registration') {
            addMileageLog({
                id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                userId: proposal.proposer.id,
                userName: proposal.proposer.name,
                department: proposal.proposer.department,
                proposalId: proposal.id,
                proposalTitle: proposal.title,
                type: type,
                points: totalPoints,
                date: new Date().toISOString().split('T')[0],
                status: 'Accrued',
                description: `${description}`
            });
            return;
        }

        // For other types (Dept_Pass, Grades, etc.), distribute based on contribution ratio
        const contributors = proposal.contributors && proposal.contributors.length > 0
            ? proposal.contributors
            : [{ id: proposal.proposer.id, name: proposal.proposer.name, department: proposal.proposer.department, type: 'Proposer' as const, ratio: 100 }];

        console.log(`[Reward] Distributing ${totalPoints} points for ${proposal.id} (${type})`);

        contributors.forEach(contributor => {
            if (contributor.ratio > 0) {
                let share = Math.round(totalPoints * (contributor.ratio / 100));

                if (share > 0) {
                    addMileageLog({
                        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        userId: contributor.id,
                        userName: contributor.name,
                        department: contributor.department,
                        proposalId: proposal.id,
                        proposalTitle: proposal.title,
                        type: type,
                        points: share,
                        date: new Date().toISOString().split('T')[0],
                        status: 'Accrued',
                        description: `${description} (기여율: ${contributor.ratio}%)`
                    });
                }
            }
        });
    };

    const addManualMileageLog = (userId: string, points: number, reason: string) => {
        const user = users.find(u => u.id === userId);
        if (!user) return;

        addMileageLog({
            id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            userId: user.id,
            userName: user.name,
            department: user.department || 'Unknown',
            type: 'Bonus', // New type needed or re-use? Let's use generic string or add to type mapping
            points: points,
            date: new Date().toISOString().split('T')[0],
            status: 'Accrued',
            description: reason
        });

        addSystemLog({
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            user: currentUser.name,
            action: 'Manual Mileage Adjustment',
            details: `Admin added ${points} points to ${user.name}. Reason: ${reason}`,
            level: 'Warning'
        });
    };

    const voidMileageLog = (logId: string, reason: string) => {
        setMileageLogs(prev => prev.map(log =>
            log.id === logId ? { ...log, status: 'Cancelled', description: `${log.description} (Voided: ${reason})` } : log
        ));

        const log = mileageLogs.find(l => l.id === logId);
        if (log) {
            addSystemLog({
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                user: currentUser.name,
                action: 'Mileage Voided',
                details: `Admin voided log ${logId} (${log.points} pts). Reason: ${reason}`,
                level: 'Warning'
            });
        }
    };

    const deleteMileageLog = async (logId: string) => {
        const log = mileageLogs.find(l => l.id === logId);
        setMileageLogs(prev => prev.filter(l => l.id !== logId));

        // Persist to database
        try {
            const { mileageApi } = await import('../services/apiService');
            await mileageApi.delete(logId);
        } catch (error) {
            console.error('Failed to delete mileage log:', error);
        }

        if (log) {
            addSystemLog({
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                user: currentUser.name,
                action: 'Mileage Deleted',
                details: `Admin deleted log ${logId} (${log.points} pts, ${log.userName})`,
                level: 'Warning'
            });
        }
    };

    const bulkDeleteMileageLogs = async (logIds: string[]) => {
        const deletedCount = logIds.length;
        setMileageLogs(prev => prev.filter(l => !logIds.includes(l.id)));

        // Persist to database
        try {
            const { mileageApi } = await import('../services/apiService');
            for (const id of logIds) {
                await mileageApi.delete(id);
            }
        } catch (error) {
            console.error('Failed to bulk delete mileage logs:', error);
        }

        addSystemLog({
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            user: currentUser.name,
            action: 'Bulk Mileage Delete',
            details: `Admin deleted ${deletedCount} mileage log(s)`,
            level: 'Warning'
        });
    };

    const processSelectedPayouts = (logIds: string[]) => {
        setMileageLogs(prev => prev.map(log =>
            logIds.includes(log.id) && log.status === 'Accrued' ? { ...log, status: 'Paid' } : log
        ));

        addSystemLog({
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            user: currentUser.name,
            action: 'Batch Payout',
            details: `Admin processed payout for ${logIds.length} transactions.`,
            level: 'Info'
        });
    };

    const agreeToContribution = (proposalId: string) => {
        setProposals(prev => prev.map(p => {
            if (p.id !== proposalId) return p;

            const updatedContributors = p.contributors?.map(c =>
                c.id === currentUser.id
                    ? { ...c, hasAgreed: true, agreedAt: new Date().toISOString() }
                    : c
            );

            return {
                ...p,
                contributors: updatedContributors
            };
        }));

        addSystemLog({
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            user: currentUser.name,
            action: 'Contribution Agreed',
            details: `User ${currentUser.name} agreed to contribution ratio for proposal ${proposalId}`,
            level: 'Info'
        });
    };

    const addUnifiedComment = (proposalId: string, comment: Omit<UnifiedComment, 'id' | 'createdAt'>) => {
        const newComment: UnifiedComment = {
            ...comment,
            id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
        };

        setProposals(prev => prev.map(p => {
            if (p.id !== proposalId) return p;
            return {
                ...p,
                unifiedComments: [...(p.unifiedComments || []), newComment]
            };
        }));

        // Also create notification for relevant users
        const proposal = proposals.find(p => p.id === proposalId);
        if (proposal && proposal.proposer.id !== currentUser.id) {
            addNotification({
                recipientId: proposal.proposer.id,
                type: 'new_comment',
                proposalId,
                proposalTitle: proposal.title,
                message: `${currentUser.name}님이 제안에 코멘트를 달았습니다.`,
                link: `/proposals/${proposalId}`
            });
        }
    };

    const replyToComment = (proposalId: string, parentId: string, content: string) => {
        addUnifiedComment(proposalId, {
            proposalId,
            authorId: currentUser.id,
            authorName: currentUser.name,
            authorRole: currentUser.role,
            type: 'reply',
            parentId,
            content,
            visibility: 'public',
        });
    };

    // Revision System
    const createRevision = (proposalId: string, changeNote?: string) => {
        const proposal = proposals.find(p => p.id === proposalId);
        if (!proposal) return;

        const newVersion = (proposal.currentVersion || 1) + 1;
        const newRevision: ProposalRevision = {
            id: `rev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            proposalId,
            version: proposal.currentVersion || 1,
            createdAt: new Date().toISOString(),
            createdBy: currentUser.id,
            createdByName: currentUser.name,
            changeNote,
            snapshot: {
                title: proposal.title,
                summary: proposal.summary,
                currentProblem: proposal.currentProblem || '',
                improvementPlan: proposal.improvementPlan || '',
                expectedEffect: proposal.expectedEffect || '',
                expectedAmount: proposal.expectedAmount,
            }
        };

        setProposals(prev => prev.map(p => {
            if (p.id !== proposalId) return p;
            return {
                ...p,
                revisions: [...(p.revisions || []), newRevision],
                currentVersion: newVersion,
            };
        }));
    };

    const requestSupplement = (proposalId: string, reason: string) => {
        const proposal = proposals.find(p => p.id === proposalId);
        if (!proposal) return;

        const deadline = new Date();
        deadline.setDate(deadline.getDate() + (settings.supplementDeadlineDays || 7));

        const newRequest: SupplementRequest = {
            id: `supp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            proposalId,
            requestedBy: currentUser.id,
            requestedByName: currentUser.name,
            requestedAt: new Date().toISOString(),
            deadline: deadline.toISOString(),
            reason,
            status: 'pending',
        };

        setProposals(prev => prev.map(p => {
            if (p.id !== proposalId) return p;
            return {
                ...p,
                status: 'Modification_Requested', // Force status update
                supplementRequests: [...(p.supplementRequests || []), newRequest],
                canEditDuringReview: true,
            };
        }));

        // Add unified comment for the supplement request
        addUnifiedComment(proposalId, {
            proposalId,
            authorId: currentUser.id,
            authorName: currentUser.name,
            authorRole: currentUser.role,
            type: 'supplement_request',
            content: reason,
            visibility: 'public',
        });

        // Notify proposer
        addNotification({
            recipientId: proposal.proposer.id,
            type: 'supplement_request',
            proposalId,
            proposalTitle: proposal.title,
            message: `${currentUser.name}님이 보완 요청을 했습니다. 기한: ${deadline.toLocaleDateString('ko-KR')}`,
            link: `/proposals/${proposalId}/edit`
        });

        // Trigger email notification
        sendInstantNotification('deptReview', proposal, {
            users,
            config: settings.emailConfig,
            templates: settings.emailTemplates,
            notifySettings: settings.notifications,
            addSystemLog
        }).catch(console.error);
    };

    const completeSupplementRequest = (proposalId: string, requestId: string, revisionId: string) => {
        setProposals(prev => prev.map(p => {
            if (p.id !== proposalId) return p;
            return {
                ...p,
                supplementRequests: p.supplementRequests?.map(req =>
                    req.id === requestId
                        ? { ...req, status: 'completed' as const, completedAt: new Date().toISOString(), revisionId }
                        : req
                ),
                canEditDuringReview: false,
            };
        }));

        // Notify the requester
        const proposal = proposals.find(p => p.id === proposalId);
        const request = proposal?.supplementRequests?.find(r => r.id === requestId);
        if (proposal && request) {
            addNotification({
                recipientId: request.requestedBy,
                type: 'supplement_completed',
                proposalId,
                proposalTitle: proposal.title,
                message: `${currentUser.name}님이 보완을 완료했습니다.`,
                link: `/proposals/${proposalId}`
            });
        }
    };

    // Notification System
    const addNotification = (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
        const newNotification: Notification = {
            ...notification,
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
            read: false,
        };

        setNotifications(prev => [newNotification, ...prev]);
    };

    const markNotificationRead = (notificationId: string) => {
        setNotifications(prev => prev.map(n =>
            n.id === notificationId ? { ...n, read: true } : n
        ));
    };

    const markAllNotificationsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const getUnreadNotificationCount = (): number => {
        return notifications.filter(n => !n.read && n.recipientId === currentUser.id).length;
    };

    // Admin Proposal Management Functions
    const softDeleteProposal = async (proposalId: string, reason?: string) => {
        const updateData = {
            isDeleted: true,
            deletedAt: new Date().toISOString(),
            deletedBy: currentUser.name,
            deletedReason: reason,
        };

        // Update local state immediately
        setProposals(prev => prev.map(p =>
            p.id === proposalId ? { ...p, ...updateData } : p
        ));

        // Persist to database
        try {
            const { proposalsApi } = await import('../services/apiService');
            await proposalsApi.update(proposalId, updateData);
        } catch (error) {
            console.error('Failed to persist delete:', error);
        }

        addSystemLog({
            id: `log_${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: `제안 삭제: ${proposalId}`,
            user: currentUser.name,
            details: reason || '사유 없음',
            level: 'Info',
        });
    };

    const archiveProposal = async (proposalId: string, reason?: string) => {
        const updateData = {
            isArchived: true,
            archivedAt: new Date().toISOString(),
            archivedBy: currentUser.name,
            archivedReason: reason,
        };

        // Update local state immediately
        setProposals(prev => prev.map(p =>
            p.id === proposalId ? { ...p, ...updateData } : p
        ));

        // Persist to database
        try {
            const { proposalsApi } = await import('../services/apiService');
            await proposalsApi.update(proposalId, updateData);
        } catch (error) {
            console.error('Failed to persist archive:', error);
        }

        addSystemLog({
            id: `log_${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: `제안 보관: ${proposalId}`,
            user: currentUser.name,
            details: reason || '사유 없음',
            level: 'Info',
        });
    };

    const hideProposal = async (proposalId: string) => {
        setProposals(prev => prev.map(p =>
            p.id === proposalId ? { ...p, isHidden: true } : p
        ));

        // Persist to database
        try {
            const { proposalsApi } = await import('../services/apiService');
            await proposalsApi.update(proposalId, { isHidden: true });
        } catch (error) {
            console.error('Failed to persist hide:', error);
        }
    };

    const unhideProposal = async (proposalId: string) => {
        setProposals(prev => prev.map(p =>
            p.id === proposalId ? { ...p, isHidden: false } : p
        ));

        // Persist to database
        try {
            const { proposalsApi } = await import('../services/apiService');
            await proposalsApi.update(proposalId, { isHidden: false });
        } catch (error) {
            console.error('Failed to persist unhide:', error);
        }
    };

    const restoreProposal = async (proposalId: string) => {
        const updateData = {
            isDeleted: false,
            isArchived: false,
            deletedAt: null,
            deletedBy: null,
            deletedReason: null,
            archivedAt: null,
            archivedBy: null,
            archivedReason: null,
        };

        setProposals(prev => prev.map(p => {
            if (p.id !== proposalId) return p;
            return {
                ...p,
                isDeleted: false,
                isArchived: false,
                deletedAt: undefined,
                deletedBy: undefined,
                deletedReason: undefined,
                archivedAt: undefined,
                archivedBy: undefined,
                archivedReason: undefined,
            };
        }));

        // Persist to database
        try {
            const { proposalsApi } = await import('../services/apiService');
            await proposalsApi.update(proposalId, updateData);
        } catch (error) {
            console.error('Failed to persist restore:', error);
        }
        addSystemLog({
            id: `log_${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: `제안 복원: ${proposalId}`,
            user: currentUser.name,
            details: '',
            level: 'Info',
        });
    };

    const forceStatusChange = (proposalId: string, newStatus: ProposalStatus) => {
        setProposals(prev => prev.map(p =>
            p.id === proposalId ? { ...p, status: newStatus } : p
        ));
        addSystemLog({
            id: `log_${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: `상태 강제 변경: ${proposalId} -> ${newStatus}`,
            user: currentUser.name,
            details: '',
            level: 'Info',
        });
    };

    const transferOwnership = (proposalId: string, newOwnerId: string, newOwnerName: string) => {
        setProposals(prev => prev.map(p => {
            if (p.id !== proposalId) return p;
            return {
                ...p,
                proposer: { ...p.proposer, id: newOwnerId, name: newOwnerName },
            };
        }));
        addSystemLog({
            id: `log_${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: `소유권 이전: ${proposalId} -> ${newOwnerName}`,
            user: currentUser.name,
            details: '',
            level: 'Info',
        });
    };

    const bulkArchive = (proposalIds: string[], reason?: string) => {
        proposalIds.forEach(id => archiveProposal(id, reason));
    };

    const bulkDelete = (proposalIds: string[], reason?: string) => {
        proposalIds.forEach(id => softDeleteProposal(id, reason));
    };

    const updateCoAuthors = (proposalId: string, coAuthors: { id: string; name: string; department: string }[]) => {
        setProposals(prev => prev.map(p => {
            if (p.id !== proposalId) return p;
            return {
                ...p,
                coAuthors
            };
        }));
        addSystemLog({
            id: `log_${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: `공동 제안자 수정: ${proposalId}`,
            user: currentUser.name,
            details: `인원: ${coAuthors.length}명`,
            level: 'Info',
        });
    };

    // Completion Report Functions
    const submitCompletionReport = (proposalId: string, reportData: Omit<CompletionReport, 'id'>) => {
        const newReport: CompletionReport = {
            ...reportData,
            id: `rep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        };

        setProposals(prev => prev.map(p => {
            if (p.id !== proposalId) return p;
            return {
                ...p,
                completionReport: newReport,
            };
        }));

        const proposal = proposals.find(p => p.id === proposalId);
        if (proposal) {
            addSystemLog({
                id: `log_${Date.now()}`,
                timestamp: new Date().toISOString(),
                action: '완료 보고 제출',
                user: currentUser.name,
                details: `제안: ${proposal.title}, 금액: ${reportData.actualSavingAmount}`,
                level: 'Info'
            });

            // Notify Admins? (Optional, but good practice)
        }
    };

    const evaluateCompletionReport = (proposalId: string, recognizedPercentage: number, comment: string) => {
        const proposal = proposals.find(p => p.id === proposalId);
        if (!proposal || !proposal.completionReport) return;

        const actualAmount = proposal.completionReport.actualSavingAmount;
        // Formula: (Annual Saving * 1% * 3 Years) / 1000 = Points
        // Apply Recognized Percentage
        const finalRecognizedAmount = Math.floor(actualAmount * (recognizedPercentage / 100));
        const totalCheckingAmount = finalRecognizedAmount * 3; // 3 Years
        const rewardPoints = Math.floor((totalCheckingAmount * 0.01) / 1000);

        setProposals(prev => prev.map(p => {
            if (p.id !== proposalId) return p;
            if (!p.completionReport) return p;

            return {
                ...p,
                completionReport: {
                    ...p.completionReport,
                    status: recognizedPercentage > 0 ? 'Approved' : 'Rejected',
                    recognizedPercentage,
                    finalRecognizedAmount,
                    reviewComment: comment,
                    reviewedBy: currentUser.name,
                    reviewedAt: new Date().toISOString()
                }
            };
        }));

        // Award Mileage
        if (rewardPoints > 0) {
            addMileageLog({
                id: `log_${Date.now()}`,
                userId: proposal.proposer.id,
                userName: proposal.proposer.name,
                department: proposal.proposer.department,
                proposalId: proposal.id,
                proposalTitle: proposal.title,
                type: 'Cost_Saving_Reward',
                points: rewardPoints,
                date: new Date().toISOString(),
                status: 'Accrued'
            });

            addNotification({
                recipientId: proposal.proposer.id,
                type: 'status_change', // Reusing status_change or creating a new type
                proposalId,
                proposalTitle: proposal.title,
                message: `성과 심사가 완료되었습니다. ${rewardPoints}P가 지급되었습니다.`,
                link: `/proposals/${proposalId}`
            });
        }
    };

    // Persist notifications to localStorage
    useEffect(() => {
        localStorage.setItem('ideaflow_notifications', JSON.stringify(notifications));
    }, [notifications]);

    return (
        <ProposalContext.Provider value={{
            proposals,
            mileageLogs,
            currentUser,
            settings,
            notifications,
            addProposal,
            updateProposal,
            addMileageLog,
            updateMileageLog,
            addManualMileageLog,
            voidMileageLog,
            deleteMileageLog,
            bulkDeleteMileageLogs,
            processSelectedPayouts,
            payoutBatches,
            updateSettings,
            setCurrentUser,
            users,
            departments,
            systemLogs,
            addUser,
            removeUser,
            updateUserRole,
            updateUser,
            addDepartment,
            removeDepartment,
            addSystemLog,
            addComment,
            deleteComment,
            syncUsersFromOpenProject,
            syncProjectsFromOpenProject,
            addReviewerEvaluation,
            getReviewerCount,
            hasUserReviewed,
            // Unified Comment System
            addUnifiedComment,
            replyToComment,
            // Revision System
            createRevision,
            requestSupplement,
            completeSupplementRequest,
            // Notification System
            addNotification,
            markNotificationRead,
            markAllNotificationsRead,
            getUnreadNotificationCount,
            // Admin Proposal Management
            softDeleteProposal,
            archiveProposal,
            hideProposal,
            unhideProposal,
            restoreProposal,
            forceStatusChange,
            transferOwnership,
            bulkArchive,

            bulkDelete,
            updateCoAuthors,
            submitCompletionReport,
            evaluateCompletionReport,
        }}>
            {children}
        </ProposalContext.Provider>
    );
};

export const useProposalStore = () => {
    const context = useContext(ProposalContext);
    if (context === undefined) {
        throw new Error('useProposalStore must be used within a ProposalProvider');
    }
    return context;
};
