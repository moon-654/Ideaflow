/**
 * OpenProject Form Login Handler
 * This plugin adds a custom endpoint to handle OpenProject form-based login
 */

import type { Plugin } from 'vite';
import http from 'http';
import https from 'https';

const OPENPROJECT_HOST = '192.168.0.200';
const OPENPROJECT_PORT = 8085;

interface LoginResult {
    success: boolean;
    user?: any;
    error?: string;
    sessionCookie?: string;
}

/**
 * Make HTTP request to OpenProject
 */
function makeRequest(options: http.RequestOptions, body?: string): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: string }> {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({
                statusCode: res.statusCode || 0,
                headers: res.headers,
                body: data
            }));
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

/**
 * Extract CSRF token from OpenProject login page
 */
function extractCsrfToken(html: string): string | null {
    // Look for <meta name="csrf-token" content="...">
    const match = html.match(/<meta\s+name="csrf-token"\s+content="([^"]+)"/);
    return match ? match[1] : null;
}

/**
 * Extract session cookie from Set-Cookie header
 */
function extractSessionCookie(cookies: string | string[] | undefined): string | null {
    if (!cookies) return null;
    const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
    for (const cookie of cookieArray) {
        if (cookie.includes('_open_project_session')) {
            return cookie.split(';')[0];
        }
    }
    return null;
}

/**
 * Perform OpenProject form login
 */
async function performLogin(username: string, password: string): Promise<LoginResult> {
    try {
        console.log('[OpenProject Login] Starting form login for:', username);

        // Step 1: Get login page to obtain CSRF token and initial cookie
        const loginPageRes = await makeRequest({
            hostname: OPENPROJECT_HOST,
            port: OPENPROJECT_PORT,
            path: '/login',
            method: 'GET',
            headers: {
                'Accept': 'text/html',
                'User-Agent': 'IdeaFlow/1.0'
            }
        });

        const csrfToken = extractCsrfToken(loginPageRes.body);
        const initialCookie = extractSessionCookie(loginPageRes.headers['set-cookie']);

        console.log('[OpenProject Login] CSRF token found:', !!csrfToken);
        console.log('[OpenProject Login] Initial cookie found:', !!initialCookie);

        if (!csrfToken) {
            return { success: false, error: 'CSRF 토큰을 가져올 수 없습니다.' };
        }

        // Step 2: Submit login form
        const formData = new URLSearchParams({
            'authenticity_token': csrfToken,
            'username': username,
            'password': password,
            'login': '로그인',
            'back_url': 'http://192.168.0.200:8085/'
        }).toString();

        const loginRes = await makeRequest({
            hostname: OPENPROJECT_HOST,
            port: OPENPROJECT_PORT,
            path: '/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(formData).toString(),
                'Cookie': initialCookie || '',
                'User-Agent': 'IdeaFlow/1.0',
                'Accept': 'text/html',
                'Origin': `http://${OPENPROJECT_HOST}:${OPENPROJECT_PORT}`,
                'Referer': `http://${OPENPROJECT_HOST}:${OPENPROJECT_PORT}/login`
            }
        }, formData);

        console.log('[OpenProject Login] Login response status:', loginRes.statusCode);

        // Collect all cookies throughout the redirect chain
        let allCookies = initialCookie || '';

        const collectCookies = (setCookie: string | string[] | undefined) => {
            if (!setCookie) return;
            const cookieArray = Array.isArray(setCookie) ? setCookie : [setCookie];
            for (const cookie of cookieArray) {
                const cookieValue = cookie.split(';')[0];
                const cookieName = cookieValue.split('=')[0];
                // Update or add cookie
                if (allCookies.includes(cookieName + '=')) {
                    // Replace existing cookie
                    allCookies = allCookies.replace(new RegExp(cookieName + '=[^;]*'), cookieValue);
                } else if (allCookies) {
                    allCookies += '; ' + cookieValue;
                } else {
                    allCookies = cookieValue;
                }
            }
        };

        // Collect cookies from login response
        collectCookies(loginRes.headers['set-cookie']);

        // Follow redirects (up to 5 times)
        let currentRes = loginRes;
        let redirectCount = 0;
        const MAX_REDIRECTS = 5;

        while ((currentRes.statusCode === 302 || currentRes.statusCode === 303) && redirectCount < MAX_REDIRECTS) {
            const location = currentRes.headers['location'];
            if (!location) break;

            const redirectPath = location.startsWith('http')
                ? new URL(location).pathname
                : location;

            console.log('[OpenProject Login] Following redirect', redirectCount + 1, 'to:', redirectPath);

            currentRes = await makeRequest({
                hostname: OPENPROJECT_HOST,
                port: OPENPROJECT_PORT,
                path: redirectPath,
                method: 'GET',
                headers: {
                    'Cookie': allCookies,
                    'Accept': 'text/html,application/json',
                    'User-Agent': 'IdeaFlow/1.0'
                }
            });

            console.log('[OpenProject Login] Redirect', redirectCount + 1, 'response status:', currentRes.statusCode);
            collectCookies(currentRes.headers['set-cookie']);

            redirectCount++;
        }

        console.log('[OpenProject Login] Final cookies:', allCookies.substring(0, 100) + '...');

        // Now try to get user info with collected cookies
        console.log('[OpenProject Login] Fetching user info with cookies...');

        const userRes = await makeRequest({
            hostname: OPENPROJECT_HOST,
            port: OPENPROJECT_PORT,
            path: '/api/v3/users/me',
            method: 'GET',
            headers: {
                'Cookie': allCookies,
                'Accept': 'application/json',
                'User-Agent': 'IdeaFlow/1.0'
            }
        });

        console.log('[OpenProject Login] User API response status:', userRes.statusCode);

        if (userRes.statusCode === 200) {
            const userData = JSON.parse(userRes.body);
            console.log('[OpenProject Login] Login successful! User:', userData.login);
            console.log('[OpenProject Login] OpenProject admin status:', userData.admin);

            // IdeaFlow role is managed separately from OpenProject admin status
            // New users start as 'User', admins can promote them via IdeaFlow admin panel
            return {
                success: true,
                user: {
                    id: userData.id.toString(),
                    name: userData.firstName || userData.login,
                    role: 'User',  // Default role - IdeaFlow管理will be handled separately
                    department: userData.lastName || '미지정',
                    avatarUrl: userData.avatar || '',
                    email: userData.email,
                    login: userData.login
                },
                sessionCookie: allCookies
            };
        } else {
            console.log('[OpenProject Login] User API failed, response:', userRes.body.substring(0, 200));
        }

        // Login failed
        console.log('[OpenProject Login] Login failed');
        return { success: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' };

    } catch (error) {
        console.error('[OpenProject Login] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.'
        };
    }
}

/**
 * Vite plugin for OpenProject login
 */
export function openProjectLoginPlugin(): Plugin {
    return {
        name: 'openproject-login',
        configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
                if (req.url === '/api/openproject-login' && req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => body += chunk);
                    req.on('end', async () => {
                        try {
                            const { username, password } = JSON.parse(body);
                            const result = await performLogin(username, password);

                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify(result));
                        } catch (error) {
                            res.statusCode = 500;
                            res.end(JSON.stringify({ success: false, error: 'Server error' }));
                        }
                    });
                } else {
                    next();
                }
            });
        }
    };
}
