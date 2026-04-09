<script lang="ts">
    import type {Conversation, Story} from '$lib/stores/chat';
    import {chat} from '$lib/stores/chat';
    import StoriesStrip from './StoriesStrip.svelte';
    import {formatTime, getAvatarUrl, getOtherParticipant} from '$lib/utils/chat';
    import {LogOut, MessageSquarePlus, Search, Trash2, X} from 'lucide-svelte';

    let {
        username,
        userId,
        conversations,
        stories,
        activeConversationId,
        onOpenStoryUpload,
        onOpenStory,
        onSelectConv,
        onLogout
    }: {
        username: string;
        userId: string;
        conversations: Conversation[];
        stories: Story[];
        activeConversationId: string | null;
        onOpenStoryUpload: () => void;
        onOpenStory: (story: Story) => void;
        onSelectConv: (conv: Conversation) => void;
        onLogout: () => void;
    } = $props();

    let showNewChat = $state(false);
    let convSearchQuery = $state('');
    let userSearchQuery = $state('');

    async function handleUserSearch() {
        await chat.loadUsers(userSearchQuery || undefined);
    }

    async function openNewChat() {
        showNewChat = true;
        userSearchQuery = '';
        await chat.loadUsers();
    }

    async function startChat(uid: string) {
        const convId = await chat.startConversation(uid);
        if (convId) {
            await chat.openConversation(convId);
            showNewChat = false;
        }
    }

    const filteredConversations = $derived((() => {
        const convs = convSearchQuery
            ? conversations.filter(c => {
                return c.participants.some(p => p.username.toLowerCase().includes(convSearchQuery.toLowerCase()));
            })
            : conversations;
        return convs.filter((c, i, arr) => arr.findIndex(x => x.conversationId === c.conversationId) === i);
    })());
</script>

<aside class="sidebar">
    <div class="header">
        <div class="profile">
            <img class="avatar" src={getAvatarUrl(username)} alt={username} />
            <div class="title">{username || 'User'}</div>
        </div>
        <button class="icon-btn" onclick={onLogout} title="Logout">
            <LogOut size={20}/>
        </button>
    </div>

    <div class="content">
        <StoriesStrip {stories} onCreateStory={onOpenStoryUpload} onOpenStory={onOpenStory}/>

        {#if !showNewChat}
            <div class="search-section">
                <div class="search-input">
                    <Search size={18}/>
                    <input type="text" bind:value={convSearchQuery}
                           placeholder="Search chats..."
                           style="border:none;background:transparent;outline:none;flex:1;font-size:14px;color:var(--foreground);"/>
                </div>
            </div>
        {/if}

        {#if showNewChat}
            <div class="list-container">
                <div class="section-label"
                     style="display:flex;justify-content:space-between;align-items:center;padding-right:20px;">
                    New Chat
                    <button class="icon-btn" style="width:28px;height:28px;" onclick={() => showNewChat = false}>
                        <X size={16}/>
                    </button>
                </div>
                <div style="padding:0 16px 12px;">
                    <div class="search-input">
                        <Search size={16}/>
                        <input type="text" bind:value={userSearchQuery} oninput={handleUserSearch}
                               placeholder="Search users..." autofocus
                               style="border:none;background:transparent;outline:none;flex:1;font-size:14px;color:var(--foreground);"/>
                    </div>
                </div>
                {#each $chat.users.filter(u => u.userId !== userId) as user}
                    <button class="list-item" onclick={() => startChat(user.userId)}>
                        <img class="d-avatar" src={getAvatarUrl(user.username)} alt={user.username} />
                        <div class="d-info">
                            <div class="d-name">{user.username}</div>
                            <div class="d-sub">@{user.username}</div>
                        </div>
                        <MessageSquarePlus size={18} style="color:var(--muted-foreground);flex-shrink:0;"/>
                    </button>
                {/each}
                {#if $chat.users.length === 0}
                    <div class="empty-text">No users found</div>
                {/if}
            </div>
        {:else}
            <div class="list-container">
                <div class="section-label">Recent Chats</div>
                {#each filteredConversations as conv (conv.conversationId)}
                    {@const other = getOtherParticipant(conv, userId)}
                    <div class="list-item-wrap">
                        <button class="list-item {activeConversationId === conv.conversationId ? 'active' : ''}"
                                onclick={() => onSelectConv(conv)}>
                            <img class="d-avatar" src={getAvatarUrl(other.username)} alt={other.username} />
                            <div class="d-info">
                                <div class="d-top">
                                    <div class="d-name">{other.username}</div>
                                    {#if conv.lastMessage}
                                        <div class="d-time">{formatTime(conv.lastMessage.createdAt)}</div>
                                    {/if}
                                </div>
                                <div class="d-sub">
                                    {conv.lastMessage ? conv.lastMessage.text : 'No messages yet'}
                                </div>
                            </div>
                        </button>
                        <button class="delete-btn" onclick={() => chat.deleteConversation(conv.conversationId)}
                                title="Delete chat">
                            <Trash2 size={15}/>
                        </button>
                    </div>
                {/each}
                {#if conversations.length === 0 && !$chat.loading}
                    <div class="empty-text">No conversations yet.</div>
                {/if}
                <div style="text-align:center;padding:16px;">
                    <button onclick={openNewChat} class="new-chat-btn">
                        Start a new chat
                    </button>
                </div>
            </div>
        {/if}
    </div>
</aside>

<style>
    .sidebar {
        width: 360px;
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        background: var(--card);
        border-right: 1px solid var(--border);
        height: 100vh;
        overflow: hidden;
    }

    .header {
        height: 72px;
        padding: 0 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid var(--border);
        flex-shrink: 0;
    }

    .profile {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: var(--primary);
        color: var(--primary-foreground);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 16px;
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
        transition: background 0.15s;
    }

    .icon-btn:hover {
        background: var(--input);
    }

    .content {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
    }

    .search-section {
        padding: 12px 16px;
        flex-shrink: 0;
    }

    .search-input {
        display: flex;
        align-items: center;
        gap: 10px;
        background: var(--input);
        border-radius: 10px;
        padding: 10px 14px;
        color: var(--muted-foreground);
    }

    .list-container {
        flex: 1;
        display: flex;
        flex-direction: column;
    }

    .section-label {
        padding: 12px 20px 8px;
        font-size: 11px;
        font-weight: 700;
        color: var(--muted-foreground);
        text-transform: uppercase;
        letter-spacing: 0.5px;
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
        border-radius: 10px;
        margin: 0 8px;
    }

    .list-item:hover {
        background: var(--input);
    }

    .list-item.active {
        background: var(--input);
    }

    .list-item-wrap {
        display: flex;
        align-items: center;
        position: relative;
    }

    .list-item-wrap:hover .delete-btn {
        opacity: 1;
    }

    .delete-btn {
        opacity: 0;
        position: absolute;
        right: 8px;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: var(--destructive);
        color: var(--destructive-foreground);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border: none;
        transition: opacity 0.15s;
        flex-shrink: 0;
    }

    .d-avatar {
        width: 52px;
        height: 52px;
        border-radius: 50%;
        background: var(--primary);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--primary-foreground);
        font-weight: 700;
        font-size: 18px;
        flex-shrink: 0;
    }

    .d-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
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
        padding: 32px 20px;
    }

    .new-chat-btn {
        background: var(--primary);
        color: var(--primary-foreground);
        border: none;
        border-radius: 8px;
        padding: 10px 20px;
        font-size: 14px;
        cursor: pointer;
        width: 100%;
    }

    @media (max-width: 900px) {
        .sidebar {
            width: 300px;
        }
    }

    @media (max-width: 768px) {
        .sidebar {
            display: none;
        }
    }
</style>
