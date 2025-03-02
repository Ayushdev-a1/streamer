import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import styled from "styled-components";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: #121212;
  color: white;
`;

const LoginButton = styled.button`
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

export default function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const res = await axios.get("http://localhost:5000/auth/status", { withCredentials: true });
        if (res.data.authenticated) {
          toast.success("✅ Login Successful! Redirecting...", { position: "top-right", autoClose: 2000 });
          setTimeout(() => navigate("/landing"), 2000); 
        }
      } catch (error) {
        console.error("Authentication check failed", error);
      }
    };

    checkLoginStatus();
  }, [navigate]);

  const handleLogin = () => {
    window.location.href = "http://localhost:5000/auth/google/callback?scope=profile%20email";
    
  };

  return (
    <Container>
      <LoginButton onClick={handleLogin}>Login with Google</LoginButton>
    </Container>
  );
}
