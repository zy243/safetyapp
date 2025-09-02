import mongoose from 'mongoose';

const trustedContactSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  email: String,
  relationship: {
    type: String,
    required: true
  },
  isPrimary: {
    type: Boolean,
    default: false
  },
  notificationsEnabled: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

trustedContactSchema.index({ user: 1 });

export default mongoose.model('TrustedContact', trustedContactSchema);