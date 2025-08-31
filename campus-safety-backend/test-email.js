// test-email.js - Test email functionality
const sendEmail = require('./utils/sendEmail');

async function testEmail() {
    try {
        console.log('🔍 Testing email functionality...');

        const testEmail = {
            email: 'test@example.com', // Replace with your real test email
            subject: 'Test Email from UniSave',
            message: `
        <h1>Test Email</h1>
        <p>This is a test email to verify the email service is working.</p>
      `
        };

        const result = await sendEmail(testEmail);

        if (result) {
            console.log('✅ Email sent successfully!');
        } else {
            console.warn('⚠️ Email function executed but sending failed.');
        }

    } catch (error) {
        console.error('❌ Email test failed:', error.message);
        console.log('\nMake sure you have configured your SMTP settings in .env file:');
        console.log('EMAIL_HOST=smtp.gmail.com');
        console.log('EMAIL_PORT=587');
        console.log('EMAIL_USER=your-email@gmail.com');
        console.log('EMAIL_PASS=your-app-password');
        console.log('EMAIL_NAME="Your Name"');
    }
}

testEmail();
