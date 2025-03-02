import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const res = await axios.get("http://localhost:5000/auth/status", { withCredentials: true });
        if (res.data.authenticated) {
          setIsAuthenticated(true);
          setUser(res.data.user); // Store user data if needed
        }
      } catch (error) {
        setIsAuthenticated(false);
        setUser(null);
      }
    };

    checkAuthStatus();
  }, []);

  const logout = async () => {
    await axios.post("http://localhost:5000/auth/logout", {}, { withCredentials: true });
    setIsAuthenticated(false);
    setUser(null);
    window.location.href = "/"; 
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
