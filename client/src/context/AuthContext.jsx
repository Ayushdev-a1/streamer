import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Add loading state

  // Fix: Use import.meta.env instead of process.env
  const API_BASE_URL = import.meta.env.VITE_API_ADDRESS;

  // Function to check authentication status
  const checkAuthStatus = async (retried = false) => {
    try {
      // First, see if we have a token in localStorage to add to the request
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Origin': window.location.origin // Add origin header explicitly
      };
      
      console.log(`Checking auth status with origin: ${window.location.origin}`);
      
      // If we have a token, add it to the headers
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('Using token auth for status check');
      } 
      // Or if we have a stored user with googleId, try that
      else if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          if (userData.googleId) {
            headers['Authorization'] = userData.googleId;
            console.log('Using googleId auth for status check');
          }
        } catch (e) {
          console.error("Error parsing stored user:", e);
        }
      }
      
      // For cross-origin requests, we need to ensure withCredentials is true
      const res = await axios.get(`${API_BASE_URL}/auth/status`, { 
        withCredentials: true,
        headers,
        timeout: 10000 // 10 second timeout
      });
      
      if (res.data.authenticated) {
        setIsAuthenticated(true);
        setUser(res.data.user);
        
        // Store user and token (if available) in localStorage
        localStorage.setItem('user', JSON.stringify(res.data.user));
        if (token) localStorage.setItem('token', token);
        
        console.log("Auth status checked - authenticated:", res.data.user);
      } else {
        // If server says not authenticated but we have a token or user in localStorage,
        // try to authenticate one more time with different headers
        if ((token || (storedUser && JSON.parse(storedUser).googleId)) && !retried) {
          console.log("Server says not authenticated but we have credentials - retrying with alternate auth method");
          
          try {
            // Try the opposite auth method from what we just tried
            const retryHeaders = { ...headers };
            if (headers['Authorization']?.startsWith('Bearer')) {
              // We tried token auth, now try googleId
              const userData = JSON.parse(storedUser || '{}');
              if (userData.googleId) {
                retryHeaders['Authorization'] = userData.googleId;
              }
            } else if (storedUser) {
              // We tried googleId auth, now try token
              retryHeaders['Authorization'] = `Bearer ${token}`;
            }
            
            const retryRes = await axios.get(`${API_BASE_URL}/auth/status`, { 
              withCredentials: true,
              headers: retryHeaders
            });
            
            if (retryRes.data.authenticated) {
              setIsAuthenticated(true);
              setUser(retryRes.data.user);
              localStorage.setItem('user', JSON.stringify(retryRes.data.user));
              console.log("Retry auth succeeded:", retryRes.data.user);
              setLoading(false);
              return;
            }
          } catch (retryError) {
            console.error("Auth retry failed:", retryError);
          }
        }
        
        // If we still get here, authentication failed
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem('user');
        console.log("Auth status checked - not authenticated");
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      
      // Fallback to localStorage if available
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setIsAuthenticated(true);
          console.log("Using cached user data:", parsedUser);
        } catch (e) {
          console.error("Error parsing stored user:", e);
          setIsAuthenticated(false);
          setUser(null);
          localStorage.removeItem('user');
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } finally {
      setLoading(false); // Set loading to false after checking status
    }
  };

  // Check for token and googleId in URL parameters (OAuth callback)
  useEffect(() => {
    const handleOAuthResponse = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const googleId = urlParams.get('googleId');
      
      if (token) {
        localStorage.setItem('token', token);
      }
      
      if (googleId) {
        const storedUser = localStorage.getItem('user');
        let userData = storedUser ? JSON.parse(storedUser) : {};
        
        userData = { 
          ...userData, 
          googleId, 
          // If we don't have these fields yet, use placeholders until next auth check
          _id: userData._id || googleId,
          name: userData.name || 'User'
        };
        
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        setIsAuthenticated(true);
        
        // Clean up URL parameters after processing
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Re-check authentication status to get full user details
        checkAuthStatus();
      }
    };
    
    handleOAuthResponse();
  }, []);

  // Check authentication status on initial load
  useEffect(() => {
    const initialAuthCheck = async () => {
      await checkAuthStatus(false);
      
      // If not authenticated after first attempt, try one more time with retry
      if (!isAuthenticated && !loading) {
        console.log("Initial auth check failed, retrying once...");
        // Small delay to ensure server has processed any pending operations
        await new Promise(resolve => setTimeout(resolve, 500));
        await checkAuthStatus(true);
      }
    };
    
    initialAuthCheck();
    // We're intentionally only running this once on mount and not adding dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Login function
  const login = async () => {
    try {
      // Wait for a short delay to allow the server to process the session
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Re-check authentication status after login with retry enabled
      await checkAuthStatus(false);
      
      // Check again if first attempt failed (with retry flag)
      if (!isAuthenticated) {
        console.log("First auth check failed after login, retrying...");
        await checkAuthStatus(true);
      }
      
      if (isAuthenticated) {
        toast.success("✅ Login Successful!");
      } else {
        toast.error("⚠️ Login Failed");
      }
    } catch (error) {
      console.error("Login failed", error);
      toast.error("⚠️ Login Failed");
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await axios.post(`${API_BASE_URL}/auth/logout`, {}, { 
        withCredentials: true,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      toast.success("👋 Logged Out Successfully!");
      window.location.href = "/"; // Redirect to home page after logout
    } catch (error) {
      console.error("Logout failed", error);
      
      // Clear local state even if server logout fails
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      
      toast.error("⚠️ Logout Failed");
      window.location.href = "/"; // Redirect to home anyway
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
