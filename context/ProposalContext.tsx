import React, { createContext, useContext, useState, useEffect } from 'react';
import { Proposal, MileageLog, User, Department, SystemLog, Comment, SettingsState, ReviewerEvaluation } from '../types';
import { sendInstantNotification } from '../services/notificationService';
import { MOCK_PROPOSALS, MOCK_MILEAGE_LOGS, CURRENT_USER } from '../constants';

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
    addProposal: (proposal: Proposal) => void;
    updateProposal: (id: string, updates: Partial<Proposal>) => void;
    addMileageLog: (log: MileageLog) => void;
    updateMileageLog: (id: string, updates: Partial<MileageLog>) => void;
    updateSettings: (updates: Partial<SettingsState>) => void;
    setCurrentUser: (user: User) => void;
    addUser: (user: User) => void;
    removeUser: (id: string) => void;
    updateUserRole: (userId: string, newRole: string) => void;
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
}

const ProposalContext = createContext<ProposalContextType | undefined>(undefined);

export const ProposalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Initialize state from localStorage or fall back to constants
    const [proposals, setProposals] = useState<Proposal[]>(() => {
        const saved = localStorage.getItem('ideaflow_proposals');
        return saved ? JSON.parse(saved) : MOCK_PROPOSALS;
    });

    const [mileageLogs, setMileageLogs] = useState<MileageLog[]>(() => {
        const saved = localStorage.getItem('ideaflow_mileage');
        return saved ? JSON.parse(saved) : MOCK_MILEAGE_LOGS;
    });

    const [currentUser, setCurrentUser] = useState<User>(() => {
        const saved = localStorage.getItem('ideaflow_user');
        return saved ? JSON.parse(saved) : CURRENT_USER;
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
        };
        if (saved) {
            const parsed = JSON.parse(saved);
            // Merge with defaults to ensure new fields exist
            return { ...defaults, ...parsed };
        }
        return defaults;
    });


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


    // Actions
    const addProposal = (proposal: Proposal) => {
        setProposals(prev => [proposal, ...prev]);

        // Trigger Notification: New Proposal
        if (settings.notifications.newProposal) {
            sendInstantNotification('newProposal', proposal, {
                users,
                config: settings.emailConfig,
                templates: settings.emailTemplates || [],
                notifySettings: settings.notifications,
                addSystemLog
            });
        }
    };

    const updateProposal = (id: string, updates: Partial<Proposal>) => {
        setProposals(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));

        // Trigger Notification on Status Change
        const target = proposals.find(p => p.id === id);
        if (target && updates.status && updates.status !== target.status) {
            const newProposal = { ...target, ...updates } as Proposal;
            const contextData = {
                users,
                config: settings.emailConfig,
                templates: settings.emailTemplates || [],
                notifySettings: settings.notifications,
                addSystemLog
            };

            if (newProposal.status === '1st_Review') { // Passed Dept Review
                sendInstantNotification('deptReview', newProposal, contextData);
            } else if (newProposal.status === 'Rejected') {
                sendInstantNotification('reject', newProposal, contextData);
            } else if (newProposal.status === 'Completed') {
                sendInstantNotification('finalGrade', newProposal, contextData);
            }
        }
    };

    const addMileageLog = (log: MileageLog) => {
        setMileageLogs(prev => [log, ...prev]);
    };

    const updateMileageLog = (id: string, updates: Partial<MileageLog>) => {
        setMileageLogs(prev => prev.map(log => log.id === id ? { ...log, ...updates } : log));
    };

    const updateSettings = (updates: Partial<SettingsState>) => {
        setSettings(prev => ({ ...prev, ...updates }));
    };

    const addUser = (user: User) => setUsers(prev => [...prev, user]);
    const removeUser = (id: string) => setUsers(prev => prev.filter(u => u.id !== id));

    const updateUserRole = (userId: string, newRole: string) => {
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

            setDepartments(prev => {
                const newDepts = [...prev];
                uniqueDepts.forEach(deptName => {
                    if (!newDepts.some(d => d.name === deptName)) {
                        newDepts.push({
                            id: `dept-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            name: deptName,
                            managerId: '' // Manager mapping logic can be added later
                        });
                    }
                });
                return newDepts;
            });

            setSettings(prev => ({
                ...prev,
                openProject: {
                    ...prev.openProject,
                    lastSync: new Date().toISOString()
                }
            }));

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
                return {
                    ...p,
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

                return {
                    ...p,
                    reviews2nd: newReviews,
                    aggregated2nd: {
                        averageScores,
                        averageTotal,
                        finalGrade,
                        rewardAmount,
                        reviewerCount: newReviews.length
                    }
                };
            }
        }));
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

    return (
        <ProposalContext.Provider value={{
            proposals,
            mileageLogs,
            currentUser,
            settings,
            addProposal,
            updateProposal,
            addMileageLog,
            updateMileageLog,
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
            hasUserReviewed
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
