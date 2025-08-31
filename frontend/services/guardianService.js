import { io } from 'socket.io-client';

// Socket connection instance
let socket = null;

// Initialize socket connection
export const initSocketConnection = (token) => {
  if (socket) return socket; // Return existing connection
  
  socket = io('http://localhost:5000', {
    auth: {
      token: token
    }
  });

  // Set up event listeners
  socket.on('connect', () => {
    console.log('Connected to server');
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
  });

  return socket;
};

// Create a new trip
export const createTrip = async (tripData) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:5000/api/trips', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(tripData),
    });
    
    return await response.json();
  } catch (error) {
    console.error('Create trip error:', error);
    return { success: false, message: 'Network error' };
  }
};

// Get active trip
export const getActiveTrip = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:5000/api/trips/active', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
    });
    
    return await response.json();
  } catch (error) {
    console.error('Get active trip error:', error);
    return { success: false, message: 'Network error' };
  }
};

// Update trip progress
export const updateTripProgress = async (progress) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:5000/api/trips/progress', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ progress }),
    });
    
    return await response.json();
  } catch (error) {
    console.error('Update progress error:', error);
    return { success: false, message: 'Network error' };
  }
};

// Complete trip
export const completeTrip = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:5000/api/trips/complete', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      },
    });
    
    return await response.json();
  } catch (error) {
    console.error('Complete trip error:', error);
    return { success: false, message: 'Network error' };
  }
};

// Respond to check-in
export const respondToCheckin = async (checkinId, isSafe, message) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:5000/api/checkins', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ checkinId, isSafe, message }),
    });
    
    return await response.json();
  } catch (error) {
    console.error('Check-in response error:', error);
    return { success: false, message: 'Network error' };
  }
};

// Send location update via socket
export const sendLocationUpdate = (tripId, coordinates, address = '') => {
  if (!socket || !socket.connected) {
    console.error('Socket not connected');
    return false;
  }

  socket.emit('guardian-location-update', {
    tripId: tripId,
    coordinates: coordinates,
    address: address
  });

  return true;
};

// Set up check-in reminder listener
export const setupCheckinListener = (callback) => {
  if (!socket) {
    console.error('Socket not initialized');
    return false;
  }

  socket.on('checkin-reminder', (data) => {
    callback(data);
  });

  return true;
};

// Disconnect socket
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};