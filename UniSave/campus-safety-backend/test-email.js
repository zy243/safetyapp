// test-email.js - Test email functionality
import sendEmail from './utils/sendEmail.js';

async function testEmail() {
  try {
    console.log('Testing email functionality...');
    
    const testEmail = {
      email: 'test@example.com',
      subject: 'Test Email from UniSave',
      message: '<h1>Test Email</h1><p>This is a test email to verify the email service is working.</p>'
    };

    await sendEmail(testEmail);
    console.log('✅ Email sent successfully!');
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    console.log('\nMake sure you have configured your SMTP settings in .env file:');
    console.log('SMTP_HOST=smtp.gmail.com');
    console.log('SMTP_PORT=587');
    console.log('SMTP_USER=your-email@gmail.com');
    console.log('SMTP_PASS=your-app-password');
  }
}

testEmail();
