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
  const checkAuthStatus = async () => {
    try {
      // For cross-origin requests, we need to ensure withCredentials is true
      const res = await axios.get(`${API_BASE_URL}/auth/status`, { 
        withCredentials: true,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (res.data.authenticated) {
        setIsAuthenticated(true);
        setUser(res.data.user);
        
        // Store user in localStorage for persistence across page refreshes
        localStorage.setItem('user', JSON.stringify(res.data.user));
        
        console.log("Auth status checked - authenticated:", res.data.user);
      } else {
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

  // Check authentication status on initial load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Login function
  const login = async () => {
    try {
      await checkAuthStatus(); // Re-check authentication status after login
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
      toast.success("👋 Logged Out Successfully!");
      window.location.href = "/"; // Redirect to home page after logout
    } catch (error) {
      console.error("Logout failed", error);
      
      // Clear local state even if server logout fails
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem('user');
      
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
