import React, { createContext, useContext, useState, useEffect } from 'react';
import { Proposal, MileageLog, User, Department, SystemLog } from '../types';
import { MOCK_PROPOSALS, MOCK_MILEAGE_LOGS, CURRENT_USER } from '../constants';

const MOCK_USERS: User[] = [
    { id: 'user1', name: '김철수', role: 'User', department: '생산관리팀', avatarUrl: '' },
    { id: 'user2', name: '이영희', role: 'Reviewer', department: '인사팀', avatarUrl: '' },
    { id: 'user3', name: '박민수', role: 'Admin', department: 'IT지원팀', avatarUrl: '' },
];

const MOCK_DEPARTMENTS: Department[] = [
    { id: 'dept1', name: '생산관리팀', managerId: 'user1' },
    { id: 'dept2', name: '인사팀', managerId: 'user2' },
    { id: 'dept3', name: 'IT지원팀', managerId: 'user3' },
    { id: 'dept4', name: '영업팀', managerId: '' },
];

interface SettingsState {
    notifications: {
        newProposal: boolean;
        deptReview: boolean;
        reject: boolean;
        finalGrade: boolean;
    };
    mileageRules: {
        registration: number;
        deptPass: number;
        gradeS: number;
        gradeA: number;
        gradeB: number;
        gradeC: number;
    };
    members: Array<{ id: number; name: string; dept: string; role: string }>;
}

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
    addDepartment: (dept: Department) => void;
    removeDepartment: (id: string) => void;
    addSystemLog: (log: SystemLog) => void;
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
        return saved ? JSON.parse(saved) : {
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
            members: [
                { id: 1, name: '김철수 팀장', dept: '인사팀', role: '1차 심의위원' },
                { id: 2, name: '박영희 상무', dept: '경영지원본부', role: '2차 심의위원' },
                { id: 3, name: '최민수 수석', dept: '기술연구소', role: '1차 심의위원' },
            ]
        };
    });

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

    // Actions
    const addProposal = (proposal: Proposal) => {
        setProposals(prev => [proposal, ...prev]);
    };

    const updateProposal = (id: string, updates: Partial<Proposal>) => {
        setProposals(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
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

    const addDepartment = (dept: Department) => setDepartments(prev => [...prev, dept]);
    const removeDepartment = (id: string) => setDepartments(prev => prev.filter(d => d.id !== id));

    const addSystemLog = (log: SystemLog) => setSystemLogs(prev => [log, ...prev]);

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
            addDepartment,
            removeDepartment,
            addSystemLog
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
