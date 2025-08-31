// config/api.ts
export const API_CONFIG = {
  // Development
  development: {
    baseUrl: 'http://localhost:5000/api',
    timeout: 10000,
  },
  // Production (update this when deploying)
  production: {
    baseUrl: 'https://your-production-domain.com/api',
    timeout: 15000,
  },
  // Staging
  staging: {
    baseUrl: 'https://your-staging-domain.com/api',
    timeout: 12000,
  }
};

// Get current environment
export const getCurrentEnvironment = () => {
  // You can set this via environment variables
  return process.env.NODE_ENV || 'development';
};

// Get current API config
export const getApiConfig = () => {
  const env = getCurrentEnvironment();
  return API_CONFIG[env as keyof typeof API_CONFIG] || API_CONFIG.development;
};

// Export the base URL for easy access
export const API_BASE_URL = getApiConfig().baseUrl;





