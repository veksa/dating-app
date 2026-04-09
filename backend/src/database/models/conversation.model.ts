import mongoose, {Document, Schema} from 'mongoose';

export interface IConversation extends Document {
    createdAt: Date;
    updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
    {},
    {timestamps: true},
);

export const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);
