import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { toast } from "react-toastify";

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

export default function CreateRoom() {
  const [roomName, setRoomName] = useState("");
  const [inviteLink, setInviteLink] = useState(null);
  const [hostName, setHostName] = useState("");
  const navigate = useNavigate();

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      toast.error("Room name cannot be empty");
      return;
    }
  
    const token = localStorage.getItem("token"); // Retrieve token from storage
  
    if (!token) {
      toast.error("Please log in first");
      return;
    }
  
    try {
      const res = await axios.post(
        "http://localhost:5000/rooms/create",
        { name: roomName },
        {
          headers: { Authorization: `Bearer ${token}` }, 
          withCredentials: true,
        }
      );
  
      setInviteLink(res.data.room.inviteLink);
      setHostName(res.data.host);
      toast.success("🎉 Room Created Successfully!");
      console.log("Navigating to /rooms");
      navigate("/rooms");
    } catch (error) {
      toast.error("⚠️ Failed to create room");
      console.error(error);
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

      <Button onClick={handleCreateRoom}>Create Room</Button>

      {inviteLink && (
        <>
          <h3>Invite Friends:</h3>
          <LinkBox>{inviteLink}</LinkBox>
          <p>Host: {hostName}</p>
        </>
      )}
    </Container>
  );
}
