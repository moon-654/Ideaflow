import React from 'react';
import { Navigate } from 'react-router-dom';
import { useProposalStore } from '../context/ProposalContext';
import { hasPermission, Permission } from '../config/permissions';
import { toast } from 'sonner';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredPermission?: keyof Permission;
    allowedRoles?: string[];
    redirectTo?: string;
}

/**
 * Route protection component that checks user permissions or roles
 * Redirects to specified path (default: dashboard) if permission is denied
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    requiredPermission,
    allowedRoles,
    redirectTo = '/'
}) => {
    const { currentUser } = useProposalStore();

    let hasAccess = false;

    // 1. Check Specific Roles if provided
    if (allowedRoles && allowedRoles.length > 0) {
        hasAccess = allowedRoles.includes(currentUser.role);
    }
    // 2. Check Permission if provided and no specific role check passed yet
    else if (requiredPermission) {
        hasAccess = hasPermission(currentUser.role, requiredPermission);
    }

    // Override for Dept Review based on user-specific canDeptReview
    if (requiredPermission === 'deptReview' && currentUser.canDeptReview) {
        hasAccess = true;
    }

    if (!hasAccess) {
        // Show toast notification about access denied
        toast.error('해당 페이지에 접근 권한이 없습니다.', {
            id: 'access-denied', // Prevent duplicate toasts
            duration: 3000,
        });

        return <Navigate to={redirectTo} replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
