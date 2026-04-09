<script lang="ts">
    import {chat} from '$lib/stores/chat';
    import {tick} from 'svelte';
    import {ChevronDown, Clock, FlipHorizontal, X} from 'lucide-svelte';

    let {onClose}: { onClose: () => void } = $props();

    let cameraStream: MediaStream | null = $state(null);
    let mediaRecorder: MediaRecorder | null = null;
    let isRecording = $state(false);
    let recordingTime = $state(0);
    let recordingTimerRef: ReturnType<typeof setInterval> | null = null;
    let recordedBlob: Blob | null = null;
    let previewUrl: string | null = $state(null);
    let isPosting = $state(false);
    let cameraEl: HTMLVideoElement;
    let videoDevices: MediaDeviceInfo[] = $state([]);
    let selectedVideoId = $state('');
    let facingFront = $state(true);

    $effect(() => {
        startCamera();
        return () => cleanup();
    });

    async function startCamera() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            videoDevices = devices.filter(d => d.kind === 'videoinput');
            if (!selectedVideoId && videoDevices.length) selectedVideoId = videoDevices[0].deviceId;
            if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
            const stream = await navigator.mediaDevices.getUserMedia({
                video: selectedVideoId ? {deviceId: {exact: selectedVideoId}} : true,
                audio: true,
            });
            cameraStream = stream;
            await tick();
            if (cameraEl) cameraEl.srcObject = stream;
        } catch (e) {
            console.error('Camera error:', e);
        }
    }

    async function flipCamera() {
        facingFront = !facingFront;
        if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {facingMode: facingFront ? 'user' : 'environment'},
                audio: true,
            });
            cameraStream = stream;
            if (cameraEl) cameraEl.srcObject = stream;
        } catch {
        }
    }

    function startRecording() {
        if (!cameraStream) return;
        recordedBlob = null;
        previewUrl = null;
        const chunks: BlobPart[] = [];
        mediaRecorder = new MediaRecorder(cameraStream);
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };
        mediaRecorder.onstop = () => {
            recordedBlob = new Blob(chunks, {type: 'video/webm'});
            previewUrl = URL.createObjectURL(recordedBlob);
        };
        mediaRecorder.start();
        isRecording = true;
        recordingTime = 0;
        recordingTimerRef = setInterval(() => {
            recordingTime++;
            if (recordingTime >= 15) stopRecording();
        }, 1000);
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
        isRecording = false;
        if (recordingTimerRef) {
            clearInterval(recordingTimerRef);
            recordingTimerRef = null;
        }
    }

    function retake() {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            previewUrl = null;
        }
        recordedBlob = null;
        recordingTime = 0;
    }

    async function postStory() {
        if (!recordedBlob) return;
        isPosting = true;
        const story = await chat.createStory(recordedBlob);
        isPosting = false;
        if (story) closeRecorder();
    }

    function closeRecorder() {
        cleanup();
        onClose();
    }

    function cleanup() {
        stopRecording();
        if (cameraStream) {
            cameraStream.getTracks().forEach(t => t.stop());
            cameraStream = null;
        }
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            previewUrl = null;
        }
        recordedBlob = null;
        recordingTime = 0;
    }
</script>

<div class="recorder-overlay">
    <div class="recorder-dialog">
        <div class="workspace">

            <!-- Camera panel -->
            <div class="camera-wrapper">
                <div class="camera-view">
                    {#if previewUrl}
                        <video src={previewUrl} autoplay loop playsinline
                               style="width:100%;height:100%;object-fit:cover;border-radius:22px;"/>
                    {:else}
                        <video bind:this={cameraEl} autoplay playsinline muted
                               style="width:100%;height:100%;object-fit:cover;border-radius:22px;"/>
                    {/if}

                    {#if !previewUrl}
                        <div class="cam-overlay">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width:{(recordingTime / 15) * 100}%"></div>
                            </div>
                            <div class="top-row">
                                <div style="width:44px;"></div>
                                {#if isRecording}
                                    <div class="timer-badge">
                                        <div class="red-dot"></div>
                                        {String(Math.floor(recordingTime / 60)).padStart(2, '0')}
                                        :{String(recordingTime % 60).padStart(2, '0')} / 00:15
                                    </div>
                                {:else}
                                    <div style="width:120px;"></div>
                                {/if}
                                <button class="cam-btn" onclick={flipCamera} title="Flip camera">
                                    <FlipHorizontal size={20}/>
                                </button>
                            </div>
                            <div class="bottom-row">
                                <button class="record-outer" onclick={isRecording ? stopRecording : startRecording}>
                                    {#if isRecording}
                                        <div class="record-stop"></div>
                                    {:else}
                                        <div class="record-start"></div>
                                    {/if}
                                </button>
                                <div class="record-hint">
                                    {isRecording ? 'Recording… tap to stop' : 'Tap to record'}
                                </div>
                            </div>
                        </div>
                    {/if}
                </div>
            </div>

            <!-- Settings panel -->
            <div class="settings-panel">
                <div class="panel-header">
                    <h3>Record Story</h3>
                    <button class="icon-btn" onclick={closeRecorder}>
                        <X size={18}/>
                    </button>
                </div>

                <div class="info-box">
                    <Clock size={22} style="color:var(--muted-foreground);flex-shrink:0;margin-top:2px;"/>
                    <div>
                        <div class="info-title">Auto-deletes in 24h</div>
                        <div class="info-text">Your story will automatically disappear from the feed after 24 hours.
                        </div>
                    </div>
                </div>

                {#if videoDevices.length > 1}
                    <div class="field">
                        <label class="field-label">Camera Input</label>
                        <div class="select-wrap">
                            <select class="select" bind:value={selectedVideoId} onchange={startCamera}>
                                {#each videoDevices as d, i}
                                    <option value={d.deviceId}>{d.label || 'Camera ' + (i + 1)}</option>
                                {/each}
                            </select>
                            <ChevronDown size={16}
                                         style="position:absolute;right:12px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--muted-foreground);"/>
                        </div>
                    </div>
                {/if}

                {#if previewUrl}
                    <div class="preview-note">✅ {recordingTime}s recorded — ready to post</div>
                    <button class="btn-retake" onclick={retake}>Retake</button>
                {:else if !cameraStream}
                    <div class="cam-error">Camera not available. Check permissions.</div>
                {/if}

                <div class="actions">
                    <button class="btn-cancel" onclick={closeRecorder}>Cancel</button>
                    <button class="btn-post" onclick={postStory} disabled={!previewUrl || isPosting}>
                        {isPosting ? 'Posting…' : 'Post Story'}
                    </button>
                </div>
            </div>

        </div>
    </div>
</div>

<style>
    .recorder-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 24px;
    }

    .recorder-dialog {
        background: var(--card);
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        max-height: 90vh;
        overflow-y: auto;
    }

    .workspace {
        display: flex;
    }

    .camera-wrapper {
        padding: 16px;
        background: var(--card);
        flex-shrink: 0;
    }

    .camera-view {
        width: 280px;
        height: 496px;
        border-radius: 22px;
        background: #111;
        position: relative;
        overflow: hidden;
    }

    .cam-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        padding: 20px;
        background: linear-gradient(180deg, rgba(0, 0, 0, 0.45) 0%, rgba(0, 0, 0, 0) 18%, rgba(0, 0, 0, 0) 68%, rgba(0, 0, 0, 0.6) 100%);
    }

    .progress-bar {
        width: 100%;
        height: 3px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 2px;
        overflow: hidden;
    }

    .progress-fill {
        height: 100%;
        background: #ef4444;
        border-radius: 2px;
        transition: width 0.3s linear;
    }

    .top-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 14px;
    }

    .cam-btn {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.35);
        backdrop-filter: blur(8px);
        color: #fff;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    }

    .timer-badge {
        background: rgba(0, 0, 0, 0.35);
        backdrop-filter: blur(8px);
        color: #fff;
        padding: 6px 14px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
        font-variant-numeric: tabular-nums;
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
            opacity: 0.3;
        }
    }

    .bottom-row {
        margin-top: auto;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
    }

    .record-outer {
        width: 68px;
        height: 68px;
        border-radius: 50%;
        border: 4px solid rgba(255, 255, 255, 0.9);
        background: transparent;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform 0.1s;
    }

    .record-outer:active {
        transform: scale(0.95);
    }

    .record-start {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: #ef4444;
    }

    .record-stop {
        width: 22px;
        height: 22px;
        border-radius: 5px;
        background: #ef4444;
    }

    .record-hint {
        color: rgba(255, 255, 255, 0.9);
        font-size: 13px;
        font-weight: 500;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
    }

    .settings-panel {
        width: 340px;
        padding: 32px;
        display: flex;
        flex-direction: column;
        gap: 24px;
        border-left: 1px solid var(--border);
    }

    .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .panel-header h3 {
        margin: 0;
        font-size: 20px;
        font-weight: 700;
    }

    .icon-btn {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        border: none;
        background: var(--input);
        color: var(--foreground);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    }

    .info-box {
        display: flex;
        gap: 14px;
        padding: 16px;
        background: var(--secondary);
        border-radius: 12px;
        align-items: flex-start;
    }

    .info-title {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 4px;
    }

    .info-text {
        font-size: 13px;
        color: var(--muted-foreground);
        line-height: 1.5;
    }

    .field {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .field-label {
        font-size: 13px;
        font-weight: 600;
    }

    .select-wrap {
        position: relative;
    }

    .select {
        width: 100%;
        height: 44px;
        border: 1px solid var(--border);
        border-radius: 10px;
        background: var(--background);
        padding: 0 36px 0 14px;
        font-size: 14px;
        color: var(--foreground);
        cursor: pointer;
        appearance: none;
        -webkit-appearance: none;
    }

    .preview-note {
        font-size: 14px;
        color: #10b981;
        font-weight: 500;
    }

    .cam-error {
        color: var(--destructive);
        font-size: 13px;
    }

    .btn-retake {
        background: transparent;
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 8px 16px;
        font-size: 13px;
        cursor: pointer;
        color: var(--foreground);
    }

    .actions {
        display: flex;
        gap: 12px;
        margin-top: auto;
        padding-top: 24px;
        border-top: 1px solid var(--border);
    }

    .btn-cancel {
        flex: 1;
        height: 46px;
        border: 1px solid var(--border);
        background: var(--background);
        color: var(--foreground);
        border-radius: 10px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
    }

    .btn-post {
        flex: 1;
        height: 46px;
        background: var(--primary);
        color: var(--primary-foreground);
        border: none;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.2s;
    }

    .btn-post:disabled {
        opacity: 0.45;
        cursor: not-allowed;
    }

    @media (max-width: 680px) {
        .recorder-overlay {
            padding: 0;
            align-items: stretch;
        }

        .recorder-dialog {
            border-radius: 0;
            width: 100%;
            height: 100%;
            max-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        .workspace {
            flex-direction: column;
            flex: 1;
        }

        .camera-wrapper {
            display: flex;
            justify-content: center;
            padding: 16px;
            background: #000;
        }

        .camera-view {
            width: 100%;
            max-width: 360px;
            height: 55vw;
            min-height: 320px;
        }

        .settings-panel {
            width: 100%;
            border-left: none;
            border-top: 1px solid var(--border);
            padding: 20px;
            gap: 16px;
        }
    }
</style>
