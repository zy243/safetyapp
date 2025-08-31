// test-connection.js - Test backend connection
const axios = require('axios');

async function testBackendConnection() {
    try {
        console.log('🔍 Testing backend connection...');

        // Test health check endpoint
        const healthResponse = await axios.get('http://localhost:5000/');
        console.log('✅ Backend is running:', healthResponse.data);

        // Test auth endpoint
        const authResponse = await axios.get('http://localhost:5000/api/auth');
        console.log('✅ Auth routes are reachable:', authResponse.status);

    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.error('❌ Backend is not running. Start it with: npm run dev');
        } else if (error.response) {
            // Request made and server responded with status code outside 2xx
            console.error(
                `❌ Server responded with status ${error.response.status}: ${error.response.data}`
            );
        } else {
            // Other errors (network, etc.)
            console.error('❌ Connection test failed:', error.message);
        }
    }
}

testBackendConnection();
