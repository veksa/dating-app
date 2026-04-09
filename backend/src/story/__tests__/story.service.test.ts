import {StoryService} from '../story.service';
import {EventService} from '../../event/event.service';
import {Story} from '../../database/models/story.model';
import {User} from '../../database/models/user.model';
import * as fs from 'fs';

jest.mock('../../event/event.service');
jest.mock('fs');

describe('StoryService', () => {
    let service: StoryService;
    let mockEventService: jest.Mocked<EventService>;

    beforeEach(() => {
        mockEventService = new EventService({get: jest.fn()}) as jest.Mocked<EventService>;
        mockEventService.sendPublic = jest.fn().mockResolvedValue(undefined);

        service = new StoryService(mockEventService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createStory', () => {
        it('should create a story with valid user', async () => {
            const mockUser = {_id: 'user123', username: 'testuser'};
            const mockStory = {
                _id: {toString: () => 'story123'},
                userId: 'user123',
                username: 'testuser',
                videoPath: '/path/to/video.mp4',
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                createdAt: new Date(),
            };

            (User.findById as jest.Mock).mockResolvedValue(mockUser);
            (Story.create as jest.Mock).mockResolvedValue(mockStory);

            const result = await service.createStory('user123', '/path/to/video.mp4');

            expect(result).toEqual({
                storyId: 'story123',
                userId: 'user123',
                username: 'testuser',
                expiresAt: mockStory.expiresAt.toISOString(),
                createdAt: mockStory.createdAt.toISOString(),
            });

            expect(Story.create).toHaveBeenCalledWith({
                userId: 'user123',
                username: 'testuser',
                videoPath: '/path/to/video.mp4',
                expiresAt: expect.any(Date),
            });

            expect(mockEventService.sendPublic).toHaveBeenCalledWith({
                payloadType: 312,
                payload: {story: expect.any(Object)},
                clientMsgId: '',
            });
        });

        it('should create a story with userId as username when user not found', async () => {
            const mockStory = {
                _id: {toString: () => 'story123'},
                userId: 'user123',
                username: 'user123',
                videoPath: '/path/to/video.mp4',
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                createdAt: new Date(),
            };

            (User.findById as jest.Mock).mockResolvedValue(null);
            (Story.create as jest.Mock).mockResolvedValue(mockStory);

            const result = await service.createStory('user123', '/path/to/video.mp4');

            expect(result.username).toBe('user123');
            expect(Story.create).toHaveBeenCalledWith({
                userId: 'user123',
                username: 'user123',
                videoPath: '/path/to/video.mp4',
                expiresAt: expect.any(Date),
            });
        });

        it('should set expiresAt to 24 hours from now', async () => {
            const mockUser = {_id: 'user123', username: 'testuser'};
            const mockStory = {
                _id: {toString: () => 'story123'},
                userId: 'user123',
                username: 'testuser',
                videoPath: '/path/to/video.mp4',
                expiresAt: new Date(),
                createdAt: new Date(),
            };

            (User.findById as jest.Mock).mockResolvedValue(mockUser);
            (Story.create as jest.Mock).mockImplementation((data) => {
                return Promise.resolve({
                    ...mockStory,
                    ...data,
                });
            });

            await service.createStory('user123', '/path/to/video.mp4');

            const createCall = (Story.create as jest.Mock).mock.calls[0][0];
            const expectedExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
            const timeDiff = Math.abs(createCall.expiresAt.getTime() - expectedExpiresAt.getTime());

            expect(timeDiff).toBeLessThan(1000); // Allow 1 second difference
        });
    });

    describe('getActiveStories', () => {
        it('should return only active stories (not expired)', async () => {
            const now = new Date();
            const mockStories = [
                {
                    _id: {toString: () => 'story1'},
                    userId: 'user1',
                    username: 'user1',
                    videoPath: '/path1.mp4',
                    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
                    createdAt: new Date(),
                },
                {
                    _id: {toString: () => 'story2'},
                    userId: 'user2',
                    username: 'user2',
                    videoPath: '/path2.mp4',
                    expiresAt: new Date(now.getTime() + 12 * 60 * 60 * 1000),
                    createdAt: new Date(),
                },
            ];

            (Story.find as jest.Mock).mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue(mockStories),
            });

            const result = await service.getActiveStories();

            expect(result).toHaveLength(2);
            expect(result[0].storyId).toBe('story1');
            expect(result[1].storyId).toBe('story2');

            expect(Story.find).toHaveBeenCalledWith({expiresAt: {$gt: expect.any(Date)}});
        });

        it('should return empty array when no active stories', async () => {
            (Story.find as jest.Mock).mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
            });

            const result = await service.getActiveStories();

            expect(result).toEqual([]);
        });

        it('should sort stories by createdAt in descending order', async () => {
            (Story.find as jest.Mock).mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
            });

            await service.getActiveStories();

            const sortMock = (Story.find as jest.Mock).mock.results[0].value.sort;
            expect(sortMock).toHaveBeenCalledWith({createdAt: -1});
        });

        it('should map story objects correctly', async () => {
            const now = new Date();
            const mockStory = {
                _id: {toString: () => 'story1'},
                userId: 'user1',
                username: 'user1',
                videoPath: '/path1.mp4',
                expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
                createdAt: new Date(),
            };

            (Story.find as jest.Mock).mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([mockStory]),
            });

            const result = await service.getActiveStories();

            expect(result[0]).toEqual({
                storyId: 'story1',
                userId: 'user1',
                username: 'user1',
                expiresAt: mockStory.expiresAt.toISOString(),
                createdAt: mockStory.createdAt.toISOString(),
            });
        });
    });

    describe('getVideoPath', () => {
        it('should return video path for valid story', async () => {
            const mockStory = {
                _id: 'story1',
                videoPath: '/path/to/video.mp4',
            };

            (Story.findById as jest.Mock).mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockStory),
            });

            const result = await service.getVideoPath('story1');

            expect(result).toBe('/path/to/video.mp4');
            expect(Story.findById).toHaveBeenCalledWith('story1');
        });

        it('should return null for non-existent story', async () => {
            (Story.findById as jest.Mock).mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            });

            const result = await service.getVideoPath('nonexistent');

            expect(result).toBeNull();
        });

        it('should return null when story is not found', async () => {
            (Story.findById as jest.Mock).mockReturnValue({
                exec: jest.fn().mockResolvedValue(undefined),
            });

            const result = await service.getVideoPath('story1');

            expect(result).toBeNull();
        });
    });

    describe('deleteVideoFile', () => {
        it('should delete file if it exists', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.unlinkSync as jest.Mock).mockReturnValue(undefined);

            service.deleteVideoFile('/path/to/video.mp4');

            expect(fs.existsSync).toHaveBeenCalledWith('/path/to/video.mp4');
            expect(fs.unlinkSync).toHaveBeenCalledWith('/path/to/video.mp4');
        });

        it('should not delete file if it does not exist', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            service.deleteVideoFile('/path/to/nonexistent.mp4');

            expect(fs.existsSync).toHaveBeenCalledWith('/path/to/nonexistent.mp4');
            expect(fs.unlinkSync).not.toHaveBeenCalled();
        });

        it('should handle file deletion errors', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.unlinkSync as jest.Mock).mockImplementation(() => {
                throw new Error('File deletion failed');
            });

            expect(() => service.deleteVideoFile('/path/to/video.mp4')).toThrow('File deletion failed');
        });
    });

    describe('integration', () => {
        it('should create story and get active stories', async () => {
            const mockUser = {_id: 'user123', username: 'testuser'};
            const mockStory = {
                _id: {toString: () => 'story123'},
                userId: 'user123',
                username: 'testuser',
                videoPath: '/path/to/video.mp4',
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                createdAt: new Date(),
            };

            (User.findById as jest.Mock).mockResolvedValue(mockUser);
            (Story.create as jest.Mock).mockResolvedValue(mockStory);
            (Story.find as jest.Mock).mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([mockStory]),
            });

            await service.createStory('user123', '/path/to/video.mp4');
            const activeStories = await service.getActiveStories();

            expect(activeStories).toHaveLength(1);
            expect(activeStories[0].storyId).toBe('story123');
        });
    });
});
