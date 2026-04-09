<script lang="ts">
    import type {Conversation, Story} from '$lib/stores/chat';
    import {chat} from '$lib/stores/chat';
    import StoriesStrip from './StoriesStrip.svelte';
    import {formatTime, getAvatarUrl, getOtherParticipant} from '$lib/utils/chat';
    import {ChevronDown, LogOut, MessageSquarePlus, Search} from 'lucide-svelte';

    let {username, userId, conversations, stories, onOpenStory, onOpenStoryUpload, onSelectConv, onLogout}: {
        username: string;
        userId: string;
        conversations: Conversation[];
        stories: Story[];
        onOpenStory: (story: Story) => void;
        onOpenStoryUpload: () => void;
        onSelectConv: (conv: Conversation) => void;
        onLogout: () => void;
    } = $props();

    let mobNewChatOpen = $state(false);
    let mobConvsOpen = $state(true);
    let userSearchQuery = $state('');

    async function handleUserSearch() {
        await chat.loadUsers(userSearchQuery || undefined);
    }

    async function startChat(uid: string) {
        const convId = await chat.startConversation(uid);
        if (convId) {
            await chat.openConversation(convId);
            mobNewChatOpen = false;
        }
    }

    async function openNewChatSection() {
        mobNewChatOpen = !mobNewChatOpen;
        if (mobNewChatOpen) await chat.loadUsers();
    }

    function getFiltered() {
        return conversations.filter((c, i, arr) => {
            return arr.findIndex(x => x.conversationId === c.conversationId) === i;
        });
    }
</script>

<div class="mobile-home">
    <div class="mob-header">
        <div style="display:flex;align-items:center;gap:10px;">
            <img class="avatar" src={getAvatarUrl(username)} alt={username} />
            <div class="title">{username || 'User'}</div>
        </div>
        <button class="icon-btn" onclick={onLogout} title="Logout">
            <LogOut size={18}/>
        </button>
    </div>

    <div class="stories-section">
        <StoriesStrip {stories} onCreateStory={onOpenStoryUpload} onOpenStory={onOpenStory}/>
    </div>

    <!-- New conversation accordion -->
    <div class="section">
        <button class="section-hdr" onclick={openNewChatSection}>
            <span>New Conversation</span>
            <div class="chevron" class:open={mobNewChatOpen}>
                <ChevronDown size={16}/>
            </div>
        </button>
        {#if mobNewChatOpen}
            <div class="section-body">
                <div class="search-input">
                    <Search size={15}/>
                    <input type="text" bind:value={userSearchQuery} oninput={handleUserSearch}
                           placeholder="Search users…" autofocus
                           style="border:none;background:transparent;outline:none;flex:1;font-size:14px;color:var(--foreground);"/>
                </div>
                {#each $chat.users.filter(u => u.userId !== userId) as user}
                    <button class="list-item" onclick={() => startChat(user.userId)}>
                        <img class="d-avatar" src={getAvatarUrl(user.username)} alt={user.username} />
                        <div class="d-info">
                            <div class="d-name">{user.username}</div>
                        </div>
                        <MessageSquarePlus size={16} style="color:var(--muted-foreground);flex-shrink:0;"/>
                    </button>
                {/each}
                {#if $chat.users.filter(u => u.userId !== userId).length === 0}
                    <div class="empty-text">No users found</div>
                {/if}
            </div>
        {/if}
    </div>

    <!-- Conversations accordion -->
    <div class="section">
        <button class="section-hdr" onclick={() => mobConvsOpen = !mobConvsOpen}>
            <span>Chats</span>
            <div class="chevron" class:open={mobConvsOpen}>
                <ChevronDown size={16}/>
            </div>
        </button>
        {#if mobConvsOpen}
            <div class="section-body">
                {#each getFiltered() as conv (conv.conversationId)}
                    {@const other = getOtherParticipant(conv, userId)}
                    <button class="list-item" onclick={() => onSelectConv(conv)}>
                        <img class="d-avatar" src={getAvatarUrl(other.username)} alt={other.username} />
                        <div class="d-info">
                            <div class="d-top">
                                <div class="d-name">{other.username}</div>
                                {#if conv.lastMessage}
                                    <div class="d-time">{formatTime(conv.lastMessage.createdAt)}</div>
                                {/if}
                            </div>
                            <div class="d-sub">{conv.lastMessage ? conv.lastMessage.text : 'No messages yet'}</div>
                        </div>
                    </button>
                {/each}
                {#if conversations.length === 0 && !$chat.loading}
                    <div class="empty-text">No conversations yet.</div>
                {/if}
            </div>
        {/if}
    </div>
</div>

<style>
    .mobile-home {
        display: none;
        flex-direction: column;
        flex: 1;
        overflow-y: auto;
        background: var(--background);
    }

    @media (max-width: 768px) {
        .mobile-home {
            display: flex;
        }
    }

    .mob-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid var(--border);
        background: var(--card);
        flex-shrink: 0;
    }

    .avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: var(--primary);
        color: var(--primary-foreground);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 14px;
    }

    .title {
        font-weight: 600;
        font-size: 15px;
    }

    .icon-btn {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        border: none;
        background: transparent;
        color: var(--muted-foreground);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    }

    .stories-section {
        background: var(--card);
        border-bottom: 1px solid var(--border);
        flex-shrink: 0;
    }

    .section {
        border-bottom: 1px solid var(--border);
        background: var(--card);
    }

    .section-hdr {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 20px;
        background: transparent;
        border: none;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        color: var(--foreground);
        text-align: left;
    }

    .chevron {
        transition: transform 0.2s;
        color: var(--muted-foreground);
        display: flex;
    }

    .chevron.open {
        transform: rotate(180deg);
    }

    .section-body {
        padding: 4px 0 8px;
    }

    .search-input {
        display: flex;
        align-items: center;
        gap: 10px;
        background: var(--input);
        border-radius: 10px;
        padding: 10px 14px;
        color: var(--muted-foreground);
        margin: 0 12px 8px;
    }

    .list-item {
        padding: 12px 20px;
        display: flex;
        align-items: center;
        gap: 14px;
        cursor: pointer;
        border: none;
        background: transparent;
        width: 100%;
        text-align: left;
        transition: background 0.15s;
    }

    .list-item:hover {
        background: var(--input);
    }

    .d-avatar {
        width: 46px;
        height: 46px;
        border-radius: 50%;
        background: var(--primary);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--primary-foreground);
        font-weight: 700;
        font-size: 16px;
        flex-shrink: 0;
    }

    .d-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 3px;
    }

    .d-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .d-name {
        font-weight: 600;
        font-size: 15px;
        color: var(--foreground);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .d-time {
        font-size: 12px;
        color: var(--muted-foreground);
        flex-shrink: 0;
    }

    .d-sub {
        font-size: 13px;
        color: var(--muted-foreground);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .empty-text {
        text-align: center;
        color: var(--muted-foreground);
        font-size: 13px;
        padding: 16px;
    }
</style>
