import type {Conversation} from '$lib/stores/chat';

export function formatTime(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    }
    return d.toLocaleDateString([], {month: 'short', day: 'numeric'});
}

export function formatMessageTime(iso: string): string {
    return new Date(iso).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
}

export function getAvatarUrl(username: string): string {
    const seed = username || 'default';
    return `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed)}`;
}

export function getOtherParticipant(conv: Conversation, userId: string) {
    return conv.participants.find(p => p.userId !== userId) ?? conv.participants[0];
}
