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

// Helper function to add delay between API calls to prevent server overload
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchOpenProjectUsers = async (apiKey: string): Promise<User[]> => {
    const PAGE_SIZE = 30; // Small batch size to prevent server overload
    const DELAY_BETWEEN_PAGES = 500; // 500ms delay between page requests
    const REQUEST_TIMEOUT = 30000; // 30s timeout per request

    let allUsers: User[] = [];
    let offset = 1; // OpenProject uses 1-based page numbering
    let hasMore = true;
    let totalFetched = 0;

    console.log('[OpenProject Sync] Starting paginated user sync...');

    try {
        while (hasMore) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

            console.log(`[OpenProject Sync] Fetching page ${offset}, pageSize=${PAGE_SIZE}`);

            const response = await fetch(
                `${PROXY_PREFIX}/api/v3/users?pageSize=${PAGE_SIZE}&offset=${offset}`,
                {
                    headers: {
                        'X-OpenProject-Auth-Key': apiKey.trim(),
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    signal: controller.signal
                }
            );
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
            const opUsers: OpenProjectUser[] = data._embedded?.elements || [];
            const total = data.total || 0;

            // Map OpenProject users to our User type
            // User Convention: lastName = Team Name, firstName = Full Name
            const mappedUsers = opUsers.map(opUser => ({
                id: opUser.id.toString(),
                name: opUser.firstName || 'Unknown',
                role: 'User' as const,
                department: opUser.lastName || '미지정',
                avatarUrl: opUser.avatar || '',
                email: opUser.email
            }));

            allUsers = [...allUsers, ...mappedUsers];
            totalFetched += opUsers.length;

            console.log(`[OpenProject Sync] Fetched ${opUsers.length} users (${totalFetched}/${total} total)`);

            // Check if there are more pages
            hasMore = totalFetched < total && opUsers.length > 0;
            offset++;

            // Add delay between requests to prevent server overload
            if (hasMore) {
                console.log(`[OpenProject Sync] Waiting ${DELAY_BETWEEN_PAGES}ms before next request...`);
                await delay(DELAY_BETWEEN_PAGES);
            }
        }

        console.log(`[OpenProject Sync] Complete! Total users synced: ${allUsers.length}`);
        return allUsers;

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

/**
 * Authenticate user with OpenProject credentials
 * Tries session-based auth first (if user is logged into OpenProject in browser)
 * Falls back to Basic Auth if needed
 */
export interface AuthResult {
    success: boolean;
    user?: User;
    error?: string;
}

// UTF-8 safe base64 encoding
const utf8ToBase64 = (str: string): string => {
    const utf8Bytes = new TextEncoder().encode(str);
    const binaryString = Array.from(utf8Bytes, byte => String.fromCharCode(byte)).join('');
    return btoa(binaryString);
};

/**
 * Check if user is already logged into OpenProject (session-based)
 */
export const checkOpenProjectSession = async (): Promise<AuthResult> => {
    try {
        console.log('[OpenProject Auth] Checking existing session...');

        // Try to access user info with existing session cookies
        const response = await fetch(`${PROXY_PREFIX}/api/v3/users/me`, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            }
        });

        console.log('[OpenProject Auth] Session check response:', response.status);

        if (!response.ok) {
            return { success: false, error: 'OpenProject 세션이 없습니다.' };
        }

        const userData: OpenProjectUser = await response.json();
        console.log('[OpenProject Auth] Session found for:', userData.login);

        const user: User = {
            id: userData.id.toString(),
            name: userData.firstName || userData.login,
            role: (userData as any).admin ? 'Admin' : 'User',
            department: userData.lastName || '미지정',
            avatarUrl: userData.avatar || '',
            email: userData.email
        };

        return { success: true, user };

    } catch (error) {
        console.error('[OpenProject Auth] Session check error:', error);
        return { success: false, error: '세션 확인 중 오류' };
    }
};

export const authenticateWithOpenProject = async (login: string, password: string): Promise<AuthResult> => {
    try {
        const authString = `${login}:${password}`;
        const credentials = utf8ToBase64(authString);

        console.log('[OpenProject Auth] Attempting Basic Auth for:', login);

        const response = await fetch(`${PROXY_PREFIX}/api/v3/users/me`, {
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            }
        });

        console.log('[OpenProject Auth] Response status:', response.status);

        if (!response.ok) {
            if (response.status === 401) {
                return {
                    success: false,
                    error: 'OpenProject 인증 실패. OpenProject에 먼저 로그인한 후 "세션으로 로그인" 버튼을 사용하세요.'
                };
            }
            return { success: false, error: `인증 서버 오류: ${response.status}` };
        }

        const userData: OpenProjectUser = await response.json();
        console.log('[OpenProject Auth] Authentication successful for:', userData.login);

        const user: User = {
            id: userData.id.toString(),
            name: userData.firstName || userData.login,
            role: (userData as any).admin ? 'Admin' : 'User',
            department: userData.lastName || '미지정',
            avatarUrl: userData.avatar || '',
            email: userData.email
        };

        return { success: true, user };

    } catch (error) {
        console.error('[OpenProject Auth] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '인증 중 오류가 발생했습니다.'
        };
    }
}

/**
 * Authenticate with OpenProject using personal API Token
 * Users can generate their API token in OpenProject: My Account > Access Tokens
 */
export const authenticateWithApiToken = async (apiToken: string): Promise<AuthResult> => {
    try {
        console.log('[OpenProject Auth] Attempting API Token authentication...');

        const response = await fetch(`${PROXY_PREFIX}/api/v3/users/me`, {
            headers: {
                'X-OpenProject-Auth-Key': apiToken.trim(),
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            }
        });

        console.log('[OpenProject Auth] API Token response status:', response.status);

        if (!response.ok) {
            if (response.status === 401) {
                return { success: false, error: 'API 토큰이 유효하지 않습니다.' };
            }
            return { success: false, error: `인증 서버 오류: ${response.status}` };
        }

        const userData: OpenProjectUser = await response.json();
        console.log('[OpenProject Auth] API Token auth successful for:', userData.login);

        const user: User = {
            id: userData.id.toString(),
            name: userData.firstName || userData.login,
            role: (userData as any).admin ? 'Admin' : 'User',
            department: userData.lastName || '미지정',
            avatarUrl: userData.avatar || '',
            email: userData.email
        };

        return { success: true, user };

    } catch (error) {
        console.error('[OpenProject Auth] API Token error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '인증 중 오류가 발생했습니다.'
        };
    }
}

/**
 * Login with OpenProject credentials via form login
 * This uses server-side proxy to handle the form submission
 */
export const loginWithOpenProject = async (username: string, password: string): Promise<AuthResult> => {
    try {
        console.log('[OpenProject Login] Attempting form login for:', username);

        const response = await fetch('/api/openproject-login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            return { success: false, error: '로그인 서버 오류' };
        }

        const result = await response.json();
        console.log('[OpenProject Login] Result:', result.success);

        return result;

    } catch (error) {
        console.error('[OpenProject Login] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.'
        };
    }
}




