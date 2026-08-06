import mongoose, { Schema } from 'mongoose';
const settingsSchema = new Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    group: {
        type: String,
        enum: ['pay', 'system', 'smtp', 'notification'],
        required: true,
        index: true,
    },
    value: {
        type: Schema.Types.Mixed,
        required: true,
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
}, {
    timestamps: true,
});
export const Settings = mongoose.model('Settings', settingsSchema);
