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
      const res = await axios.get(`${API_BASE_URL}/auth/status`, { withCredentials: true });
      if (res.data.authenticated) {
        setIsAuthenticated(true);
        setUser(res.data.user);
        console.log(res.data.user);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
      console.error("Error checking auth status:", error);
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
      await axios.post(`${API_BASE_URL}/auth/logout`, {}, { withCredentials: true });
      setIsAuthenticated(false);
      setUser(null);
      toast.success("👋 Logged Out Successfully!");
      window.location.href = "/"; // Redirect to home page after logout
    } catch (error) {
      console.error("Logout failed", error);
      toast.error("⚠️ Logout Failed");
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
