<script lang="ts">
    import {onDestroy, onMount, tick} from 'svelte';
    import {goto} from '$app/navigation';
    import {auth} from '$lib/stores/auth';
    import {api} from '$lib/api';
    import {ChevronDown, Clock, Flame, FlipHorizontal, MessageSquare, Users, Video, X, Zap,} from 'lucide-svelte';

    type Story = { storyId: string; userId: string; username: string; createdAt: string; expiresAt: string };
    type RecordState = 'idle' | 'recording' | 'recorded' | 'uploading' | 'done';

    let recState: RecordState = $state('idle');
    let error = $state('');
    let stories: Story[] = $state([]);

    let videoEl: HTMLVideoElement;
    let stream: MediaStream | null = $state(null);
    let recorder: MediaRecorder | null = $state(null);
    let chunks: Blob[] = $state([]);
    let recordedBlob: Blob | null = $state(null);
    let previewUrl = $state('');

    let recordingTime = $state(0);
    let timerInterval: ReturnType<typeof setInterval> | null = null;
    const MAX_DURATION = 15;

    let videoDevices: MediaDeviceInfo[] = $state([]);
    let audioDevices: MediaDeviceInfo[] = $state([]);
    let selectedVideoId = $state('');
    let selectedAudioId = $state('');
    let torchOn = $state(false);
    let facingMode: 'user' | 'environment' = $state('user');

    let viewingStory: Story | null = $state(null);
    let viewingUrl = $state('');
    let viewingLoading = $state(false);

    const progress = $derived(Math.min((recordingTime / MAX_DURATION) * 100, 100));
    const timerDisplay = $derived(() => {
        const s = Math.floor(recordingTime);
        return `00:${String(s).padStart(2, '0')} / 00:${String(MAX_DURATION).padStart(2, '0')}`;
    });

    function timeAgo(iso: string): string {
        const diff = Date.now() - new Date(iso).getTime();
        const h = Math.floor(diff / 3600000);
        if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
        return `${h}h ago`;
    }

    async function initCamera(videoId?: string, audioId?: string) {
        if (stream) stream.getTracks().forEach(t => t.stop());
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: videoId ? {deviceId: {exact: videoId}} : {facingMode},
                audio: audioId ? {deviceId: {exact: audioId}} : true,
            });
            if (videoEl) {
                videoEl.srcObject = stream;
                videoEl.muted = true;
                videoEl.play().catch(() => {
                });
            }

            const devices = await navigator.mediaDevices.enumerateDevices();
            videoDevices = devices.filter(d => d.kind === 'videoinput');
            audioDevices = devices.filter(d => d.kind === 'audioinput');
            if (!selectedVideoId && videoDevices.length) selectedVideoId = videoDevices[0].deviceId;
            if (!selectedAudioId && audioDevices.length) selectedAudioId = audioDevices[0].deviceId;
        } catch {
            error = 'Camera access denied. Please allow camera and microphone.';
        }
    }

    async function changeDevice() {
        await initCamera(selectedVideoId || undefined, selectedAudioId || undefined);
    }

    async function flipCamera() {
        facingMode = facingMode === 'user' ? 'environment' : 'user';
        await initCamera(undefined, selectedAudioId || undefined);
    }

    function toggleTorch() {
        if (!stream) return;
        const track = stream.getVideoTracks()[0];
        if (!track) return;
        torchOn = !torchOn;
        track.applyConstraints({advanced: [{torch: torchOn} as any]}).catch(() => {
            torchOn = !torchOn;
        });
    }

    function startRecording() {
        if (!stream) return;
        chunks = [];
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
            ? 'video/webm;codecs=vp9'
            : MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4';

        recorder = new MediaRecorder(stream, {mimeType});
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };
        recorder.onstop = () => {
            const type = recorder?.mimeType || 'video/webm';
            recordedBlob = new Blob(chunks, {type});
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            previewUrl = URL.createObjectURL(recordedBlob);
            recState = 'recorded';
            if (stream) stream.getTracks().forEach(t => t.stop());
        };
        recorder.start(200);
        recState = 'recording';
        recordingTime = 0;

        timerInterval = setInterval(() => {
            recordingTime += 0.1;
            if (recordingTime >= MAX_DURATION) stopRecording();
        }, 100);
    }

    function stopRecording() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        if (recorder && recorder.state !== 'inactive') recorder.stop();
    }

    function discardRecording() {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            previewUrl = '';
        }
        recordedBlob = null;
        recordingTime = 0;
        recState = 'idle';
        initCamera(selectedVideoId || undefined, selectedAudioId || undefined);
    }

    async function postStory() {
        if (!recordedBlob) return;
        recState = 'uploading';
        error = '';
        try {
            await api.stories.upload(recordedBlob);
            recState = 'done';
            await loadStories();
        } catch (e: any) {
            error = e.message || 'Upload failed';
            recState = 'recorded';
        }
    }

    async function loadStories() {
        try {
            const res = await api.stories.list();
            stories = res.stories;
        } catch {
        }
    }

    async function openStory(story: Story) {
        viewingStory = story;
        viewingUrl = '';
        viewingLoading = true;
        try {
            viewingUrl = await api.stories.fetchVideo(story.storyId);
        } catch {
            viewingUrl = '';
        }
        viewingLoading = false;
    }

    function closeStory() {
        if (viewingUrl) URL.revokeObjectURL(viewingUrl);
        viewingUrl = '';
        viewingStory = null;
    }

    onMount(async () => {
        await auth.init();
        if (!$auth.userId) {
            await tick();
            goto('/login');
            return;
        }
        await loadStories();
        await initCamera();
    });

    onDestroy(() => {
        if (timerInterval) clearInterval(timerInterval);
        if (stream) stream.getTracks().forEach(t => t.stop());
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        if (viewingUrl) URL.revokeObjectURL(viewingUrl);
    });
</script>

<div class="app-layout">
    <!-- SIDEBAR -->
    <aside class="sidebar">
        <div class="sidebar-inner">
            <div class="logo-wrap">
                <div class="logo-icon">
                    <Flame size={20}/>
                </div>
                Spark
            </div>

            <nav class="nav-menu">
                <a href="/chat" class="nav-item">
                    <MessageSquare size={20}/>
                    Messages
                </a>
                <a href="/chat" class="nav-item">
                    <Users size={20}/>
                    Find Users
                </a>
            </nav>

            <div class="create-story-wrap">
                <button class="create-story-btn" onclick={discardRecording}>
                    <Video size={18}/>
                    Record Story
                </button>
            </div>

            <div class="sidebar-section">
                <div class="sidebar-section-title">Active Stories</div>
                <div class="story-list">
                    {#each stories as story}
                        <button class="story-list-item" onclick={() => openStory(story)}>
                            <div class="story-avatar-wrap unread">
                                <div class="story-avatar-inner">{story.username[0].toUpperCase()}</div>
                            </div>
                            <div class="story-user-info">
                                <div class="story-username">{story.username}</div>
                                <div class="story-time">{timeAgo(story.createdAt)}</div>
                            </div>
                        </button>
                    {/each}
                    {#if stories.length === 0}
                        <div class="no-stories">No active stories</div>
                    {/if}
                </div>
            </div>
        </div>

        <div class="user-profile-bottom">
            <div class="user-avatar">{($auth.username || '?')[0].toUpperCase()}</div>
            <div class="user-bottom-info">
                <div class="user-bottom-name">{$auth.username || 'You'}</div>
                <div class="user-bottom-status">
                    <div class="status-dot"></div>
                    Online
                </div>
            </div>
        </div>
    </aside>

    <!-- MAIN CONTENT -->
    <main class="main-content">
        <div class="page-header">
            <div class="page-title">Record Story</div>
            <div class="page-subtitle">Share a quick {MAX_DURATION}-second video update with your matches</div>
        </div>

        <div class="workspace">
            <!-- CAMERA / PREVIEW -->
            <div class="camera-wrapper">
                <div class="camera-view">
                    {#if recState === 'recorded' || recState === 'uploading' || recState === 'done'}
                        <!-- Recorded preview -->
                        <video class="camera-feed" src={previewUrl} autoplay loop playsinline></video>
                        {#if recState === 'done'}
                            <div class="done-overlay">
                                <div class="done-badge">✓ Posted!</div>
                            </div>
                        {/if}
                    {:else}
                        <!-- Live camera feed -->
                        <video class="camera-feed" bind:this={videoEl} autoplay muted playsinline></video>
                        <div class="camera-overlay">
                            <!-- Progress bar -->
                            <div class="story-progress">
                                <div class="progress-fill" style="width: {progress}%"></div>
                            </div>

                            <!-- Top controls -->
                            <div class="camera-top-actions">
                                <button class="action-btn" onclick={toggleTorch} class:active={torchOn} title="Flash">
                                    <Zap size={20}/>
                                </button>
                                {#if recState === 'recording'}
                                    <div class="timer-badge">
                                        <div class="red-dot"></div>
                                        {timerDisplay()}
                                    </div>
                                {:else}
                                    <div class="timer-badge inactive">
                                        00:00 / 00:{String(MAX_DURATION).padStart(2, '0')}
                                    </div>
                                {/if}
                                <button class="action-btn" onclick={flipCamera} title="Flip camera">
                                    <FlipHorizontal size={20}/>
                                </button>
                            </div>

                            <!-- Bottom controls -->
                            <div class="camera-bottom-actions">
                                {#if recState === 'idle'}
                                    <button class="record-btn-outer" onclick={startRecording} title="Start recording">
                                        <div class="record-btn-inner idle"></div>
                                    </button>
                                    <div class="record-hint">Tap to record</div>
                                {:else if recState === 'recording'}
                                    <button class="record-btn-outer recording" onclick={stopRecording}
                                            title="Stop recording">
                                        <div class="record-btn-inner stop"></div>
                                    </button>
                                    <div class="record-hint">Recording…</div>
                                {/if}
                            </div>
                        </div>
                    {/if}

                    {#if error && !viewingStory}
                        <div class="camera-error">{error}</div>
                    {/if}
                </div>
            </div>

            <!-- SETTINGS PANEL -->
            <div class="settings-panel">
                <div class="settings-header">Story Settings</div>

                <div class="info-box">
                    <div class="info-icon">
                        <Clock size={24}/>
                    </div>
                    <div class="info-text">
                        <strong>Auto-deletes in 24h</strong>
                        Your story will automatically disappear from the feed after 24 hours.
                    </div>
                </div>

                <div class="setting-group">
                    <div class="setting-label">Camera Input</div>
                    <div class="select-wrap">
                        <select class="select-input" bind:value={selectedVideoId} onchange={changeDevice}
                                disabled={recState === 'recording'}>
                            {#each videoDevices as d}
                                <option value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 6)}`}</option>
                            {/each}
                        </select>
                        <span class="select-chevron"><ChevronDown size={18}/></span>
                    </div>
                </div>

                <div class="setting-group">
                    <div class="setting-label">Microphone Input</div>
                    <div class="select-wrap">
                        <select class="select-input" bind:value={selectedAudioId} onchange={changeDevice}
                                disabled={recState === 'recording'}>
                            {#each audioDevices as d}
                                <option value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0, 6)}`}</option>
                            {/each}
                        </select>
                        <span class="select-chevron"><ChevronDown size={18}/></span>
                    </div>
                </div>

                <div class="actions-row">
                    <button class="btn-secondary" onclick={discardRecording} disabled={recState === 'uploading'}>
                        {recState === 'done' ? 'Record again' : 'Cancel'}
                    </button>
                    <button
                            class="btn-primary"
                            onclick={postStory}
                            disabled={recState !== 'recorded' || !recordedBlob}
                    >
                        {recState === 'uploading' ? 'Posting…' : 'Post Story'}
                    </button>
                </div>
            </div>
        </div>
    </main>
</div>

<!-- Story Viewer Overlay -->
{#if viewingStory}
    <div class="viewer-overlay" role="dialog" aria-modal="true">
        <button class="viewer-close" onclick={closeStory}>
            <X size={24}/>
        </button>
        <div class="viewer-info">
            <div class="viewer-avatar">{viewingStory.username[0].toUpperCase()}</div>
            <div>
                <div class="viewer-username">{viewingStory.username}</div>
                <div class="viewer-time">{timeAgo(viewingStory.createdAt)}</div>
            </div>
        </div>
        {#if viewingLoading}
            <div class="viewer-loading">Loading…</div>
        {:else if viewingUrl}
            <video class="viewer-video" src={viewingUrl} autoplay controls playsinline></video>
        {:else}
            <div class="viewer-loading">Failed to load</div>
        {/if}
    </div>
{/if}

<style>
    .app-layout {
        display: flex;
        height: 100vh;
        background: var(--background);
        overflow: hidden;
    }

    /* SIDEBAR */
    .sidebar {
        width: 280px;
        background: var(--sidebar, var(--card));
        border-right: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        height: 100%;
        flex-shrink: 0;
    }

    .sidebar-inner {
        display: flex;
        flex-direction: column;
        flex: 1;
        overflow-y: auto;
        padding: 24px 16px;
    }

    .logo-wrap {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 22px;
        font-weight: 800;
        padding: 0 8px;
        margin-bottom: 28px;
        letter-spacing: -0.5px;
        color: var(--foreground);
    }

    .logo-icon {
        width: 36px;
        height: 36px;
        background: var(--primary);
        color: #fff;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .nav-menu {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .nav-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        border-radius: 10px;
        font-size: 15px;
        font-weight: 600;
        color: var(--muted-foreground);
        cursor: pointer;
        text-decoration: none;
        transition: background 0.1s;
    }

    .nav-item:hover {
        background: var(--muted);
        color: var(--foreground);
    }

    .nav-item.active {
        background: var(--secondary);
        color: var(--foreground);
    }

    .create-story-wrap {
        margin-top: 20px;
        padding-bottom: 20px;
        border-bottom: 1px solid var(--border);
    }

    .create-story-btn {
        background: var(--primary);
        color: var(--primary-foreground);
        height: 44px;
        border-radius: 10px;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        width: 100%;
        font-family: inherit;
        transition: opacity 0.15s;
    }

    .create-story-btn:hover {
        opacity: 0.9;
    }

    .sidebar-section {
        margin-top: 20px;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .sidebar-section-title {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--muted-foreground);
        letter-spacing: 0.5px;
        padding: 0 12px;
    }

    .story-list {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .story-list-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 12px;
        border-radius: 10px;
        cursor: pointer;
        background: none;
        border: none;
        width: 100%;
        text-align: left;
        font-family: inherit;
        transition: background 0.1s;
    }

    .story-list-item:hover {
        background: var(--muted);
    }

    .story-avatar-wrap {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        padding: 2px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .story-avatar-wrap.unread {
        background: linear-gradient(45deg, var(--primary), #ec4899);
    }

    .story-avatar-inner {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: var(--muted);
        border: 2px solid var(--sidebar, var(--card));
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 700;
        color: var(--foreground);
    }

    .story-user-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .story-username {
        font-size: 14px;
        font-weight: 600;
        color: var(--foreground);
    }

    .story-time {
        font-size: 12px;
        color: var(--muted-foreground);
    }

    .no-stories {
        padding: 8px 12px;
        font-size: 13px;
        color: var(--muted-foreground);
    }

    .user-profile-bottom {
        padding: 14px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        border-top: 1px solid var(--border);
        background: var(--sidebar, var(--card));
    }

    .user-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: var(--primary);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        font-weight: 700;
        flex-shrink: 0;
    }

    .user-bottom-info {
        display: flex;
        flex-direction: column;
    }

    .user-bottom-name {
        font-size: 14px;
        font-weight: 600;
        color: var(--foreground);
    }

    .user-bottom-status {
        font-size: 12px;
        color: var(--muted-foreground);
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--success, #22c55e);
    }

    /* MAIN */
    .main-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        background: var(--background);
        height: 100%;
        overflow-y: auto;
    }

    .page-header {
        padding: 36px 56px 28px;
    }

    .page-title {
        font-size: 30px;
        font-weight: 700;
        letter-spacing: -0.5px;
        margin-bottom: 6px;
        color: var(--foreground);
    }

    .page-subtitle {
        font-size: 14px;
        color: var(--muted-foreground);
    }

    .workspace {
        display: flex;
        padding: 0 56px 56px;
        gap: 40px;
        align-items: flex-start;
        flex-wrap: wrap;
    }

    /* CAMERA */
    .camera-wrapper {
        padding: 10px;
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 28px;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.04);
        flex-shrink: 0;
    }

    .camera-view {
        width: 320px;
        height: 568px;
        border-radius: 20px;
        background: #111;
        position: relative;
        overflow: hidden;
    }

    .camera-feed {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
    }

    .camera-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        padding: 20px;
        background: linear-gradient(180deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0) 20%, rgba(0, 0, 0, 0) 70%, rgba(0, 0, 0, 0.6) 100%);
    }

    .story-progress {
        width: 100%;
        height: 4px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 2px;
        overflow: hidden;
    }

    .progress-fill {
        height: 100%;
        background: #ef4444;
        border-radius: 2px;
        transition: width 0.1s linear;
    }

    .camera-top-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 14px;
    }

    .action-btn {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.35);
        backdrop-filter: blur(8px);
        color: #fff;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background 0.15s;
    }

    .action-btn:hover {
        background: rgba(0, 0, 0, 0.55);
    }

    .action-btn.active {
        background: rgba(255, 200, 0, 0.5);
    }

    .timer-badge {
        background: rgba(0, 0, 0, 0.35);
        backdrop-filter: blur(8px);
        color: #fff;
        padding: 7px 14px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 7px;
        font-variant-numeric: tabular-nums;
    }

    .timer-badge.inactive {
        opacity: 0.6;
    }

    .red-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #ef4444;
        animation: blink 1s infinite;
    }

    @keyframes blink {
        0%, 100% {
            opacity: 1;
        }
        50% {
            opacity: 0.2;
        }
    }

    .camera-bottom-actions {
        margin-top: auto;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
    }

    .record-btn-outer {
        width: 72px;
        height: 72px;
        border-radius: 50%;
        border: 4px solid rgba(255, 255, 255, 0.9);
        background: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        padding: 0;
        transition: transform 0.1s;
    }

    .record-btn-outer:hover {
        transform: scale(1.05);
    }

    .record-btn-outer.recording {
        border-color: #ef4444;
    }

    .record-btn-inner.idle {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: #ef4444;
    }

    .record-btn-inner.stop {
        width: 26px;
        height: 26px;
        border-radius: 5px;
        background: #ef4444;
    }

    .record-hint {
        color: rgba(255, 255, 255, 0.9);
        font-size: 13px;
        font-weight: 500;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
    }

    .camera-error {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.7);
        color: #fff;
        font-size: 13px;
        padding: 24px;
        text-align: center;
    }

    .done-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .done-badge {
        background: var(--success, #22c55e);
        color: #fff;
        font-size: 18px;
        font-weight: 700;
        padding: 12px 28px;
        border-radius: 50px;
    }

    /* SETTINGS PANEL */
    .settings-panel {
        flex: 1;
        max-width: 420px;
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 20px;
        padding: 28px;
        display: flex;
        flex-direction: column;
        gap: 28px;
    }

    .settings-header {
        font-size: 18px;
        font-weight: 700;
        color: var(--foreground);
    }

    .info-box {
        display: flex;
        gap: 14px;
        padding: 14px;
        background: var(--secondary);
        border-radius: 12px;
        align-items: flex-start;
    }

    .info-icon {
        color: var(--secondary-foreground);
        display: flex;
        align-items: center;
        padding-top: 2px;
        flex-shrink: 0;
    }

    .info-text {
        font-size: 13px;
        color: var(--secondary-foreground);
        line-height: 1.5;
    }

    .info-text strong {
        font-size: 14px;
        color: var(--foreground);
        display: block;
        margin-bottom: 3px;
        font-weight: 600;
    }

    .setting-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .setting-label {
        font-size: 14px;
        font-weight: 600;
        color: var(--foreground);
        padding-left: 2px;
    }

    .select-wrap {
        position: relative;
        display: flex;
        align-items: center;
    }

    .select-input {
        width: 100%;
        height: 48px;
        border: 1px solid var(--border);
        border-radius: 12px;
        background: var(--background);
        padding: 0 40px 0 16px;
        font-size: 14px;
        color: var(--foreground);
        font-family: inherit;
        cursor: pointer;
        appearance: none;
        outline: none;
        transition: border-color 0.15s;
    }

    .select-input:focus {
        border-color: var(--primary);
    }

    .select-input:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .select-chevron {
        position: absolute;
        right: 14px;
        color: var(--muted-foreground);
        display: flex;
        align-items: center;
        pointer-events: none;
    }

    .actions-row {
        display: flex;
        gap: 14px;
        margin-top: auto;
        padding-top: 28px;
        border-top: 1px solid var(--border);
    }

    .btn-secondary {
        flex: 1;
        height: 48px;
        border: 1px solid var(--border);
        background: var(--background);
        color: var(--foreground);
        border-radius: 12px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        font-family: inherit;
        transition: background 0.15s;
    }

    .btn-secondary:hover {
        background: var(--muted);
    }

    .btn-secondary:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    .btn-primary {
        flex: 1;
        height: 48px;
        background: var(--primary);
        color: var(--primary-foreground);
        border: none;
        border-radius: 12px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        font-family: inherit;
        transition: opacity 0.15s;
    }

    .btn-primary:hover {
        opacity: 0.9;
    }

    .btn-primary:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    /* STORY VIEWER */
    .viewer-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.9);
        z-index: 100;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 20px;
    }

    .viewer-close {
        position: absolute;
        top: 20px;
        right: 20px;
        background: rgba(255, 255, 255, 0.15);
        border: none;
        color: #fff;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-family: inherit;
    }

    .viewer-info {
        display: flex;
        align-items: center;
        gap: 12px;
        color: #fff;
    }

    .viewer-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: var(--primary);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        font-weight: 700;
    }

    .viewer-username {
        font-size: 16px;
        font-weight: 600;
        color: #fff;
    }

    .viewer-time {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
    }

    .viewer-loading {
        color: rgba(255, 255, 255, 0.7);
        font-size: 15px;
    }

    .viewer-video {
        width: 320px;
        max-height: 60vh;
        border-radius: 16px;
        background: #000;
    }
</style>
