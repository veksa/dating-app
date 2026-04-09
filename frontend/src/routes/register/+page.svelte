<script lang="ts">
    import {goto} from '$app/navigation';
    import {auth} from '$lib/stores/auth';
    import {getAvatarUrl} from '$lib/utils/chat';
    import {ArrowRight, AtSign, Eye, EyeOff, Flame, Lock, Mail} from 'lucide-svelte';

    let email = $state('');
    let password = $state('');
    let username = $state('');
    let showPassword = $state(false);

    const strengthLevel = $derived.by(() => {
        if (!password) return 0;
        let score = 0;
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        return score;
    });

    const strengthLabel = $derived(
        strengthLevel === 0 ? '' :
            strengthLevel === 1 ? 'Weak' :
                strengthLevel === 2 ? 'Fair' :
                    strengthLevel === 3 ? 'Good' : 'Strong'
    );

    const strengthColor = $derived(
        strengthLevel <= 1 ? '#EF4444' :
            strengthLevel === 2 ? '#F59E0B' :
                strengthLevel === 3 ? '#10B981' : 'var(--primary)'
    );

    async function handleSubmit(e: SubmitEvent) {
        e.preventDefault();
        const ok = await auth.register(email, password, username);
        if (ok) goto('/chat');
    }
</script>

<div class="auth-layout">
    <div class="auth-image-side">
        <div class="auth-image-overlay">
            <div class="logo-wrap">
                <div class="logo-icon">
                    <Flame size={24}/>
                </div>
                Spark
            </div>
            <div class="quote-area">
                <div class="quote-text">"The most authentic way to meet new people. The real-time chat makes
                    conversations flow naturally."
                </div>
                <div class="quote-author">
                    <img class="author-avatar"
                         src={getAvatarUrl('Sarah')}
                         alt="Sarah Jenkins"/>
                    Sarah Jenkins
                </div>
            </div>
        </div>
    </div>

    <div class="auth-form-side">
        <div class="auth-form-container">
            <div class="auth-header">
                <div class="auth-title">Welcome to Spark</div>
                <div class="auth-subtitle">Create an account to start connecting with people.</div>
            </div>

            <div class="auth-tabs">
                <a href="/login" class="auth-tab">Sign In</a>
                <div class="auth-tab active">Register</div>
            </div>

            {#if $auth.error}
                <div class="error-box">{$auth.error}</div>
            {/if}

            <form class="auth-form" onsubmit={handleSubmit}>
                <div class="form-group">
                    <div class="form-label">Username</div>
                    <div class="form-input-wrap">
                        <span class="form-icon"><AtSign size={18}/></span>
                        <input class="form-input" type="text" bind:value={username} placeholder="sparkuser99" required
                               minlength={2}/>
                    </div>
                </div>

                <div class="form-group">
                    <div class="form-label">Email Address</div>
                    <div class="form-input-wrap">
                        <span class="form-icon"><Mail size={18}/></span>
                        <input class="form-input" type="email" bind:value={email} placeholder="name@example.com"
                               required/>
                    </div>
                </div>

                <div class="form-group">
                    <div class="form-label">Password</div>
                    <div class="form-input-wrap">
                        <span class="form-icon"><Lock size={18}/></span>
                        <input class="form-input" type={showPassword ? 'text' : 'password'} bind:value={password}
                               placeholder="••••••••" required minlength={6}/>
                        <button type="button" class="form-icon-right" onclick={() => showPassword = !showPassword}
                                tabindex="-1">
                            {#if showPassword}
                                <EyeOff size={18}/>
                            {:else}
                                <Eye size={18}/>
                            {/if}
                        </button>
                    </div>
                    {#if password}
                        <div class="password-strength">
                            {#each [1, 2, 3, 4] as i}
                                <div class="strength-bar"
                                     style={i <= strengthLevel ? `background: ${strengthColor}` : ''}></div>
                            {/each}
                        </div>
                        <div class="strength-text" style="color: {strengthColor}">{strengthLabel} password</div>
                    {/if}
                </div>

                <button class="primary-btn" type="submit" disabled={$auth.loading}>
                    {$auth.loading ? 'Creating account…' : 'Create Account'}
                    <ArrowRight size={18}/>
                </button>
            </form>

            <div class="auth-footer">
                Already have an account? <a href="/login" class="auth-footer-link">Sign in</a>
            </div>
        </div>
    </div>
</div>

<style>
    .auth-layout {
        display: flex;
        min-height: 100vh;
        background: var(--background);
        overflow: hidden;
    }

    .auth-image-side {
        flex: 1;
        position: relative;
        display: flex;
        flex-direction: column;
        background: linear-gradient(135deg, #f97316 0%, #ec4899 50%, #8b5cf6 100%);
    }

    .auth-image-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.85) 100%);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 56px;
        color: #fff;
    }

    .logo-wrap {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 26px;
        font-weight: 800;
        letter-spacing: -0.5px;
    }

    .logo-icon {
        width: 44px;
        height: 44px;
        background: var(--primary);
        color: #fff;
        border-radius: var(--radius-xl);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .quote-area {
        max-width: 480px;
    }

    .quote-text {
        font-size: 22px;
        font-weight: 500;
        line-height: 1.45;
        margin-bottom: 18px;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    }

    .quote-author {
        font-size: 15px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.9);
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .author-avatar {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid rgba(255, 255, 255, 0.25);
    }

    .auth-form-side {
        width: 540px;
        flex-shrink: 0;
        background: var(--card);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 40px;
        border-left: 1px solid var(--border);
        box-shadow: -4px 0 24px rgba(0, 0, 0, 0.03);
        z-index: 10;
    }

    .auth-form-container {
        width: 100%;
        max-width: 360px;
        display: flex;
        flex-direction: column;
        gap: 28px;
    }

    .auth-header {
        display: flex;
        flex-direction: column;
        gap: 8px;
        text-align: center;
    }

    .auth-title {
        font-size: 30px;
        font-weight: 700;
        letter-spacing: -0.5px;
        color: var(--foreground);
    }

    .auth-subtitle {
        font-size: 14px;
        color: var(--muted-foreground);
        line-height: 1.5;
    }

    .auth-tabs {
        display: flex;
        background: var(--input);
        border-radius: var(--radius-xl);
        padding: 4px;
        gap: 4px;
    }

    .auth-tab {
        flex: 1;
        text-align: center;
        padding: 10px 0;
        font-size: 14px;
        font-weight: 600;
        border-radius: 10px;
        cursor: pointer;
        color: var(--muted-foreground);
        text-decoration: none;
        transition: all 0.15s;
    }

    .auth-tab.active {
        background: var(--card);
        color: var(--foreground);
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.07);
    }

    .error-box {
        background: rgba(239, 68, 68, 0.08);
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: var(--radius-xl);
        color: #EF4444;
        padding: 10px 14px;
        font-size: 13px;
    }

    .auth-form {
        display: flex;
        flex-direction: column;
        gap: 18px;
    }

    .form-group {
        display: flex;
        flex-direction: column;
        gap: 7px;
    }

    .form-label {
        font-size: 13px;
        font-weight: 600;
        color: var(--foreground);
        padding-left: 2px;
    }

    .form-input-wrap {
        position: relative;
        display: flex;
        align-items: center;
    }

    .form-icon {
        position: absolute;
        left: 14px;
        color: var(--muted-foreground);
        display: flex;
        align-items: center;
        pointer-events: none;
    }

    .form-icon-right {
        position: absolute;
        right: 12px;
        color: var(--muted-foreground);
        display: flex;
        align-items: center;
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        border-radius: 6px;
    }

    .form-icon-right:hover {
        color: var(--foreground);
    }

    .form-input {
        width: 100%;
        height: 48px;
        background: var(--background);
        border: 1px solid var(--border);
        border-radius: var(--radius-xl);
        padding: 0 44px 0 44px;
        font-size: 14px;
        color: var(--foreground);
        font-family: inherit;
        outline: none;
        transition: border-color 0.15s;
    }

    .form-input:focus {
        border-color: var(--primary);
    }

    .form-input::placeholder {
        color: var(--muted-foreground);
    }

    .password-strength {
        display: flex;
        gap: 4px;
        padding: 0 2px;
    }

    .strength-bar {
        height: 4px;
        flex: 1;
        background: var(--border);
        border-radius: 2px;
        transition: background 0.2s;
    }

    .strength-text {
        font-size: 12px;
        margin-top: 2px;
        padding-left: 2px;
        font-weight: 500;
        transition: color 0.2s;
    }

    .primary-btn {
        height: 48px;
        background: var(--primary);
        color: var(--primary-foreground);
        border: none;
        border-radius: var(--radius-xl);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        margin-top: 4px;
        font-family: inherit;
        transition: opacity 0.15s;
    }

    .primary-btn:hover {
        opacity: 0.9;
    }

    .primary-btn:disabled {
        opacity: 0.55;
        cursor: not-allowed;
    }

    .auth-footer {
        text-align: center;
        font-size: 13px;
        color: var(--muted-foreground);
        line-height: 1.6;
    }

    .auth-footer-link {
        color: var(--primary);
        font-weight: 600;
        text-decoration: none;
    }

    .auth-footer-link:hover {
        text-decoration: underline;
    }

    @media (max-width: 768px) {
        .auth-image-side {
            display: none;
        }

        .auth-form-side {
            width: 100%;
        }
    }
</style>
