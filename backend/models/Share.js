import mongoose from 'mongoose';

const shareSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true
    },
    userName: {
        type: String,
        required: true
    },
    active: {
        type: Boolean,
        default: true
    },
    expiresAt: Date
}, {
    timestamps: true
});

shareSchema.index({ token: 1 });
shareSchema.index({ userName: 1 });
shareSchema.index({ active: 1 });

const Share = mongoose.models.Share || mongoose.model('Share', shareSchema);
export default Share;
