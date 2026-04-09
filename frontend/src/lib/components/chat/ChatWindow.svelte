<script lang="ts">
    import type {Conversation, Message} from '$lib/stores/chat';
    import {formatMessageTime, getAvatarUrl, getOtherParticipant} from '$lib/utils/chat';
    import {ArrowLeft, Send} from 'lucide-svelte';
    import {tick} from 'svelte';

    let {conversation, messages, loading, userId, onBack, onSend}: {
        conversation: Conversation;
        messages: Message[];
        loading: boolean;
        userId: string;
        onBack: () => void;
        onSend: (text: string) => Promise<void>;
    } = $props();

    let messageText = $state('');
    let messagesEl: HTMLElement;

    const other = $derived(getOtherParticipant(conversation, userId));

    $effect(() => {
        if (messages.length > 0) {
            tick().then(() => {
                if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
            });
        }
    });

    async function handleSend(e: SubmitEvent) {
        e.preventDefault();
        const text = messageText.trim();
        if (!text) return;
        messageText = '';
        await onSend(text);
    }
</script>

<div class="chat-header">
    <button class="back-btn" onclick={onBack}>
        <ArrowLeft size={22}/>
    </button>
    <div class="user-info">
        <img class="c-avatar" src={getAvatarUrl(other.username)} alt={other.username} />
        <div class="c-details">
            <div class="c-name">{other.username}</div>
            <div class="c-status">Online</div>
        </div>
    </div>
    <div></div>
</div>

<div class="chat-scroll" bind:this={messagesEl}>
    {#if loading}
        <div class="loading-text">Loading messages...</div>
    {/if}
    {#each messages as msg (msg.messageId)}
        {@const isOwn = msg.senderId === userId}
        <div class="msg-row {isOwn ? 'out' : 'in'}">
            <div class="msg-bubble">{msg.text}</div>
            <div class="msg-time">{formatMessageTime(msg.createdAt)}</div>
        </div>
    {/each}
    {#if messages.length === 0 && !loading}
        <div class="empty-msgs">No messages yet. Say hello! 👋</div>
    {/if}
</div>

<form class="chat-footer" onsubmit={handleSend}>
    <div class="composer">
        <input
                class="composer-input"
                type="text"
                bind:value={messageText}
                placeholder="Send a text message..."
                autocomplete="off"
        />
        <button class="send-btn" type="submit" disabled={!messageText.trim()}>
            <Send size={18}/>
        </button>
    </div>
</form>

<style>
    .chat-header {
        height: 72px;
        padding: 0 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: var(--card);
        border-bottom: 1px solid var(--border);
        flex-shrink: 0;
    }

    .back-btn {
        display: none;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        cursor: pointer;
        color: var(--foreground);
        padding: 8px;
        margin-right: 4px;
        flex-shrink: 0;
    }

    .user-info {
        display: flex;
        align-items: center;
        gap: 14px;
    }

    .c-avatar {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: var(--primary);
        color: var(--primary-foreground);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 16px;
        flex-shrink: 0;
    }

    .c-details {
        display: flex;
        flex-direction: column;
    }

    .c-name {
        font-weight: 600;
        font-size: 16px;
    }

    .c-status {
        font-size: 12px;
        color: #10b981;
    }

    .chat-scroll {
        flex: 1;
        overflow-y: auto;
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .loading-text {
        text-align: center;
        color: var(--muted-foreground);
        font-size: 13px;
        padding: 20px;
    }

    .empty-msgs {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--muted-foreground);
        font-size: 14px;
    }

    .msg-row {
        display: flex;
        flex-direction: column;
        max-width: 72%;
        margin-bottom: 8px;
    }

    .msg-row.out {
        align-items: flex-end;
        align-self: flex-end;
    }

    .msg-row.in {
        align-items: flex-start;
        align-self: flex-start;
    }

    .msg-bubble {
        padding: 10px 16px;
        border-radius: 18px;
        font-size: 15px;
        line-height: 1.5;
        word-break: break-word;
    }

    .msg-row.out .msg-bubble {
        background: var(--primary);
        color: var(--primary-foreground);
        border-bottom-right-radius: 4px;
    }

    .msg-row.in .msg-bubble {
        background: var(--input);
        color: var(--foreground);
        border-bottom-left-radius: 4px;
    }

    .msg-time {
        font-size: 11px;
        color: var(--muted-foreground);
        margin-top: 6px;
        margin-left: 4px;
        margin-right: 4px;
    }

    .chat-footer {
        padding: 20px 24px;
        background: var(--card);
        border-top: 1px solid var(--border);
        flex-shrink: 0;
    }

    .composer {
        display: flex;
        align-items: center;
        gap: 12px;
        background: var(--input);
        border-radius: 24px;
        padding: 8px 8px 8px 20px;
    }

    .composer-input {
        flex: 1;
        font-size: 15px;
        color: var(--foreground);
        background: transparent;
        border: none;
        outline: none;
    }

    .composer-input::placeholder {
        color: var(--muted-foreground);
    }

    .send-btn {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: var(--primary);
        color: var(--primary-foreground);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        flex-shrink: 0;
        border: none;
        transition: opacity 0.15s;
    }

    .send-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    @media (max-width: 768px) {
        .back-btn {
            display: flex !important;
        }

        .chat-header {
            padding-left: 4px;
        }
    }
</style>
