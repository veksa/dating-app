import mongoose, {Document, Schema} from 'mongoose';

export interface IUser extends Document {
    email: string;
    username: string;
    passwordHash: string;
    temporary: boolean;
    deleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<IUser>(
    {
        email: {type: String, required: true, unique: true},
        username: {type: String, required: true, unique: true},
        passwordHash: {type: String, required: true},
        temporary: {type: Boolean, default: false},
        deleted: {type: Boolean, default: false},
    },
    {timestamps: true},
);

userSchema.index({deleted: 1});

export const User = mongoose.model<IUser>('User', userSchema);
