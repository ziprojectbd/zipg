import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
const userSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 8,
        select: false,
    },
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 120,
    },
    role: {
        type: String,
        enum: ['super_admin', 'admin', 'operator'],
        default: 'operator',
    },
    avatar: String,
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
    lastLoginAt: Date,
    lastLoginIp: String,
    refreshToken: {
        type: String,
        select: false,
    },
}, {
    timestamps: true,
    toJSON: {
        transform(_doc, ret) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password: _p, refreshToken: _r, __v: _v, ...clean } = ret;
            return clean;
        },
    },
});
userSchema.pre('save', async function (next) {
    if (!this.isModified('password'))
        return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};
userSchema.index({ role: 1, isActive: 1 });
export const User = mongoose.model('User', userSchema);
