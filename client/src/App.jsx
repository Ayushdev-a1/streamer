import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import './App.css';

// Components
import Auth from './components/Auth/Auth';
import Navbar from './components/Navbar/Navbar';
import LandingPage from './components/LandingPage/LandingPage';
import CreateRoom from './components/CreateRoom/CreateRoom';
import JoinRoom from './components/JoinRoom/JoinRoom';
import MovieStream from './components/MovieStream/MovieStream';
import UserProfile from './components/UserProfile/UserProfile';

function App() {
  const { isAuthenticated, loading, user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Once the auth state is determined, set loading to false
    if (!loading) {
      setIsLoading(false);
    }
  }, [loading]);

  // Protected route component
  const ProtectedRoute = ({ children }) => {
    if (isLoading) {
      return <div className="loading-screen">Loading...</div>;
    }
    
    if (!isAuthenticated) {
      return <Navigate to="/auth" />;
    }
    
    return children;
  };

  if (isLoading) {
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<Auth />} />
        
        <Route 
          path="/create-room" 
          element={
            <ProtectedRoute>
              <CreateRoom />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/join-room" 
          element={
            <ProtectedRoute>
              <JoinRoom />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/stream" 
          element={
            <ProtectedRoute>
              <MovieStream />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          } 
        />
        
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default App; 