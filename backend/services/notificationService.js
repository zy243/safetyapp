import { Expo } from 'expo-server-sdk';
import nodemailer from 'nodemailer';

// Initialize Expo SDK
const expo = new Expo();

// Email transporter configuration
const createEmailTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Send push notification
export const sendPushNotification = async (pushToken, notification) => {
  try {
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error('Invalid push token:', pushToken);
      return false;
    }

    const message = {
      to: pushToken,
      sound: 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      priority: 'high',
      channelId: 'unisafe-notifications'
    };

    const chunks = expo.chunkPushNotifications([message]);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending push notification chunk:', error);
      }
    }

    return tickets;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
};

// Send email notification
export const sendEmailNotification = async (email, subject, html, text) => {
  try {
    const transporter = createEmailTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      html: html,
      text: text
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent:', result.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

// Send SMS notification (placeholder - would need SMS service integration)
export const sendSMSNotification = async (phoneNumber, message) => {
  try {
    // This would integrate with an SMS service like Twilio
    console.log(`SMS to ${phoneNumber}: ${message}`);
    return true;
  } catch (error) {
    console.error('Error sending SMS:', error);
    return false;
  }
};

// Send guardian activation notification
export const sendGuardianActivationNotification = async (contacts, studentName, destination) => {
  const promises = [];

  for (const contact of contacts) {
    // Push notification
    if (contact.pushToken) {
      promises.push(
        sendPushNotification(contact.pushToken, {
          title: 'Guardian Mode Activated',
          body: `${studentName} has activated Guardian mode and is traveling to ${destination}`,
          data: {
            type: 'guardian_activated',
            studentName,
            destination
          }
        })
      );
    }

    // Email notification
    if (contact.email) {
      const html = `
        <h2>Guardian Mode Activated</h2>
        <p><strong>${studentName}</strong> has activated Guardian mode and is traveling to <strong>${destination}</strong>.</p>
        <p>You can monitor their journey in real-time through the UniSafe app.</p>
        <p>Stay safe!</p>
      `;
      
      promises.push(
        sendEmailNotification(
          contact.email,
          'Guardian Mode Activated - UniSafe',
          html,
          `${studentName} has activated Guardian mode and is traveling to ${destination}.`
        )
      );
    }
  }

  await Promise.allSettled(promises);
};

// Send emergency notification
export const sendEmergencyNotification = async (contacts, studentName, location, alertType = 'SOS') => {
  const promises = [];

  for (const contact of contacts) {
    // Push notification
    if (contact.pushToken) {
      promises.push(
        sendPushNotification(contact.pushToken, {
          title: `🚨 ${alertType} Alert`,
          body: `${studentName} has sent an ${alertType} alert and may need immediate help`,
          data: {
            type: 'emergency_alert',
            studentName,
            location,
            alertType
          }
        })
      );
    }

    // Email notification
    if (contact.email) {
      const html = `
        <h2>🚨 ${alertType} Alert - Emergency</h2>
        <p><strong>${studentName}</strong> has sent an ${alertType} alert and may need immediate help.</p>
        <p><strong>Location:</strong> ${location.latitude}, ${location.longitude}</p>
        <p>Please check the UniSafe app for more details and take appropriate action.</p>
      `;
      
      promises.push(
        sendEmailNotification(
          contact.email,
          `🚨 ${alertType} Alert - UniSafe Emergency`,
          html,
          `${studentName} has sent an ${alertType} alert and may need immediate help.`
        )
      );
    }

    // SMS notification
    if (contact.phone) {
      promises.push(
        sendSMSNotification(
          contact.phone,
          `🚨 EMERGENCY: ${studentName} has sent an ${alertType} alert. Check UniSafe app for details.`
        )
      );
    }
  }

  await Promise.allSettled(promises);
};

// Send safety alert notification
export const sendSafetyAlertNotification = async (users, incidentType, location, time) => {
  const promises = [];

  for (const user of users) {
    if (user.pushToken) {
      promises.push(
        sendPushNotification(user.pushToken, {
          title: `⚠️ ${incidentType} Reported`,
          body: `${incidentType} reported at ${location} at ${time}. Stay alert and avoid the area if possible.`,
          data: {
            type: 'safety_alert',
            incidentType,
            location,
            time
          }
        })
      );
    }
  }

  await Promise.allSettled(promises);
};

// Send notification to security staff
export const sendSecurityStaffNotification = async (staff, title, message, data = {}) => {
  const promises = [];

  for (const member of staff) {
    if (member.pushToken) {
      promises.push(
        sendPushNotification(member.pushToken, {
          title,
          body: message,
          data: {
            type: 'security_alert',
            ...data
          }
        })
      );
    }

    if (member.email) {
      const html = `
        <h2>${title}</h2>
        <p>${message}</p>
        <p>Please check the UniSafe admin panel for more details.</p>
      `;
      
      promises.push(
        sendEmailNotification(
          member.email,
          title,
          html,
          message
        )
      );
    }
  }

  await Promise.allSettled(promises);
};

// Send bulk notifications
export const sendBulkNotifications = async (notifications) => {
  const promises = notifications.map(notification => {
    switch (notification.channel) {
      case 'push':
        return sendPushNotification(notification.pushToken, notification);
      case 'email':
        return sendEmailNotification(notification.email, notification.subject, notification.html, notification.text);
      case 'sms':
        return sendSMSNotification(notification.phone, notification.message);
      default:
        return Promise.resolve();
    }
  });

  return Promise.allSettled(promises);
};

export default {
  sendPushNotification,
  sendEmailNotification,
  sendSMSNotification,
  sendGuardianActivationNotification,
  sendEmergencyNotification,
  sendSafetyAlertNotification,
  sendSecurityStaffNotification,
  sendBulkNotifications
};
