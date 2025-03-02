import { Link } from "react-router-dom";
import styled from "styled-components";
import { motion } from "framer-motion";

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

export default function LandingPage() {
  return (
    <Container>
      <Title initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}>
        Welcome to MVLive
      </Title>
      <ButtonContainer>
        <Link to="/create-room">
          <Button whileHover={{ scale: 1.1 }}>Create a Room</Button>
        </Link>
        <Link to="/join-room">
          <Button whileHover={{ scale: 1.1 }}>Join a Room</Button>
        </Link>
      </ButtonContainer>
    </Container>
  );
}
