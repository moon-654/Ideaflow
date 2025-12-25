// API Service Layer for IdeaFlow
// Replaces localStorage with backend API calls

const API_BASE = '/api';

// Generic fetch wrapper with error handling
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${url}`, {
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
        ...options,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
}

// ============================================
// Users API
// ============================================
export const usersApi = {
    getAll: () => apiFetch<any[]>('/users'),
    getById: (id: string) => apiFetch<any>(`/users/${id}`),
    create: (data: any) => apiFetch<any>('/users', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => apiFetch<any>(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    }),
    delete: (id: string) => apiFetch<any>(`/users/${id}`, {
        method: 'DELETE',
    }),
};

// ============================================
// Departments API
// ============================================
export const departmentsApi = {
    getAll: () => apiFetch<any[]>('/departments'),
    create: (data: any) => apiFetch<any>('/departments', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    delete: (id: string) => apiFetch<any>(`/departments/${id}`, {
        method: 'DELETE',
    }),
};

// ============================================
// Proposals API
// ============================================
export const proposalsApi = {
    getAll: () => apiFetch<any[]>('/proposals'),
    getById: (id: string) => apiFetch<any>(`/proposals/${id}`),
    create: (data: any) => apiFetch<any>('/proposals', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => apiFetch<any>(`/proposals/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    }),
    delete: (id: string, reason?: string, deletedBy?: string) => apiFetch<any>(`/proposals/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason, deletedBy }),
    }),

    // Nested resources
    addReview: (proposalId: string, data: any) => apiFetch<any>(`/proposals/${proposalId}/reviews`, {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    addComment: (proposalId: string, data: any) => apiFetch<any>(`/proposals/${proposalId}/comments`, {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    createRevision: (proposalId: string, data: any) => apiFetch<any>(`/proposals/${proposalId}/revisions`, {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    addSupplement: (proposalId: string, data: any) => apiFetch<any>(`/proposals/${proposalId}/supplements`, {
        method: 'POST',
        body: JSON.stringify(data),
    }),
};

// ============================================
// Mileage API
// ============================================
export const mileageApi = {
    getAll: () => apiFetch<any[]>('/mileage'),
    getByUser: (userId: string) => apiFetch<any[]>(`/mileage/user/${userId}`),
    create: (data: any) => apiFetch<any>('/mileage', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => apiFetch<any>(`/mileage/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    }),
    processPayout: (logIds: string[], processedBy: string) => apiFetch<any>('/mileage/payout', {
        method: 'POST',
        body: JSON.stringify({ logIds, processedBy }),
    }),
};

// ============================================
// Settings API
// ============================================
export const settingsApi = {
    getAll: () => apiFetch<any>('/settings'),
    get: (key: string) => apiFetch<any>(`/settings/${key}`),
    update: (key: string, value: any) => apiFetch<any>(`/settings/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ value }),
    }),
    bulkUpdate: (settings: Record<string, any>) => apiFetch<any>('/settings/bulk', {
        method: 'POST',
        body: JSON.stringify(settings),
    }),
};

// ============================================
// Files API
// ============================================
export const filesApi = {
    upload: async (file: File, proposalId?: string) => {
        const formData = new FormData();
        formData.append('file', file);
        if (proposalId) {
            formData.append('proposalId', proposalId);
        }

        const response = await fetch(`${API_BASE}/files/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Failed to upload file');
        }

        return response.json();
    },

    uploadMultiple: async (files: File[], proposalId?: string) => {
        const formData = new FormData();
        files.forEach(file => formData.append('files', file));
        if (proposalId) {
            formData.append('proposalId', proposalId);
        }

        const response = await fetch(`${API_BASE}/files/upload-multiple`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Failed to upload files');
        }

        return response.json();
    },

    getByProposal: (proposalId: string) => apiFetch<any[]>(`/files/proposal/${proposalId}`),

    delete: (id: string) => apiFetch<any>(`/files/${id}`, {
        method: 'DELETE',
    }),
};

// ============================================
// Health Check
// ============================================
export const healthApi = {
    check: () => apiFetch<{ status: string; message: string; timestamp: string }>('/health'),
};
