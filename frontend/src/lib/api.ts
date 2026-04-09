const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
}

async function request<T>(method: string, path: string, body?: unknown, auth = true): Promise<T> {
    const headers: Record<string, string> = {'Content-Type': 'application/json'};

    if (auth) {
        const token = getAccessToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${BASE}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
        const refreshed = await tryRefresh();
        if (refreshed) {
            return request<T>(method, path, body, auth);
        }
        throw new ApiError(401, 'UNAUTHORIZED');
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new ApiError(res.status, data?.errorCode || data?.message || 'REQUEST_FAILED', data);
    }

    return data as T;
}

async function tryRefresh(): Promise<boolean> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;
    try {
        const data = await request<{ accessToken: string; refreshToken: string; userId: string; username: string }>(
            'POST', '/auth/refresh', {refreshToken}, false,
        );
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        if (data.username) localStorage.setItem('username', data.username);
        return true;
    } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('username');
        return false;
    }
}

export class ApiError extends Error {
    constructor(public status: number, public errorCode: string, public data?: unknown) {
        super(errorCode);
    }
}

export const api = {
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body: unknown, auth = true) => request<T>('POST', path, body, auth),

    auth: {
        register: (email: string, password: string, username: string) =>
            request<{ accessToken: string; refreshToken: string; userId: string; username: string }>(
                'POST', '/auth/register', {email, password, username}, false,
            ),
        login: (email: string, password: string) =>
            request<{ accessToken: string; refreshToken: string; userId: string; username: string }>(
                'POST', '/auth/login', {email, password}, false,
            ),
        refresh: (refreshToken: string) =>
            request<{ accessToken: string; refreshToken: string; userId: string; username: string }>(
                'POST', '/auth/refresh', {refreshToken}, false,
            ),
        logout: (refreshToken: string) =>
            request<{}>('POST', '/auth/logout', {refreshToken}, false).catch(() => {
            }),
    },

    users: {
        list: (search?: string) => {
            const qs = search ? `?search=${encodeURIComponent(search)}` : '';
            return request<{ users: { userId: string; email: string; username: string }[] }>('GET', `/users${qs}`);
        },
    },

    conversations: {
        list: () => request<{ conversations: unknown[] }>('GET', '/conversations'),
        get: (id: string) => request<{ conversation: unknown }>('GET', `/conversations/${id}`),
        create: (userId: string) => request<{ conversation: unknown }>('POST', '/conversations', {userId}),
        delete: (id: string) => request<{ success: boolean }>('DELETE', `/conversations/${id}`),
        messages: (id: string, limit = 50, before?: string) => {
            let qs = `?limit=${limit}`;
            if (before) qs += `&before=${encodeURIComponent(before)}`;
            return request<{ messages: unknown[] }>('GET', `/conversations/${id}/messages${qs}`);
        },
        sendMessage: (id: string, text: string) =>
            request<{ message: unknown }>('POST', `/conversations/${id}/messages`, {text}),
    },

    stories: {
        list: () => request<{
            stories: { storyId: string; userId: string; username: string; createdAt: string; expiresAt: string }[]
        }>('GET', '/stories'),
        upload: async (videoBlob: Blob): Promise<{ storyId: string; username: string; expiresAt: string }> => {
            const token = getAccessToken();
            const form = new FormData();
            form.append('video', videoBlob, 'story.webm');
            const res = await fetch(`${BASE}/stories`, {
                method: 'POST',
                headers: token ? {Authorization: `Bearer ${token}`} : {},
                body: form,
            });
            if (res.status === 401) {
                const refreshed = await tryRefresh();
                if (refreshed) return api.stories.upload(videoBlob);
                throw new ApiError(401, 'UNAUTHORIZED');
            }
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new ApiError(res.status, data?.errorCode || 'UPLOAD_FAILED');
            return data;
        },
        fetchVideo: async (storyId: string): Promise<string> => {
            const token = getAccessToken();
            const res = await fetch(`${BASE}/stories/${storyId}/video`, {
                headers: token ? {Authorization: `Bearer ${token}`} : {},
            });
            if (!res.ok) throw new ApiError(res.status, 'VIDEO_NOT_FOUND');
            return URL.createObjectURL(await res.blob());
        },
    },
};
