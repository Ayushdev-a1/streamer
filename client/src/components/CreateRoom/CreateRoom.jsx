import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #1a1a1a;
  color: white;
`;

const Input = styled.input`
  padding: 10px;
  font-size: 1.2rem;
  margin: 10px;
  border-radius: 5px;
  border: none;
  width: 250px;
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
  margin-top: 10px;

  &:hover {
    background: #d43f3f;
  }
`;

const LinkBox = styled.div`
  margin-top: 20px;
  padding: 10px;
  background: #444;
  border-radius: 5px;
  font-size: 1rem;
  word-wrap: break-word;
`;

const CheckboxLabel = styled.label`
  margin: 10px 0;
  display: flex;
  align-items: center;
  gap: 5px;
`;

export default function CreateRoom() {
  const [roomName, setRoomName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isHost, setIsHost] = useState(true); // Default to host
  const [shareableLink, setShareableLink] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const API_BASE_URL = import.meta.env.VITE_API_ADDRESS || "http://localhost:5000";

  const handleCreateRoom = async () => {
    if (!user || !user._id) {
      toast.error("You must be logged in to create a room");
      return;
    }

    if (!roomName.trim()) {
      toast.error("Room name cannot be empty");
      return;
    }

    setLoading(true);
    
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/rooms`,
        {
          name: roomName,
          description: description,
          isPrivate: isPrivate,
          settings: {
            allowChat: true,
            allowMediaControl: true,
            allowVideoChat: true
          }
        },
        {
          headers: { 
            // Send authorization as both GoogleID and in Bearer format to support both methods
            Authorization: user.googleId || user._id, 
          },
          withCredentials: true,
        }
      );

      console.log("Room created:", res.data);

      // Get roomId from response
      const roomId = res.data.roomId;
      
      // Create shareable link
      const shareableLink = `${window.location.origin}/join-room?roomId=${roomId}`;
      setShareableLink(shareableLink);
      
      toast.success("🎉 Room Created Successfully!");
      
      // Wait a moment before navigating
      setTimeout(() => {
        navigate(`/room?roomId=${roomId}`, { 
          state: { 
            isHost: true,
            link: shareableLink
          } 
        });
      }, 1500);
    } catch (error) {
      console.error("Error creating room:", error);
      toast.error(error.response?.data?.message || "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <h2>Create a Room</h2>
      <Input
        type="text"
        id="roomName"
        name="roomName"
        placeholder="Enter room name"
        value={roomName}
        onChange={(e) => setRoomName(e.target.value)}
      />
      <Input
        type="text"
        id="description"
        name="description"
        placeholder="Enter room description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <CheckboxLabel>
        <input
          type="checkbox"
          checked={isPrivate}
          onChange={(e) => setIsPrivate(e.target.checked)}
        />
        Private Room
      </CheckboxLabel>
      
      <Button 
        onClick={handleCreateRoom} 
        disabled={loading || !roomName.trim()}
      >
        {loading ? "Creating..." : "Create Room"}
      </Button>

      {shareableLink && (
        <>
          <h3>Invite Friends:</h3>
          <LinkBox>{shareableLink}</LinkBox>
          <Button
            onClick={() => {
              navigator.clipboard.writeText(shareableLink);
              toast.success("Link copied to clipboard!");
            }}
          >
            Copy Link
          </Button>
        </>
      )}
    </Container>
  );
}