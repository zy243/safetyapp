// Simple test to verify backend can start
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing backend startup...');

// Test if we can import the server
try {
    console.log('Testing server imports...');
    const serverPath = path.join(__dirname, 'backend', 'server.js');
    console.log('Server path:', serverPath);
    
    // Try to import the server module
    const serverModule = await import(serverPath);
    console.log('✅ Server module imported successfully');
    
} catch (error) {
    console.error('❌ Server import failed:', error.message);
    console.error('Full error:', error);
}

console.log('🧪 Backend test completed');
