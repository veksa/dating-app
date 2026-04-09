import {Injectable} from '@nestjs/common';
import {Story} from '../database/models/story.model';
import {User} from '../database/models/user.model';
import {EventService} from '../event/event.service';
import * as fs from 'fs';

const NewStoryEvent = 312;

@Injectable()
export class StoryService {
    constructor(private event: EventService) {
    }

    async createStory(userId: string, videoPath: string) {
        const user = await User.findById(userId);
        const username = user ? user.username : userId;
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const story = await Story.create({userId, username, videoPath, expiresAt});
        const result = {
            storyId: (story as any)._id.toString(),
            userId: story.userId,
            username: story.username,
            expiresAt: story.expiresAt.toISOString(),
            createdAt: story.createdAt.toISOString(),
        };
        void this.event.sendPublic({payloadType: NewStoryEvent, payload: {story: result}, clientMsgId: ''});
        return result;
    }

    async getActiveStories() {
        const stories = await Story.find({expiresAt: {$gt: new Date()}}).sort({createdAt: -1}).exec();
        return stories.map(s => ({
            storyId: (s as any)._id.toString(),
            userId: s.userId,
            username: s.username,
            expiresAt: s.expiresAt.toISOString(),
            createdAt: s.createdAt.toISOString(),
        }));
    }

    async getVideoPath(storyId: string): Promise<string | null> {
        const story = await Story.findById(storyId).exec();
        return story ? story.videoPath : null;
    }

    deleteVideoFile(videoPath: string): void {
        if (fs.existsSync(videoPath)) {
            fs.unlinkSync(videoPath);
        }
    }
}
