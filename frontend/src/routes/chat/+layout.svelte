<script lang="ts">
    import type {Snippet} from 'svelte';
    import {onMount} from 'svelte';
    import {goto} from '$app/navigation';
    import {auth} from '$lib/stores/auth';
    import {chat} from '$lib/stores/chat';
    import {connect} from '$lib/ws';

    let {children}: { children: Snippet } = $props();

    onMount(async () => {
        await auth.init();
        if (!$auth.userId) {
            goto('/login');
            return;
        }
        try {
            const token = localStorage.getItem('accessToken');
            if (token) connect(token).catch(() => {
            });
            chat.startListening();
            await Promise.all([chat.loadConversations(), chat.loadUsers(), chat.loadStories()]);

            // Restore conversation from hash after conversations are loaded
            const hash = window.location.hash.slice(1);
            if (hash && $chat.conversations.length > 0) {
                const exists = $chat.conversations.some(c => c.conversationId === hash);
                if (exists) {
                    await chat.openConversation(hash);
                } else {
                    window.history.replaceState(null, '', ' ');
                }
            }
        } catch {
            goto('/login');
        }
    });
</script>

{@render children()}
