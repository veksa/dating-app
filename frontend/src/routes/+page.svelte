<script lang="ts">
    import {onMount} from 'svelte';
    import {goto} from '$app/navigation';
    import {auth} from '$lib/stores/auth';

    onMount(async () => {
        await auth.init();
        const state = $auth;
        if (state.userId) {
            goto('/chat');
        } else {
            goto('/login');
        }
    });
</script>

<div style="display:flex;align-items:center;justify-content:center;height:100vh">
    <span style="color:var(--text-muted)">Loading...</span>
</div>
