import mongoose, {Document, Schema, Types} from 'mongoose';

export interface IConversationMember extends Document {
    conversationId: Types.ObjectId;
    userId: Types.ObjectId;
}

const conversationMemberSchema = new Schema<IConversationMember>(
    {
        conversationId: {type: Schema.Types.ObjectId, ref: 'Conversation', required: true},
        userId: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    },
    {timestamps: false},
);

conversationMemberSchema.index({conversationId: 1, userId: 1}, {unique: true});
conversationMemberSchema.index({userId: 1});

export const ConversationMember = mongoose.model<IConversationMember>('ConversationMember', conversationMemberSchema);
