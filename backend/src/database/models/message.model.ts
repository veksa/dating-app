import mongoose, {Document, Schema, Types} from 'mongoose';

export interface IMessage extends Document {
    conversationId: Types.ObjectId;
    senderId: Types.ObjectId;
    text: string;
    createdAt: Date;
    updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
    {
        conversationId: {type: Schema.Types.ObjectId, ref: 'Conversation', required: true},
        senderId: {type: Schema.Types.ObjectId, ref: 'User', required: true},
        text: {type: String, required: true},
    },
    {timestamps: true},
);

messageSchema.index({conversationId: 1, createdAt: -1});

export const Message = mongoose.model<IMessage>('Message', messageSchema);
