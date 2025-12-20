/**
 * Role and Permission Configuration
 * Defines what each role can access in the IdeaFlow system
 */

export type Role = 'User' | 'Reviewer' | 'Admin';

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
    const normalizedRole = role as Role;
    return ROLE_PERMISSIONS[normalizedRole] || ROLE_PERMISSIONS.User;
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
export const AVAILABLE_ROLES: Role[] = ['User', 'Reviewer', 'Admin'];

/**
 * Role display names (Korean)
 */
export const ROLE_DISPLAY_NAMES: Record<Role, string> = {
    User: '일반 사용자',
    Reviewer: '심사위원',
    Admin: '관리자',
};
