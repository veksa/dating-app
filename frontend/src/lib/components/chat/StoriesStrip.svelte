<script lang="ts">
    import type {Story} from '$lib/stores/chat';
    import {getAvatarUrl} from '$lib/utils/chat';
    import {Plus} from 'lucide-svelte';

    let {stories, onCreateStory, onOpenStory}: {
        stories: Story[];
        onCreateStory: () => void;
        onOpenStory: (story: Story) => void;
    } = $props();
</script>

<div class="stories-wrap">
    <div class="story">
        <div class="story-ring add">
            <button class="story-add-btn" title="Create story" onclick={onCreateStory}>
                <Plus size={24}/>
            </button>
        </div>
        <div class="story-name">Create story</div>
    </div>
    {#each stories as story}
        <button class="story story-btn" onclick={() => onOpenStory(story)}>
            <div class="story-ring">
                <img class="story-img"
                     src={getAvatarUrl(story.username)}
                     alt={story.username}>
            </div>
            <div class="story-name">{story.username}</div>
        </button>
    {/each}
</div>

<style>
    .stories-wrap {
        display: flex;
        gap: 12px;
        padding: 16px;
        overflow-x: auto;
        scrollbar-width: none;
        flex-shrink: 0;
    }

    .stories-wrap::-webkit-scrollbar {
        display: none;
    }

    .story {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
    }

    .story-btn {
        background: transparent;
        border: none;
        padding: 0;
        cursor: pointer;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
    }

    .story-ring {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: linear-gradient(135deg, #f97316, #ec4899);
        padding: 2px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .story-ring.add {
        background: var(--input);
    }

    .story-img {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        border: 2px solid var(--card);
        object-fit: cover;
    }

    .story-name {
        font-size: 11px;
        color: var(--muted-foreground);
        max-width: 56px;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .story-add-btn {
        width: 52px;
        height: 52px;
        border-radius: 50%;
        background: var(--input);
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: var(--foreground);
        transition: background 0.15s;
    }

    .story-add-btn:hover {
        background: var(--border);
    }
</style>
