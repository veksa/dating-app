<script lang="ts">
    import {auth} from '$lib/stores/auth';
    import {chat, type Conversation, type Story} from '$lib/stores/chat';
    import {goto} from '$app/navigation';
    import ChatSidebar from '$lib/components/chat/ChatSidebar.svelte';
    import ChatWindow from '$lib/components/chat/ChatWindow.svelte';
    import MobileHome from '$lib/components/chat/MobileHome.svelte';
    import StoryRecorder from '$lib/components/chat/StoryRecorder.svelte';
    import StoryViewer from '$lib/components/chat/StoryViewer.svelte';

    let showStoryRecorder = $state(false);
    let viewingStory: Story | null = $state(null);

    let everHadConversation = $state(false);

    $effect(() => {
        const convId = $chat.activeConversationId;
        if (convId) {
            everHadConversation = true;
            window.location.hash = convId;
        } else if (everHadConversation) {
            window.history.replaceState(null, '', ' ');
        }
    });

    const activeConv = $derived(
        $chat.conversations.find(c => c.conversationId === $chat.activeConversationId)
    );

    async function handleLogout() {
        chat.reset();
        await auth.logout();
        goto('/login');
    }

    async function selectConversation(conv: Conversation) {
        await chat.openConversation(conv.conversationId);
    }


</script>

<div class="layout">
    <ChatSidebar
        username={$auth.username || ''}
        userId={$auth.userId || ''}
        conversations={$chat.conversations}
        stories={$chat.stories}
        activeConversationId={$chat.activeConversationId}
        onOpenStoryUpload={() => showStoryRecorder = true}
        onOpenStory={(s) => viewingStory = s}
        onSelectConv={selectConversation}
        onLogout={handleLogout}
    />

    <main class="main-chat">
        {#if $chat.activeConversationId && activeConv}
            <ChatWindow
                conversation={activeConv}
                messages={$chat.messages}
                loading={$chat.loading}
                userId={$auth.userId || ''}
                onBack={() => chat.clearActiveConversation()}
                onSend={(text) => chat.sendMessage($chat.activeConversationId!, text)}
            />
        {:else}
            <div class="desktop-placeholder">
                <div style="font-size:56px;">💬</div>
                <h2>Select a conversation</h2>
                <p>Choose an existing chat or start a new one</p>
            </div>
            <MobileHome
                username={$auth.username || ''}
                userId={$auth.userId || ''}
                conversations={$chat.conversations}
                stories={$chat.stories}
                onOpenStory={(s) => viewingStory = s}
                onOpenStoryUpload={() => showStoryRecorder = true}
                onSelectConv={selectConversation}
                onLogout={handleLogout}
            />
        {/if}
    </main>

    {#if viewingStory}
        <StoryViewer story={viewingStory} onClose={() => viewingStory = null}/>
    {/if}

    {#if showStoryRecorder}
        <StoryRecorder onClose={() => showStoryRecorder = false}/>
    {/if}
</div>

<style>
    .layout {
        display: flex;
        height: 100vh;
        overflow: hidden;
        background: var(--background);
    }

    .main-chat {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        min-width: 0;
    }

    .desktop-placeholder {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        color: var(--muted-foreground);
    }

    .desktop-placeholder h2 {
        font-size: 20px;
        color: var(--foreground);
        margin: 0;
    }

    .desktop-placeholder p {
        font-size: 14px;
        margin: 0;
    }

    @media (max-width: 768px) {
        .desktop-placeholder {
            display: none;
        }
    }
</style>
