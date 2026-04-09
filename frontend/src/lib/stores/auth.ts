import {writable} from 'svelte/store';
import {api, ApiError} from '../api';
import {connect, disconnect} from '../ws';

export type AuthState = {
    userId: string | null;
    username: string | null;
    loading: boolean;
    error: string | null;
};

function createAuthStore() {
    const {subscribe, set, update} = writable<AuthState>({
        userId: null,
        username: null,
        loading: false,
        error: null,
    });

    async function init() {
        const accessToken = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');
        if (!accessToken && !refreshToken) return;

        try {
            let token = accessToken;
            let userId: string | null = token ? parseJwt(token)?.userId ?? null : null;
            let username: string | null = localStorage.getItem('username');

            if (!userId && refreshToken) {
                const refreshed = await api.auth.refresh(refreshToken);
                storeTokens(refreshed);
                localStorage.setItem('username', refreshed.username);
                token = refreshed.accessToken;
                userId = refreshed.userId;
                username = refreshed.username;
            }

            if (!userId || !token) {
                clearStorage();
                return;
            }
            set({userId, username, loading: false, error: null});
            connect(token).catch(() => {
            });
        } catch {
            clearStorage();
        }
    }

    async function login(email: string, password: string) {
        update(s => ({...s, loading: true, error: null}));
        try {
            const data = await api.auth.login(email, password);
            storeTokens(data);
            localStorage.setItem('username', data.username);
            set({userId: data.userId, username: data.username, loading: false, error: null});
            connect(data.accessToken).catch(() => {
            });
            return true;
        } catch (e) {
            update(s => ({...s, loading: false, error: errorMsg(e)}));
            return false;
        }
    }

    async function register(email: string, password: string, username: string) {
        update(s => ({...s, loading: true, error: null}));
        try {
            const data = await api.auth.register(email, password, username);
            storeTokens(data);
            localStorage.setItem('username', data.username);
            set({userId: data.userId, username: data.username, loading: false, error: null});
            connect(data.accessToken).catch(() => {
            });
            return true;
        } catch (e) {
            update(s => ({...s, loading: false, error: errorMsg(e)}));
            return false;
        }
    }

    async function logout() {
        const refreshToken = localStorage.getItem('refreshToken') ?? '';
        await api.auth.logout(refreshToken);
        disconnect();
        clearStorage();
        set({userId: null, username: null, loading: false, error: null});
    }

    return {subscribe, init, login, register, logout};
}

function storeTokens(data: { accessToken: string; refreshToken: string }) {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
}

function clearStorage() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('username');
}

function parseJwt(token: string): { userId: string; username?: string; exp?: number } | null {
    try {
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = decodeURIComponent(
            atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
        );
        const payload = JSON.parse(json);
        if (payload.exp && payload.exp * 1000 < Date.now()) return null;
        return payload;
    } catch {
        return null;
    }
}

function errorMsg(e: unknown): string {
    if (e instanceof ApiError) return e.errorCode;
    return String(e);
}

export const auth = createAuthStore();
