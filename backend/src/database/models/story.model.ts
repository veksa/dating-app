import mongoose, {Schema} from 'mongoose';

export interface IStory {
    userId: string;
    username: string;
    videoPath: string;
    expiresAt: Date;
    createdAt: Date;
}

const StorySchema = new Schema<IStory>({
    userId: {type: String, required: true},
    username: {type: String, required: true},
    videoPath: {type: String, required: true},
    expiresAt: {type: Date, required: true, expires: 0},
    createdAt: {type: Date, default: Date.now},
});

export const Story = mongoose.model<IStory>('Story', StorySchema);
