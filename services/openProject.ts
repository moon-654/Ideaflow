import { User } from '../types';

const PROXY_PREFIX = '/api/openproject';

// Helper to get base64 encoded API key
const getAuthHeader = (apiKey: string) => {
    const raw = 'apikey:' + apiKey;
    const encoded = btoa(raw);
    console.log('[Debug] Generating Auth Header for key length:', apiKey.length);
    console.log('[Debug] Raw prefix:', raw.substring(0, 10) + '...');
    console.log('[Debug] Encoded prefix:', encoded.substring(0, 10) + '...');
    return 'Basic ' + encoded;
};

export interface OpenProjectUser {
    id: number;
    login: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
    status: string;
    _links: {
        self: { href: string; title: string };
    };
}

export const fetchOpenProjectUsers = async (apiKey: string): Promise<User[]> => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // Increased to 30s timeout

        const response = await fetch(`${PROXY_PREFIX}/api/v3/users?pageSize=50`, { // Reduced page size for stability
            headers: {
                'X-OpenProject-Auth-Key': apiKey.trim(),
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            console.error('OpenProject API Error Details:', {
                status: response.status,
                statusText: response.statusText,
                url: response.url,
                headers: Object.fromEntries(response.headers.entries())
            });
            throw new Error(`OpenProject API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const opUsers: OpenProjectUser[] = data._embedded.elements;

        // Map OpenProject users to our User type
        // User Convention: lastName = Team Name, firstName = Full Name
        return opUsers.map(opUser => ({
            id: opUser.id.toString(),
            name: opUser.firstName || 'Unknown',
            role: 'User',
            department: opUser.lastName || '미지정',
            avatarUrl: opUser.avatar || '',
            email: opUser.email
        }));

    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            console.error("OpenProject Sync/Fetch Timed Out (30s limit reached)");
            throw new Error('서버 응답 시간이 초과되었습니다. (Timeout)');
        }
        console.error("Failed to fetch OpenProject users:", error);
        throw error;
    }
}


export interface OpenProjectProject {
    id: number;
    name: string;
    identifier: string;
    description: { raw: string; };
    active: boolean;
    _links: {
        status: { href: string; title: string };
    };
}

export const fetchOpenProjectProjects = async (apiKey: string): Promise<import('../types').Project[]> => {
    try {
        const response = await fetch(`${PROXY_PREFIX}/api/v3/projects`, {
            headers: {
                'X-OpenProject-Auth-Key': apiKey.trim(),
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            }
        });

        if (!response.ok) {
            throw new Error(`OpenProject API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const opProjects: OpenProjectProject[] = data._embedded.elements;

        return opProjects.map(p => ({
            id: p.id.toString(),
            name: p.name,
            identifier: p.identifier,
            description: p.description?.raw || '',
            status: p.active ? 'Active' : 'Archived'
        }));

    } catch (error) {
        console.error("Failed to fetch OpenProject projects:", error);
        throw error;
    }
};

export const testOpenProjectConnection = async (apiKey: string): Promise<boolean> => {
    try {
        const response = await fetch(`${PROXY_PREFIX}/api/v3/users?pageSize=1`, {
            headers: {
                'X-OpenProject-Auth-Key': apiKey.trim(),
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            }
        });
        return response.ok;
    } catch {
        return false;
    }
}
