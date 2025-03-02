import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
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

export default function JoinRoom() {
  const { roomId } = useParams();
  const [room, setRoom] = useState(null);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/rooms/${roomId}`);
        setRoom(res.data);
      } catch (error) {
        toast.error("⚠️ Room not found");
      }
    };

    fetchRoom();
  }, [roomId]);

  return (
    <Container>
      {room ? (
        <>
          <h2>Welcome to {room.name}!</h2>
          <p>Host: {room.host.name}</p>
        </>
      ) : (
        <h2>Loading Room...</h2>
      )}
    </Container>
  );
}
