// models/Contact.js
import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema(
    {
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
        relationship: String,
        isPrimary: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

const Contact = mongoose.models.Contact || mongoose.model('Contact', contactSchema);
export default Contact;

