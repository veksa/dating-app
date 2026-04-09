import {get, writable} from 'svelte/store';
import {api} from '../api';
import {onEvent} from '../ws';

export type User = { userId: string; email: string; username: string };
export type Message = {
    messageId: string;
    conversationId: string;
    senderId: string;
    senderUsername: string;
    text: string;
    createdAt: string
};
export type Conversation = { conversationId: string; participants: User[]; lastMessage?: Message; updatedAt: string };
export type Story = {
    storyId: string;
    userId: string;
    username: string;
    videoPath?: string;
    expiresAt: string;
    createdAt: string;
};

export type ChatState = {
    users: User[];
    conversations: Conversation[];
    activeConversationId: string | null;
    messages: Message[];
    stories: Story[];
    loading: boolean;
    error: string | null;
};

const NewMessageEvent = 310;
const ConversationDeletedEvent = 311;
const NewStoryEvent = 312;

function createChatStore() {
    const store = writable<ChatState>({
        users: [],
        conversations: [],
        activeConversationId: null,
        messages: [],
        stories: [],
        loading: false,
        error: null,
    });

    const {subscribe, update} = store;

    let unsubNewMessage: (() => void) | null = null;
    let unsubConvDeleted: (() => void) | null = null;
    let unsubNewStory: (() => void) | null = null;
    const fetchingConvs = new Set<string>();
    const processedMsgIds = new Set<string>();

    function startListening() {
        unsubNewMessage?.();
        unsubConvDeleted?.();
        unsubNewStory?.();

        const processedDeletes = new Set<string>();
        unsubConvDeleted = onEvent(ConversationDeletedEvent, (msg) => {
            const {conversationId} = msg.payload as { conversationId: string };
            if (processedDeletes.has(conversationId)) return;
            processedDeletes.add(conversationId);
            setTimeout(() => processedDeletes.delete(conversationId), 5000);
            update(s => ({
                ...s,
                conversations: s.conversations.filter(c => c.conversationId !== conversationId),
                activeConversationId: s.activeConversationId === conversationId ? null : s.activeConversationId,
                messages: s.activeConversationId === conversationId ? [] : s.messages,
            }));
        });
        unsubNewMessage = onEvent(NewMessageEvent, async (msg) => {
            const {message} = msg.payload as { message: Message };
            if (processedMsgIds.has(message.messageId)) return;
            processedMsgIds.add(message.messageId);
            if (processedMsgIds.size > 200) {
                const first = processedMsgIds.values().next().value;
                processedMsgIds.delete(first);
            }
            const state = get(store);
            const convId = state.activeConversationId;
            const knownConv = state.conversations.find(c => c.conversationId === message.conversationId);

            if (!knownConv) {
                if (fetchingConvs.has(message.conversationId)) return;
                fetchingConvs.add(message.conversationId);
                try {
                    const res = await api.conversations.get(message.conversationId);
                    const conversation = res.conversation as Conversation;
                    update(s => {
                        if (s.conversations.some(c => c.conversationId === conversation.conversationId)) return s;
                        const newConvs = [conversation, ...s.conversations];
                        const deduped = newConvs.filter((c, i, arr) => arr.findIndex(x => x.conversationId === c.conversationId) === i);
                        return {
                            ...s,
                            conversations: deduped,
                            messages: convId === message.conversationId ? [...s.messages, message] : s.messages,
                        };
                    });
                } catch {
                } finally {
                    fetchingConvs.delete(message.conversationId);
                }
                return;
            }

            update(s => {
                const updatedConvs = s.conversations
                    .map(c => c.conversationId === message.conversationId
                        ? {...c, lastMessage: message, updatedAt: message.createdAt}
                        : c
                    )
                    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
                const deduped = updatedConvs.filter((c, i, arr) => arr.findIndex(x => x.conversationId === c.conversationId) === i);
                return {
                    ...s,
                    conversations: deduped,
                    messages: convId === message.conversationId ? [...s.messages, message] : s.messages,
                };
            });
        });

        unsubNewStory = onEvent(NewStoryEvent, (msg) => {
            const {story} = msg.payload as { story: Story };
            update(s => {
                if (s.stories.some(st => st.storyId === story.storyId)) return s;
                return {...s, stories: [story, ...s.stories]};
            });
        });
    }

    function stopListening() {
        unsubNewMessage?.();
        unsubNewMessage = null;
        unsubConvDeleted?.();
        unsubConvDeleted = null;
        unsubNewStory?.();
        unsubNewStory = null;
    }

    async function loadUsers(search?: string) {
        try {
            const res = await api.users.list(search);
            update(s => ({...s, users: res.users}));
        } catch (e) {
            update(s => ({...s, error: String(e)}));
        }
    }

    async function loadConversations() {
        update(s => ({...s, loading: true}));
        try {
            const res = await api.conversations.list();
            const convs = res.conversations as Conversation[];
            const deduped = convs.filter((c, i, arr) => arr.findIndex(x => x.conversationId === c.conversationId) === i);
            if (deduped.length !== convs.length) {
                console.warn('loadConversations: deduped from', convs.length, 'to', deduped.length);
            }
            update(s => ({...s, conversations: deduped, loading: false}));
        } catch (e) {
            update(s => ({...s, error: String(e), loading: false}));
        }
    }

    async function loadStories() {
        try {
            const res = await api.stories.list();
            update(s => ({...s, stories: res.stories as Story[]}));
        } catch (e) {
            update(s => ({...s, error: String(e)}));
        }
    }

    async function createStory(videoBlob: Blob): Promise<Story | null> {
        try {
            const res = await api.stories.upload(videoBlob);
            const story = res as Story;
            update(s => ({...s, stories: [story, ...s.stories]}));
            return story;
        } catch (e) {
            update(s => ({...s, error: String(e)}));
            return null;
        }
    }

    async function openConversation(conversationId: string) {
        update(s => ({...s, activeConversationId: conversationId, messages: [], loading: true}));
        try {
            const res = await api.conversations.messages(conversationId, 50);
            update(s => ({...s, messages: res.messages as Message[], loading: false}));
        } catch (e) {
            update(s => ({...s, error: String(e), loading: false}));
        }
    }

    async function startConversation(userId: string): Promise<string | null> {
        try {
            const res = await api.conversations.create(userId);
            const conversation = res.conversation as Conversation;
            update(s => {
                const exists = s.conversations.some(c => c.conversationId === conversation.conversationId);
                if (exists) return s;
                const newConvs = [conversation, ...s.conversations];
                const deduped = newConvs.filter((c, i, arr) => arr.findIndex(x => x.conversationId === c.conversationId) === i);
                if (deduped.length !== newConvs.length) {
                    console.warn('startConversation: deduped from', newConvs.length, 'to', deduped.length);
                }
                return {...s, conversations: deduped};
            });
            return conversation.conversationId;
        } catch (e) {
            update(s => ({...s, error: String(e)}));
            return null;
        }
    }

    async function deleteConversation(conversationId: string) {
        try {
            await api.conversations.delete(conversationId);
        } catch (e) {
            update(s => ({...s, error: String(e)}));
        }
    }

    async function sendMessage(conversationId: string, text: string) {
        try {
            const res = await api.conversations.sendMessage(conversationId, text);
            const message = res.message as Message;
            update(s => {
                const updatedConvs = s.conversations
                    .map(c => c.conversationId === conversationId
                        ? {...c, lastMessage: message, updatedAt: message.createdAt}
                        : c
                    )
                    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
                const deduped = updatedConvs.filter((c, i, arr) => arr.findIndex(x => x.conversationId === c.conversationId) === i);
                if (deduped.length !== updatedConvs.length) {
                    console.warn('sendMessage: deduped from', updatedConvs.length, 'to', deduped.length);
                }
                return {
                    ...s,
                    messages: [...s.messages, message],
                    conversations: deduped,
                };
            });
        } catch (e) {
            update(s => ({...s, error: String(e)}));
        }
    }

    function clearActiveConversation() {
        update(s => ({...s, activeConversationId: null, messages: []}));
    }

    function reset() {
        store.set({
            users: [],
            conversations: [],
            activeConversationId: null,
            messages: [],
            stories: [],
            loading: false,
            error: null
        });
        stopListening();
    }

    return {
        subscribe,
        startListening,
        stopListening,
        loadUsers,
        loadConversations,
        loadStories,
        createStory,
        openConversation,
        clearActiveConversation,
        startConversation,
        deleteConversation,
        sendMessage,
        reset,
    };
}

export const chat = createChatStore();
