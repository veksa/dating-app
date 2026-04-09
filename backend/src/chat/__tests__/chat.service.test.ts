import {ChatService} from '../chat.service';
import {EventService} from '../../event/event.service';
import {User} from '../../database/models/user.model';
import {Conversation} from '../../database/models/conversation.model';
import {ConversationMember} from '../../database/models/conversationMember.model';
import {Message} from '../../database/models/message.model';
import {Types} from 'mongoose';

// Mock dependencies
jest.mock('../../event/event.service');

// Mock Mongoose models with factory functions
jest.mock('../../database/models/user.model', () => ({
    User: {
        find: jest.fn(),
        findOne: jest.fn(),
    },
}));

jest.mock('../../database/models/conversation.model', () => ({
    Conversation: {
        find: jest.fn(),
        findOne: jest.fn(),
        findById: jest.fn(),
        create: jest.fn(),
        findByIdAndUpdate: jest.fn(),
        findByIdAndDelete: jest.fn(),
    },
}));

jest.mock('../../database/models/conversationMember.model', () => ({
    ConversationMember: {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
    },
}));

jest.mock('../../database/models/message.model', () => ({
    Message: {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
        aggregate: jest.fn(),
    },
}));

describe('ChatService', () => {
    let service: ChatService;
    let mockEventService: jest.Mocked<EventService>;

    beforeEach(() => {
        mockEventService = new EventService({get: jest.fn()}) as jest.Mocked<EventService>;
        mockEventService.sendPrivate = jest.fn().mockResolvedValue(undefined);

        // Setup default mock implementations for Mongoose models
        const createMockQuery = (returnValue: any[] = []) => {
            const query = {
                limit: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                populate: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue(returnValue),
            };
            // Make it thenable for direct awaits
            (query as any).then = jest.fn((resolve: any) => resolve(returnValue));
            return query;
        };

        (User.find as jest.Mock).mockReturnValue(createMockQuery());
        (User.findOne as jest.Mock).mockResolvedValue(null);
        (Conversation.find as jest.Mock).mockReturnValue(createMockQuery());
        (Conversation.findOne as jest.Mock).mockResolvedValue(null);
        (Conversation.findById as jest.Mock).mockResolvedValue(null);
        (Conversation.create as jest.Mock).mockResolvedValue({_id: new Types.ObjectId()});
        (Conversation.findByIdAndUpdate as jest.Mock).mockResolvedValue({});
        (Conversation.findByIdAndDelete as jest.Mock).mockResolvedValue({});
        (ConversationMember.find as jest.Mock).mockReturnValue(createMockQuery());
        (ConversationMember.findOne as jest.Mock).mockResolvedValue(null);
        (ConversationMember.create as jest.Mock).mockResolvedValue([]);
        (ConversationMember.deleteMany as jest.Mock).mockResolvedValue({});
        (Message.find as jest.Mock).mockReturnValue(createMockQuery());
        (Message.findOne as jest.Mock).mockReturnValue(createMockQuery());
        (Message.create as jest.Mock).mockResolvedValue({_id: new Types.ObjectId()});
        (Message.deleteMany as jest.Mock).mockResolvedValue({});
        (Message.aggregate as jest.Mock).mockResolvedValue([]);

        service = new ChatService(mockEventService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getUsers', () => {
        it('should return all users when no search term is provided', async () => {
            const mockUsers = [
                {_id: new Types.ObjectId('507f1f77bcf86cd799439011'), email: 'user1@example.com', username: 'user1'},
                {_id: new Types.ObjectId('507f1f77bcf86cd799439012'), email: 'user2@example.com', username: 'user2'},
            ];

            (User.find as jest.Mock).mockReturnValue({
                limit: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue(mockUsers),
            });

            const result = await service.getUsers();

            expect(result).toEqual({
                users: [
                    {userId: '507f1f77bcf86cd799439011', email: 'user1@example.com', username: 'user1'},
                    {userId: '507f1f77bcf86cd799439012', email: 'user2@example.com', username: 'user2'},
                ],
            });

            expect(User.find).toHaveBeenCalledWith({deleted: false});
        });

        it('should return filtered users when search term is provided', async () => {
            const mockUsers = [
                {_id: new Types.ObjectId('507f1f77bcf86cd799439011'), email: 'user1@example.com', username: 'user1'},
            ];

            const query = {
                limit: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue(mockUsers),
            };
            (User.find as jest.Mock).mockReturnValue(query);

            const result = await service.getUsers('user1');

            expect(result).toEqual({
                users: [
                    {userId: '507f1f77bcf86cd799439011', email: 'user1@example.com', username: 'user1'},
                ],
            });

            expect(User.find).toHaveBeenCalledWith({deleted: false, username: expect.any(RegExp)});
        });

        it('should limit results to 50 users', async () => {
            (User.find as jest.Mock).mockReturnValue({
                limit: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
            });

            await service.getUsers();

            const limitMock = (User.find as jest.Mock).mock.results[0].value.limit;
            expect(limitMock).toHaveBeenCalledWith(50);
        });

        it('should sort users by username', async () => {
            const query = {
                limit: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
            };
            (User.find as jest.Mock).mockReturnValue(query);

            await service.getUsers();

            expect(query.sort).toHaveBeenCalledWith({username: 1});
        });
    });

    describe('createConversation', () => {
        it('should throw error if targetUserId is not provided', async () => {
            await expect(service.createConversation('user1', ''))
                .rejects.toThrow('targetUserId should be specified');
        });

        it('should throw error if trying to create conversation with self', async () => {
            await expect(service.createConversation('user1', 'user1'))
                .rejects.toThrow('Cannot create conversation with yourself');
        });

        it('should throw error if target user does not exist', async () => {
            (User.findOne as jest.Mock).mockResolvedValue(null);

            await expect(service.createConversation('user1', 'user2'))
                .rejects.toThrow('USER_DOES_NOT_EXISTS');
        });

        it('should return existing conversation if it already exists', async () => {
            const mockTargetUser = {_id: new Types.ObjectId('507f1f77bcf86cd799439012')};
            const mockConv = {_id: new Types.ObjectId('507f1f77bcf86cd799439020'), updatedAt: new Date()};
            const mockMember = {conversationId: mockConv};
            const mockMembers = [
                {userId: mockTargetUser, conversationId: mockConv},
            ];

            (User.findOne as jest.Mock).mockResolvedValue(mockTargetUser);
            (ConversationMember.find as jest.Mock).mockReturnValueOnce({
                then: jest.fn((resolve: any) => resolve([{conversationId: mockConv._id}])),
                exec: jest.fn().mockResolvedValue([{conversationId: mockConv._id}]),
            });
            (ConversationMember.findOne as jest.Mock).mockResolvedValue(mockMember);
            (Conversation.findById as jest.Mock).mockResolvedValue(mockConv);
            (ConversationMember.find as jest.Mock).mockReturnValueOnce({
                populate: jest.fn().mockReturnThis(),
                then: jest.fn((resolve: any) => resolve(mockMembers)),
                exec: jest.fn().mockResolvedValue(mockMembers),
            });
            (Message.findOne as jest.Mock).mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                populate: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue(null),
            });

            const result = await service.createConversation('user1', 'user2');

            expect(result).toBeDefined();
            expect(Conversation.create).not.toHaveBeenCalled();
        });

        it('should create new conversation if it does not exist', async () => {
            const mockTargetUser = {_id: new Types.ObjectId('507f1f77bcf86cd799439012')};
            const mockConv = {_id: new Types.ObjectId('507f1f77bcf86cd799439020'), updatedAt: new Date()};
            const mockMembers = [
                {userId: mockTargetUser, conversationId: mockConv},
            ];

            (User.findOne as jest.Mock).mockResolvedValue(mockTargetUser);
            (ConversationMember.find as jest.Mock).mockReturnValueOnce({
                then: jest.fn((resolve: any) => resolve([])),
                exec: jest.fn().mockResolvedValue([]),
            });
            (Conversation.create as jest.Mock).mockResolvedValue(mockConv);
            (ConversationMember.create as jest.Mock).mockResolvedValue([]);
            (Conversation.findById as jest.Mock).mockResolvedValue(mockConv);
            const query = {
                populate: jest.fn().mockReturnThis(),
                then: jest.fn((resolve: any) => resolve(mockMembers)),
                exec: jest.fn().mockResolvedValue(mockMembers),
            };
            (ConversationMember.find as jest.Mock).mockReturnValueOnce(query);
            const msgQuery = {
                sort: jest.fn().mockReturnThis(),
                populate: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue(null),
            };
            (Message.findOne as jest.Mock).mockReturnValue(msgQuery);

            const result = await service.createConversation('user1', 'user2');

            expect(Conversation.create).toHaveBeenCalled();
            expect(ConversationMember.create).toHaveBeenCalled();
            expect(result).toBeDefined();
        });
    });

    describe('getConversations', () => {
        it('should return user conversations', async () => {
            const mockConv = {_id: new Types.ObjectId('507f1f77bcf86cd799439020'), updatedAt: new Date()};
            const mockMember = {conversationId: mockConv};
            const mockMembers = [
                {userId: {_id: 'user1', email: 'user1@example.com', username: 'user1'}, conversationId: mockConv},
            ];

            const query1 = {
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([mockMember]),
            };
            (ConversationMember.find as jest.Mock).mockReturnValueOnce(query1);

            const query2 = {
                populate: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue(mockMembers),
            };
            (ConversationMember.find as jest.Mock).mockReturnValueOnce(query2);

            (Message.aggregate as jest.Mock).mockResolvedValue([]);
            (Message.find as jest.Mock).mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
            });

            const result = await service.getConversations('user1');

            expect(result).toBeDefined();
            expect(result.conversations).toBeDefined();
        });

        it('should handle empty conversations list', async () => {
            const query = {
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
            };
            (ConversationMember.find as jest.Mock).mockReturnValue(query);

            const result = await service.getConversations('user1');

            expect(result.conversations).toEqual([]);
        });
    });

    describe('getConversation', () => {
        it('should throw error if user is not a member', async () => {
            (ConversationMember.findOne as jest.Mock).mockResolvedValue(null);

            await expect(service.getConversation('user1', 'conv1'))
                .rejects.toThrow('ACCESS_DENIED');
        });

        it('should return conversation if user is a member', async () => {
            const mockConv = {_id: new Types.ObjectId('507f1f77bcf86cd799439020'), updatedAt: new Date()};
            const mockMember = {conversationId: mockConv};
            const mockMembers = [
                {userId: {_id: 'user1', email: 'user1@example.com', username: 'user1'}, conversationId: mockConv},
            ];

            (ConversationMember.findOne as jest.Mock).mockResolvedValue(mockMember);
            (Conversation.findById as jest.Mock).mockResolvedValue(mockConv);
            (ConversationMember.find as jest.Mock).mockReturnValueOnce({
                populate: jest.fn().mockReturnThis(),
                then: jest.fn((resolve: any) => resolve(mockMembers)),
                exec: jest.fn().mockResolvedValue(mockMembers),
            });
            (Message.findOne as jest.Mock).mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                populate: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue(null),
            });

            const result = await service.getConversation('user1', 'conv1');

            expect(result).toBeDefined();
            expect(result.conversation.participants).toHaveLength(1);
        });
    });

    describe('getMessages', () => {
        it('should throw error if conversationId is not provided', async () => {
            await expect(service.getMessages('user1', '', 50))
                .rejects.toThrow('conversationId should be specified');
        });

        it('should throw error if user is not a member', async () => {
            (ConversationMember.findOne as jest.Mock).mockResolvedValue(null);

            await expect(service.getMessages('user1', 'conv1', 50))
                .rejects.toThrow('ACCESS_DENIED');
        });

        it('should return messages if user is a member', async () => {
            const mockMember = {conversationId: new Types.ObjectId()};
            const mockMessages = [
                {
                    _id: new Types.ObjectId(),
                    conversationId: new Types.ObjectId(),
                    senderId: {_id: 'user1', username: 'user1'},
                    text: 'Hello',
                    createdAt: new Date()
                },
            ];

            (ConversationMember.findOne as jest.Mock).mockResolvedValue(mockMember);
            (Message.find as jest.Mock).mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue(mockMessages),
            });

            const result = await service.getMessages('user1', 'conv1', 50);

            expect(result).toBeDefined();
            expect(result.messages).toBeDefined();
        });

        it('should use default limit of 50', async () => {
            const mockMember = {conversationId: new Types.ObjectId()};

            (ConversationMember.findOne as jest.Mock).mockResolvedValue(mockMember);
            (Message.find as jest.Mock).mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
            });

            await service.getMessages('user1', 'conv1');

            const limitMock = (Message.find as jest.Mock).mock.results[0].value.sort.mock.results[0].value.limit;
            expect(limitMock).toHaveBeenCalledWith(50);
        });

        it('should use custom limit if provided', async () => {
            const mockMember = {conversationId: new Types.ObjectId()};

            (ConversationMember.findOne as jest.Mock).mockResolvedValue(mockMember);
            (Message.find as jest.Mock).mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
            });

            await service.getMessages('user1', 'conv1', 100);

            const limitMock = (Message.find as jest.Mock).mock.results[0].value.sort.mock.results[0].value.limit;
            expect(limitMock).toHaveBeenCalledWith(100);
        });
    });

    describe('sendMessage', () => {
        it('should throw error if conversationId is not provided', async () => {
            await expect(service.sendMessage('user1', '', 'Hello'))
                .rejects.toThrow('conversationId should be specified');
        });

        it('should throw error if text is empty', async () => {
            await expect(service.sendMessage('user1', 'conv1', ''))
                .rejects.toThrow('Message text should not be empty');
        });

        it('should throw error if text is only whitespace', async () => {
            await expect(service.sendMessage('user1', 'conv1', '   '))
                .rejects.toThrow('Message text should not be empty');
        });

        it('should throw error if user is not a member', async () => {
            (ConversationMember.findOne as jest.Mock).mockResolvedValue(null);

            await expect(service.sendMessage('user1', 'conv1', 'Hello'))
                .rejects.toThrow('ACCESS_DENIED');
        });

        it('should send message and notify other members', async () => {
            const mockMember = {conversationId: new Types.ObjectId()};
            const mockMessage = {
                _id: new Types.ObjectId(),
                conversationId: new Types.ObjectId(),
                senderId: {_id: 'user1', username: 'user1'},
                text: 'Hello',
                createdAt: new Date(),
            };

            (ConversationMember.findOne as jest.Mock).mockResolvedValue(mockMember);
            (Message.create as jest.Mock).mockResolvedValue({
                populate: jest.fn().mockResolvedValue(mockMessage),
            });
            (Conversation.findByIdAndUpdate as jest.Mock).mockResolvedValue({});
            (ConversationMember.find as jest.Mock).mockReturnValue({
                then: jest.fn((resolve: any) => resolve([{userId: new Types.ObjectId('507f1f77bcf86cd799439012')}])),
                exec: jest.fn().mockResolvedValue([{userId: new Types.ObjectId('507f1f77bcf86cd799439012')}]),
            });

            const result = await service.sendMessage('user1', 'conv1', 'Hello');

            expect(result).toBeDefined();
            expect(mockEventService.sendPrivate).toHaveBeenCalled();
        });
    });

    describe('deleteConversation', () => {
        it('should throw error if user is not a member', async () => {
            (ConversationMember.findOne as jest.Mock).mockResolvedValue(null);

            await expect(service.deleteConversation('user1', 'conv1'))
                .rejects.toThrow('ACCESS_DENIED');
        });

        it('should delete conversation and notify members', async () => {
            const mockMember = {conversationId: new Types.ObjectId()};
            const mockAllMembers = [
                {userId: new Types.ObjectId('507f1f77bcf86cd799439011')},
                {userId: new Types.ObjectId('507f1f77bcf86cd799439012')},
            ];

            (ConversationMember.findOne as jest.Mock).mockResolvedValue(mockMember);
            (ConversationMember.find as jest.Mock).mockReturnValue({
                then: jest.fn((resolve: any) => resolve(mockAllMembers)),
                exec: jest.fn().mockResolvedValue(mockAllMembers),
            });
            (Message.deleteMany as jest.Mock).mockResolvedValue({});
            (ConversationMember.deleteMany as jest.Mock).mockResolvedValue({});
            (Conversation.findByIdAndDelete as jest.Mock).mockResolvedValue({});

            const result = await service.deleteConversation('user1', 'conv1');

            expect(result).toEqual({success: true});
            expect(Message.deleteMany).toHaveBeenCalled();
            expect(ConversationMember.deleteMany).toHaveBeenCalled();
            expect(Conversation.findByIdAndDelete).toHaveBeenCalled();
            expect(mockEventService.sendPrivate).toHaveBeenCalledTimes(2);
        });
    });
});
