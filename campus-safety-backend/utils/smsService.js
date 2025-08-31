export const sendSMS = async (phone, message) => {
    try {
        // This would integrate with Twilio or similar SMS service
        // For now, we'll just log it
        console.log(`SMS to ${phone}:`, message);
        return true;
    } catch (error) {
        console.error('Error sending SMS:', error);
        return false;
    }
};

export default { sendSMS };