<script lang="ts">
    import type {Story} from '$lib/stores/chat';
    import {api} from '$lib/api';
    import {formatTime, getAvatarUrl} from '$lib/utils/chat';
    import {X} from 'lucide-svelte';

    let {story, onClose}: { story: Story; onClose: () => void } = $props();

    let videoUrl: string | null = $state(null);
    let loading = $state(true);

    $effect(() => {
        loading = true;
        videoUrl = null;
        api.stories.fetchVideo(story.storyId)
            .then(url => {
                videoUrl = url;
                loading = false;
            })
            .catch(() => {
                loading = false;
            });

        return () => {
            if (videoUrl) URL.revokeObjectURL(videoUrl);
        };
    });
</script>

<div class="story-overlay" onclick={onClose} role="dialog" aria-modal="true">
    <div class="sv-phone" onclick={(e) => e.stopPropagation()}>
        {#if loading}
            <div class="sv-loading">Loading…</div>
        {:else if videoUrl}
            <video src={videoUrl} autoplay controls playsinline
                   onended={onClose}
                   style="width:100%;height:100%;object-fit:cover;border-radius:22px;"/>
        {:else}
            <div class="sv-loading">Video unavailable</div>
        {/if}
        <div class="sv-overlay">
            <div class="sv-top">
                <div class="sv-user">
                    <img src={getAvatarUrl(story.username)}
                         alt={story.username} class="sv-avatar"/>
                    <div>
                        <div class="sv-username">{story.username}</div>
                        <div class="sv-time">{formatTime(story.createdAt)}</div>
                    </div>
                </div>
                <button class="close-btn" onclick={onClose}>
                    <X size={18}/>
                </button>
            </div>
        </div>
    </div>
</div>

<style>
    .story-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 24px;
    }

    .sv-phone {
        width: 320px;
        height: 568px;
        border-radius: 24px;
        background: #000;
        position: relative;
        overflow: hidden;
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
    }

    .sv-loading {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 15px;
    }

    .sv-overlay {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: linear-gradient(180deg, rgba(0, 0, 0, 0.55) 0%, rgba(0, 0, 0, 0) 25%);
        padding: 20px;
    }

    .sv-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        pointer-events: all;
    }

    .sv-user {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .sv-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.8);
    }

    .sv-username {
        font-size: 14px;
        font-weight: 600;
        color: #fff;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
    }

    .sv-time {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.75);
    }

    .close-btn {
        width: 36px;
        height: 36px;
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
</style>
