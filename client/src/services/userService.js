import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_ADDRESS || "http://localhost:5000";

// Helper function to get auth token
const getAuthHeaders = () => {
  // Try to get JWT token first
  const token = localStorage.getItem('token');
  
  // If we have a token, use Bearer format
  if (token) {
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      withCredentials: true,
    };
  }
  
  // Fallback to session-based auth
  return {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    withCredentials: true,
  };
};

// Function to make authenticated requests with current user from auth context
export const makeAuthRequest = async (method, endpoint, data = null, user = null) => {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      withCredentials: true,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Origin': window.location.origin
      }
    };
    
    console.log(`Making ${method.toUpperCase()} request to ${endpoint} from origin: ${window.location.origin}`);
    
    // If we have data and it's not a GET request
    if (data && method.toLowerCase() !== 'get') {
      config.data = data;
    }
    
    // 1. Try JWT token first (from localStorage)
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } 
    // 2. If user object is provided with googleId, use that
    else if (user && user.googleId) {
      config.headers.Authorization = user.googleId;
      
      // Also add googleId as a query parameter for methods that might have issues with headers
      if (method.toLowerCase() === 'get') {
        const separator = endpoint.includes('?') ? '&' : '?';
        config.url = `${config.url}${separator}googleId=${user.googleId}`;
      }
    }
    
    // Set a longer timeout for requests in production
    config.timeout = process.env.NODE_ENV === 'production' ? 15000 : 10000; // 15 seconds in prod, 10 in dev
    
    console.log(`Making ${method.toUpperCase()} request to ${endpoint}`, { 
      withCredentials: config.withCredentials,
      hasAuth: !!config.headers.Authorization?.length,
      origin: config.headers.Origin
    });
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`${method.toUpperCase()} request to ${endpoint} failed:`, error);
    
    // Enhanced error handling with more details
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from server');
    }
    
    throw error;
  }
};

// Get user profile
export const getUserProfile = async (user) => {
  try {
    const response = await makeAuthRequest('get', '/api/users/profile', null, user);
    return response;
  } catch (error) {
    console.error('Get profile error:', error);
    throw error;
  }
};

// Get user favorites
export const getFavorites = async (user) => {
  try {
    const response = await makeAuthRequest('get', '/api/users/favorites', null, user);
    return response || [];
  } catch (error) {
    console.error('Get favorites error:', error);
    return [];
  }
};

// Add movie to favorites
export const addToFavorites = async (movieData, user) => {
  try {
    const response = await makeAuthRequest('post', '/api/users/favorites', movieData, user);
    return response;
  } catch (error) {
    console.error('Add to favorites error:', error);
    throw error;
  }
};

// Remove movie from favorites
export const removeFromFavorites = async (favoriteId, user) => {
  try {
    const response = await makeAuthRequest('delete', `/api/users/favorites/${favoriteId}`, null, user);
    return response;
  } catch (error) {
    console.error('Remove from favorites error:', error);
    throw error;
  }
};

// Get watch history
export const getWatchHistory = async (user) => {
  try {
    const response = await makeAuthRequest('get', '/api/users/history', null, user);
    return response || [];
  } catch (error) {
    console.error('Get watch history error:', error);
    return [];
  }
};

// Add to watch history
export const addToWatchHistory = async (watchData, user) => {
  try {
    const response = await makeAuthRequest('post', '/api/users/history', watchData, user);
    return response;
  } catch (error) {
    console.error('Add to watch history error:', error);
    throw error;
  }
};

// Get friends list
export const getFriends = async (user) => {
  try {
    const response = await makeAuthRequest('get', '/api/users/friends', null, user);
    return response || [];
  } catch (error) {
    console.error('Get friends error:', error);
    return [];
  }
};

// Add a friend
export const addFriend = async (friendId, user) => {
  try {
    const response = await makeAuthRequest('post', `/api/users/friends/${friendId}`, {}, user);
    return response;
  } catch (error) {
    console.error('Add friend error:', error);
    throw error;
  }
};

export default {
  getUserProfile,
  getFavorites,
  addToFavorites,
  removeFromFavorites,
  getWatchHistory,
  addToWatchHistory,
  getFriends,
  addFriend,
}; 