import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import styled from "styled-components";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #1a1a1a;
  color: white;
  padding: 2rem;
`;

const Input = styled.input`
  padding: 10px;
  font-size: 1.2rem;
  margin: 10px;
  border-radius: 5px;
  border: none;
  width: 300px;
  text-align: center;
`;

const Button = styled.button`
  padding: 12px 20px;
  background: #f05454;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 1.2rem;
  cursor: pointer;
  transition: background 0.3s;
  margin-top: 20px;

  &:hover {
    background: #d43f3f;
  }
  
  &:disabled {
    background: #999;
    cursor: not-allowed;
  }
`;

export default function JoinRoom() {
  const [roomInput, setRoomInput] = useState("");
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const API_BASE_URL = import.meta.env.VITE_API_ADDRESS || "http://localhost:5000";

  // Check if roomId is in URL and auto-join that room
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roomId = params.get("roomId");
    
    if (roomId) {
      setRoomInput(roomId);
      joinRoom(roomId);
    }
  }, [location]); 

  const joinRoom = async (roomIdToJoin) => {
    const roomId = roomIdToJoin || roomInput;
    
    if (!roomId) {
      toast.error("Please enter a room ID");
      return;
    }
    
    if (!user || (!user.googleId && !user._id)) {
      toast.error("You must be logged in to join a room");
      return;
    }
    
    setLoading(true);
    
    try {
      // Optionally validate if room exists first
      // const validation = await axios.get(`${API_BASE_URL}/api/rooms/${roomId}`);
      
      // Navigate to the room
      navigate(`/room?roomId=${roomId}`, {
        state: {
          isHost: false,
          link: `${window.location.origin}/room?roomId=${roomId}`
        }
      });
      
    } catch (error) {
      console.error("Error joining room:", error);
      toast.error(error.response?.data?.message || "Failed to join room");
      setLoading(false);
    }
  };

  return (
    <Container>
      <h2>Join a Room</h2>
      <p>Enter a room ID or paste a room link</p>
      
      <Input
        type="text"
        placeholder="Room ID or Link"
        value={roomInput}
        onChange={(e) => setRoomInput(e.target.value)}
      />
      
      <Button 
        onClick={() => joinRoom()}
        disabled={loading || !roomInput.trim()}
      >
        {loading ? "Joining..." : "Join Room"}
      </Button>
    </Container>
  );
}
