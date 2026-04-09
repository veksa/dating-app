import {Injectable} from '@nestjs/common';
import {EventService} from '../event/event.service';
import {throwErrorMessage} from '../_helpers/throwErrorMessage';
import {User} from '../database/models/user.model';
import {Conversation} from '../database/models/conversation.model';
import {ConversationMember} from '../database/models/conversationMember.model';
import {Message} from '../database/models/message.model';
import {Types} from 'mongoose';
import {IConversation, IMessage} from "./chat.interface";

@Injectable()
export class ChatService {
    constructor(private event: EventService) {
    }

    public async getUsers(search?: string) {
        const query: { deleted: boolean; username?: RegExp } = {deleted: false};
        if (search) {
            query.username = new RegExp(search, 'i');
        }

        const users = await User.find(query).limit(50).sort({username: 1}).exec();
        return {
            users: users.map(u => ({
                userId: u._id.toString(),
                email: u.email,
                username: u.username,
            })),
        };
    }

    public async getConversations(userId: string) {
        const memberships = await ConversationMember.find({userId: new Types.ObjectId(userId)})
            .populate('conversationId')
            .sort({conversationId: -1})
            .exec();

        const validMemberships = memberships.filter(m => m.conversationId);

        const conversationIds = validMemberships.map(m => m.conversationId._id.toString());

        const allMembers = await ConversationMember.find({
            conversationId: {$in: conversationIds},
        })
            .populate('userId')
            .exec();

        const lastMessages = await Message.aggregate([
            {$match: {conversationId: {$in: conversationIds.map(id => new Types.ObjectId(id))}}},
            {$sort: {createdAt: -1}},
            {$group: {_id: '$conversationId', doc: {$first: '$$ROOT'}}},
            {$replaceRoot: {newRoot: '$doc'}},
        ]);
        const lastMsgIds = lastMessages.map(m => m._id);
        const populatedMessages = await Message.find({_id: {$in: lastMsgIds}}).populate('senderId').exec();
        const lastMsgMap = new Map(populatedMessages.map(m => [m.conversationId.toString(), m]));

        const conversations: IConversation[] = validMemberships.map(m => {
            const conv = m.conversationId as any;
            const convId = conv._id.toString();
            const members = allMembers.filter(cm => (cm.conversationId as any)?._id?.toString() === convId);
            const lastMsg = lastMsgMap.get(convId);

            return {
                conversationId: convId,
                participants: members.map(mb => ({
                    userId: (mb.userId as any)?._id?.toString() || mb.userId,
                    email: (mb.userId as any)?.email || '',
                    username: (mb.userId as any)?.username || 'Unknown',
                })),
                lastMessage: lastMsg ? {
                    messageId: (lastMsg as any)._id.toString(),
                    conversationId: lastMsg.conversationId.toString(),
                    senderId: (lastMsg.senderId as any)?._id?.toString() || lastMsg.senderId,
                    senderUsername: (lastMsg.senderId as any)?.username || 'Unknown',
                    text: lastMsg.text,
                    createdAt: lastMsg.createdAt.toISOString(),
                } : undefined,
                updatedAt: conv.updatedAt.toISOString(),
            };
        });

        return {conversations};
    }

    public async createConversation(userId: string, targetUserId: string) {
        if (!targetUserId) {
            throwErrorMessage({
                errorCode: 'INVALID_REQUEST',
                description: 'targetUserId should be specified'
            });
        }

        if (userId === targetUserId) {
            throwErrorMessage({
                errorCode: 'INVALID_REQUEST',
                description: 'Cannot create conversation with yourself'
            });
        }

        const targetUser = await User.findOne({_id: new Types.ObjectId(targetUserId), deleted: false});
        if (!targetUser) {
            throwErrorMessage({errorCode: 'USER_DOES_NOT_EXISTS'});
        }

        const myMemberships = await ConversationMember.find({userId: new Types.ObjectId(userId)});
        const myConvIds = myMemberships.map(m => m.conversationId);

        const existingShared = await ConversationMember.findOne({
            conversationId: {$in: myConvIds},
            userId: new Types.ObjectId(targetUserId),
        });

        if (existingShared) {
            return {conversation: await this.mapConversation(existingShared.conversationId.toString())};
        }

        const conv = await Conversation.create({});
        await ConversationMember.create([
            {conversationId: conv._id, userId: new Types.ObjectId(userId)},
            {conversationId: conv._id, userId: new Types.ObjectId(targetUserId)},
        ]);

        return {conversation: await this.mapConversation(conv._id.toString())};
    }

    public async deleteConversation(userId: string, conversationId: string) {
        const member = await ConversationMember.findOne({
            conversationId: new Types.ObjectId(conversationId),
            userId: new Types.ObjectId(userId)
        });
        if (!member) {
            throwErrorMessage({errorCode: 'ACCESS_DENIED'});
        }

        const allMembers = await ConversationMember.find({conversationId: new Types.ObjectId(conversationId)});

        await Message.deleteMany({conversationId: new Types.ObjectId(conversationId)});
        await ConversationMember.deleteMany({conversationId: new Types.ObjectId(conversationId)});
        await Conversation.findByIdAndDelete(new Types.ObjectId(conversationId));

        for (const m of allMembers) {
            void this.event.sendPrivate({
                payloadType: 311,
                payload: {conversationId},
                clientMsgId: '',
                userId: m.userId.toString(),
            });
        }

        return {success: true};
    }

    public async getConversation(userId: string, conversationId: string) {
        const member = await ConversationMember.findOne({
            conversationId: new Types.ObjectId(conversationId),
            userId: new Types.ObjectId(userId)
        });
        if (!member) {
            throwErrorMessage({errorCode: 'ACCESS_DENIED'});
        }

        return {conversation: await this.mapConversation(conversationId)};
    }

    public async getMessages(userId: string, conversationId: string, limit = 50, before?: string) {
        if (!conversationId) {
            throwErrorMessage({
                errorCode: 'INVALID_REQUEST',
                description: 'conversationId should be specified'
            });
        }

        const member = await ConversationMember.findOne({
            conversationId: new Types.ObjectId(conversationId),
            userId: new Types.ObjectId(userId)
        });
        if (!member) {
            throwErrorMessage({errorCode: 'ACCESS_DENIED'});
        }

        const query: {
            conversationId: Types.ObjectId;
            createdAt?: { $lt: Date }
        } = {conversationId: new Types.ObjectId(conversationId)};
        if (before) query.createdAt = {$lt: new Date(before)};

        const messages = await Message.find(query)
            .populate('senderId')
            .sort({createdAt: -1})
            .limit(limit)
            .exec();

        return {
            messages: messages.reverse().map(m => ({
                messageId: (m as any)._id.toString(),
                conversationId: m.conversationId.toString(),
                senderId: (m.senderId as any)?._id?.toString() || m.senderId,
                senderUsername: (m.senderId as any)?.username || 'Unknown',
                text: m.text,
                createdAt: m.createdAt.toISOString(),
            })),
        };
    }

    public async sendMessage(userId: string, conversationId: string, text: string) {
        if (!conversationId) {
            throwErrorMessage({
                errorCode: 'INVALID_REQUEST',
                description: 'conversationId should be specified'
            });
        }
        if (!text?.trim()) {
            throwErrorMessage({
                errorCode: 'INVALID_REQUEST',
                description: 'Message text should not be empty'
            });
        }

        const member = await ConversationMember.findOne({
            conversationId: new Types.ObjectId(conversationId),
            userId: new Types.ObjectId(userId)
        });
        if (!member) {
            throwErrorMessage({errorCode: 'ACCESS_DENIED'});
        }

        const message = await Message.create({
            conversationId: new Types.ObjectId(conversationId),
            senderId: new Types.ObjectId(userId),
            text: text.trim(),
        }).then(m => m.populate('senderId'));

        await Conversation.findByIdAndUpdate(new Types.ObjectId(conversationId), {updatedAt: new Date()});

        const protoMessage: IMessage = {
            messageId: (message as any)._id.toString(),
            conversationId: message.conversationId.toString(),
            senderId: (message.senderId as any)?._id?.toString() || message.senderId,
            senderUsername: (message.senderId as any)?.username || 'Unknown',
            text: message.text,
            createdAt: message.createdAt.toISOString(),
        };

        const otherMembers = await ConversationMember.find({
            conversationId: new Types.ObjectId(conversationId),
            userId: {$ne: new Types.ObjectId(userId)},
        });

        for (const other of otherMembers) {
            void this.event.sendPrivate({
                payloadType: 310,
                payload: {message: protoMessage},
                clientMsgId: '',
                userId: other.userId.toString(),
            });
        }

        return {message: protoMessage};
    }

    private async mapConversation(conversationId: string): Promise<IConversation> {
        const conv = await Conversation.findById(new Types.ObjectId(conversationId));
        if (!conv) {
            throwErrorMessage({errorCode: 'NOT_FOUND'});
        }

        const members = await ConversationMember.find({conversationId: new Types.ObjectId(conversationId)}).populate('userId');
        const lastMsg = await Message.findOne({conversationId: new Types.ObjectId(conversationId)})
            .sort({createdAt: -1})
            .populate('senderId')
            .exec();

        return {
            conversationId: conv._id.toString(),
            participants: members.map(m => ({
                userId: (m.userId as any)?._id?.toString() || m.userId,
                email: (m.userId as any)?.email || '',
                username: (m.userId as any)?.username || 'Unknown',
            })),
            lastMessage: lastMsg ? {
                messageId: (lastMsg as any)._id.toString(),
                conversationId: lastMsg.conversationId.toString(),
                senderId: (lastMsg.senderId as any)?._id?.toString() || lastMsg.senderId,
                senderUsername: (lastMsg.senderId as any)?.username || 'Unknown',
                text: lastMsg.text,
                createdAt: lastMsg.createdAt.toISOString(),
            } : undefined,
            updatedAt: conv.updatedAt.toISOString(),
        };
    }
}
