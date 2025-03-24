import { Link } from "react-router-dom";
import styled from "styled-components";
import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(45deg, #1a1a1a, #000);
  color: white;
`;

const Title = styled(motion.h1)`
  font-size: 3rem;
  color: #f05454;
  margin-bottom: 20px;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 20px;
`;

const Button = styled(motion.button)`
  padding: 15px 30px;
  background: #f05454;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 1.2rem;
  cursor: pointer;
  transition: transform 0.2s, background 0.3s;
  
  &:hover {
    transform: scale(1.1);
    background: #d43f3f;
  }
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
`;

const ModalContent = styled.div`
  background: #2a2a2a;
  padding: 30px;
  border-radius: 10px;
  width: 90%;
  max-width: 500px;
  text-align: center;
`;

const InputField = styled.input`
  width: 100%;
  padding: 12px;
  margin: 15px 0;
  border-radius: 5px;
  border: 1px solid #444;
  background: #333;
  color: white;
  font-size: 1rem;
`;

const ModalButton = styled(Button)`
  margin: 5px;
  padding: 10px 20px;
`;

export default function LandingPage() {
  const [showModal, setShowModal] = useState(false);
  const [joinLink, setJoinLink] = useState("");
  const navigate = useNavigate();
  
  const { user } = useAuth();

  const handleJoinRoom = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setJoinLink("");
  };

  const handleSubmit = async () => {
    if (joinLink.trim()) {
      // Extract room ID from the link
      const urlParts = joinLink.split("/");
      const roomId = urlParts[urlParts.length - 2]; // Assuming the roomId is the second last part of the URL
      console.log(user?.googleId)
      try {
        const response = await fetch(`http://localhost:5000/api/rooms/${roomId}/join`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `${user?.googleId}`, // Include the Google ID in the Authorization header
          },
        });

        const data = await response.json(); 

        if (response.ok) {
           console.log("Joined room successfully:", data);
           navigate(`/room?roomId=${roomId}`)
        } else {
          console.error("Failed to join room:", data.message);
        }
      } catch (error) {
        console.error("Error joining room:", error);
      }
    }
  };

  return (
    <Container>
      <Title 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ duration: 1 }}
      >
        Welcome to MVLive
      </Title>
      <ButtonContainer>
        <Link to="/create-room">
          <Button whileHover={{ scale: 1.1 }}>Create a Room</Button>
        </Link>
        <Button whileHover={{ scale: 1.1 }} onClick={handleJoinRoom}>
          Join a Room
        </Button>
      </ButtonContainer>
      
      {showModal && (
        <Modal>
          <ModalContent>
            <h2>Join a Room</h2>
            <p>Please paste the room link below</p>
            <InputField
              type="text"
              placeholder="Paste your room link here..."
              value={joinLink}
              onChange={(e) => setJoinLink(e.target.value)}
            />
            <div>
              <ModalButton onClick={handleSubmit}>Join</ModalButton>
              <ModalButton onClick={handleCloseModal}>Cancel</ModalButton>
            </div>
          </ModalContent>
        </Modal>
      )}
    </Container>
  );
}