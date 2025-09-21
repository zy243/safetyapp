import GuardianSession from '../models/GuardianSession.js';
import SOSAlert from '../models/SOSAlert.js';
import User from '../models/User.js';

export const initializeSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join user to their personal room
    socket.on('join-user-room', (userId) => {
      socket.join(`user-${userId}`);
      console.log(`User ${userId} joined their room`);
    });

    // Join guardian session room
    socket.on('join-guardian-session', (sessionId) => {
      socket.join(`guardian-session-${sessionId}`);
      console.log(`User joined guardian session ${sessionId}`);
    });

    // Join security monitoring room
    socket.on('join-security-room', () => {
      socket.join('security-monitoring');
      console.log('User joined security monitoring room');
    });

    // Handle location updates during guardian session
    socket.on('location-update', async (data) => {
      try {
        const { sessionId, latitude, longitude } = data;
        
        // Update session in database
        await GuardianSession.findByIdAndUpdate(sessionId, {
          $set: {
            'currentLocation.latitude': latitude,
            'currentLocation.longitude': longitude,
            'currentLocation.lastUpdated': new Date()
          },
          $push: {
            route: {
              latitude,
              longitude,
              timestamp: new Date()
            }
          }
        });

        // Broadcast location update to session participants
        socket.to(`guardian-session-${sessionId}`).emit('location-updated', {
          sessionId,
          latitude,
          longitude,
          timestamp: new Date()
        });

        // Notify security staff if session is in emergency
        const session = await GuardianSession.findById(sessionId);
        if (session && session.status === 'emergency') {
          io.to('security-monitoring').emit('emergency-location-update', {
            sessionId,
            studentId: session.studentId,
            location: { latitude, longitude },
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error('Location update error:', error);
        socket.emit('error', { message: 'Failed to update location' });
      }
    });

    // Handle SOS alert
    socket.on('sos-alert', async (data) => {
      try {
        const { studentId, location, description } = data;
        
        // Create SOS alert in database
        const alertId = `sos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const sosAlert = new SOSAlert({
          studentId,
          alertId,
          location,
          description,
          priority: 'critical'
        });

        await sosAlert.save();

        // Get student info
        const student = await User.findById(studentId);
        
        // Broadcast to security staff
        io.to('security-monitoring').emit('sos-alert', {
          alertId: sosAlert._id,
          studentId,
          studentName: student.name,
          location,
          description,
          timestamp: new Date()
        });

        // Notify emergency contacts
        if (student.emergencyContacts) {
          for (const contact of student.emergencyContacts) {
            if (contact.contactId) {
              io.to(`user-${contact.contactId}`).emit('emergency-notification', {
                type: 'sos_alert',
                studentName: student.name,
                location,
                timestamp: new Date()
              });
            }
          }
        }

        socket.emit('sos-alert-sent', { alertId: sosAlert._id });
      } catch (error) {
        console.error('SOS alert error:', error);
        socket.emit('error', { message: 'Failed to send SOS alert' });
      }
    });

    // Handle guardian session start
    socket.on('guardian-session-started', async (data) => {
      try {
        const { sessionId, studentId, destination, trustedContacts } = data;
        
        // Notify trusted contacts
        for (const contact of trustedContacts) {
          if (contact.contactId) {
            io.to(`user-${contact.contactId}`).emit('guardian-session-notification', {
              type: 'guardian_activated',
              sessionId,
              studentId,
              destination,
              timestamp: new Date()
            });
          }
        }

        // Notify security staff
        io.to('security-monitoring').emit('guardian-session-started', {
          sessionId,
          studentId,
          destination,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Guardian session start notification error:', error);
      }
    });

    // Handle guardian session end
    socket.on('guardian-session-ended', async (data) => {
      try {
        const { sessionId, studentId, destination } = data;
        
        // Notify trusted contacts
        const session = await GuardianSession.findById(sessionId);
        if (session && session.trustedContacts) {
          for (const contact of session.trustedContacts) {
            if (contact.contactId) {
              io.to(`user-${contact.contactId}`).emit('guardian-session-notification', {
                type: 'guardian_completed',
                sessionId,
                studentId,
                destination,
                timestamp: new Date()
              });
            }
          }
        }

        // Notify security staff
        io.to('security-monitoring').emit('guardian-session-ended', {
          sessionId,
          studentId,
          destination,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Guardian session end notification error:', error);
      }
    });

    // Handle safety check-in response
    socket.on('safety-checkin-response', async (data) => {
      try {
        const { sessionId, response, location } = data;
        
        // Update session in database
        const session = await GuardianSession.findById(sessionId);
        if (session) {
          session.safetyChecks.push({
            response,
            location: location || session.currentLocation,
            timestamp: new Date()
          });

          if (response === 'no') {
            session.status = 'emergency';
            session.emergencyEscalated = true;
            session.emergencyEscalatedAt = new Date();
          }

          await session.save();

          // Notify security staff if emergency
          if (response === 'no') {
            io.to('security-monitoring').emit('safety-checkin-emergency', {
              sessionId,
              studentId: session.studentId,
              location: location || session.currentLocation,
              timestamp: new Date()
            });
          }
        }
      } catch (error) {
        console.error('Safety check-in response error:', error);
        socket.emit('error', { message: 'Failed to process safety check-in response' });
      }
    });

    // Handle staff acknowledgment of alerts
    socket.on('acknowledge-alert', async (data) => {
      try {
        const { alertId, staffId, staffName } = data;
        
        // Update alert in database
        await SOSAlert.findByIdAndUpdate(alertId, {
          'response.acknowledgedBy': staffId,
          'response.acknowledgedAt': new Date(),
          status: 'acknowledged'
        });

        // Get alert details
        const alert = await SOSAlert.findById(alertId).populate('studentId', 'name');
        
        // Notify student
        io.to(`user-${alert.studentId._id}`).emit('alert-acknowledged', {
          alertId,
          staffName,
          timestamp: new Date()
        });

        // Notify other security staff
        socket.to('security-monitoring').emit('alert-acknowledged', {
          alertId,
          staffName,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Alert acknowledgment error:', error);
        socket.emit('error', { message: 'Failed to acknowledge alert' });
      }
    });

    // Handle staff resolution of alerts
    socket.on('resolve-alert', async (data) => {
      try {
        const { alertId, staffId, staffName, resolution } = data;
        
        // Update alert in database
        await SOSAlert.findByIdAndUpdate(alertId, {
          'response.resolvedBy': staffId,
          'response.resolvedAt': new Date(),
          'response.resolution': resolution,
          status: 'resolved'
        });

        // Get alert details
        const alert = await SOSAlert.findById(alertId).populate('studentId', 'name');
        
        // Notify student
        io.to(`user-${alert.studentId._id}`).emit('alert-resolved', {
          alertId,
          staffName,
          resolution,
          timestamp: new Date()
        });

        // Notify other security staff
        socket.to('security-monitoring').emit('alert-resolved', {
          alertId,
          staffName,
          resolution,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Alert resolution error:', error);
        socket.emit('error', { message: 'Failed to resolve alert' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};

export default { initializeSocket };
