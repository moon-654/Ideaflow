/**
 * Role and Permission Configuration
 * Defines what each role can access in the IdeaFlow system
 */

export type Role = 'User' | 'Reviewer' | 'Admin' | '1차 심의위원' | '2차 심의위원';

export interface Permission {
    // Dashboard & General
    viewDashboard: boolean;
    viewAllProposals: boolean;

    // Proposal Management
    submitProposal: boolean;
    editOwnProposal: boolean;
    deleteOwnProposal: boolean;

    // Review & Evaluation
    deptReview: boolean;
    firstReview: boolean;
    secondReview: boolean;

    // Administration
    manageUsers: boolean;
    manageDepartments: boolean;
    manageSettings: boolean;
    viewSystemLogs: boolean;
    assignRoles: boolean;
}

/**
 * Role-based permission mapping
 */
export const ROLE_PERMISSIONS: Record<Role, Permission> = {
    User: {
        viewDashboard: true,
        viewAllProposals: true,
        submitProposal: true,
        editOwnProposal: true,
        deleteOwnProposal: false,
        deptReview: false,
        firstReview: false,
        secondReview: false,
        manageUsers: false,
        manageDepartments: false,
        manageSettings: false,
        viewSystemLogs: false,
        assignRoles: false,
    },
    Reviewer: {
        viewDashboard: true,
        viewAllProposals: true,
        submitProposal: true,
        editOwnProposal: true,
        deleteOwnProposal: false,
        deptReview: true,
        firstReview: true,
        secondReview: true,
        manageUsers: false,
        manageDepartments: false,
        manageSettings: false,
        viewSystemLogs: false,
        assignRoles: false,
    },
    '1차 심의위원': {
        viewDashboard: true,
        viewAllProposals: true,
        submitProposal: true,
        editOwnProposal: true,
        deleteOwnProposal: false,
        deptReview: false, // Override by canDeptReview
        firstReview: true, // Access to Evaluation page
        secondReview: false,
        manageUsers: false,
        manageDepartments: false,
        manageSettings: false,
        viewSystemLogs: false,
        assignRoles: false,
    },
    '2차 심의위원': {
        viewDashboard: true,
        viewAllProposals: true,
        submitProposal: true,
        editOwnProposal: true,
        deleteOwnProposal: false,
        deptReview: false, // Override by canDeptReview
        firstReview: true, // Access to Evaluation page (Routing requires firstReview per App.tsx, logic handles tabs)
        secondReview: true,
        manageUsers: false,
        manageDepartments: false,
        manageSettings: false,
        viewSystemLogs: false,
        assignRoles: false,
    },
    Admin: {
        viewDashboard: true,
        viewAllProposals: true,
        submitProposal: true,
        editOwnProposal: true,
        deleteOwnProposal: true,
        deptReview: true,
        firstReview: true,
        secondReview: true,
        manageUsers: true,
        manageDepartments: true,
        manageSettings: true,
        viewSystemLogs: true,
        assignRoles: true,
    },
};

/**
 * Get permissions for a given role
 */
export const getPermissions = (role: string): Permission => {
    // Check if role exists in mapping, otherwise default to User
    if (Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, role)) {
        return ROLE_PERMISSIONS[role as Role];
    }
    return ROLE_PERMISSIONS.User;
};

/**
 * Check if a role has a specific permission
 */
export const hasPermission = (role: string, permission: keyof Permission): boolean => {
    const permissions = getPermissions(role);
    return permissions[permission];
};

/**
 * Available roles for assignment
 */
export const AVAILABLE_ROLES: Role[] = ['User', 'Reviewer', 'Admin', '1차 심의위원', '2차 심의위원'];

/**
 * Role display names
 */
export const ROLE_DISPLAY_NAMES: Record<Role, string> = {
    User: '일반 사용자',
    Reviewer: '심사위원',
    Admin: '관리자',
    '1차 심의위원': '1차 심의위원',
    '2차 심의위원': '2차 심의위원',
};
