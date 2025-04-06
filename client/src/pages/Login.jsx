import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "../context/AuthContext";

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
  const { isAuthenticated, login } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_ADDRESS;

  useEffect(() => {
    if (isAuthenticated) {
      console.log("aage bdh phle se login h")
      toast.success("✅ Login Successful! Redirecting...", { position: "top-right", autoClose: 2000 });
      setTimeout(() => navigate("/landing"), 2000);
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = () => {
    console.log("click ho rha h ")
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  return (
    <Container>
      <LoginButton id="google-login" onClick={handleLogin}>
        Login with Google 
      </LoginButton>
    </Container>
  );
}