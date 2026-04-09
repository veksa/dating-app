export interface IConversation {
    conversationId: string;
    participants: Array<{ userId: string; email: string; username: string }>;
    lastMessage?: {
        messageId: string;
        conversationId: string;
        senderId: string;
        senderUsername: string;
        text: string;
        createdAt: string;
    };
    updatedAt: string;
}

export interface IMessage {
    messageId: string;
    conversationId: string;
    senderId: string;
    senderUsername: string;
    text: string;
    createdAt: string;
}
