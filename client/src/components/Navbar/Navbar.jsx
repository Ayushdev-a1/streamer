import { Link } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { useAuth } from "../../context/AuthContext.jsx";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// Keyframe animation for dropdown
const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const Nav = styled.nav`
  background: #1a1a1a;
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Logo = styled.h1`
  color: #f05454;
`;

const NavLinks = styled.div`
  display: flex;
  align-items: center;
  position: relative;

  a, button {
    color: white;
    text-decoration: none;
    margin-right: 15px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 1rem;
  }

  button {
    display: flex;
    align-items: center;
    position: relative;
  }

  img {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
  }
`;

const Dropdown = styled.div`
  position: absolute;
  top: 50px;
  right: 0;
  background: #333;
  border-radius: 8px;
  box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.2);
  padding: 10px;
  min-width: 180px;
  display: ${({ show }) => (show ? "block" : "none")};
  animation: ${fadeIn} 0.3s ease-in-out;
  z-index: 100;

  p {
    color: white;
    font-size: 0.9rem;
    margin-bottom: 8px;
    padding: 5px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  a, button {
    display: block;
    width: 100%;
    text-align: left;
    padding: 8px 10px;
    margin: 5px 0;
    border-radius: 5px;
    transition: background-color 0.2s;
  }

  a:hover, button:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .dropdown-divider {
    height: 1px;
    background-color: rgba(255, 255, 255, 0.1);
    margin: 8px 0;
  }

  .logout-button {
    background: #f05454;
    color: white;
    text-align: center;
  }

  .logout-button:hover {
    background: #d94343;
  }
`;

export default function Navbar() {
  const { isAuthenticated, logout, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const pic = user?.profilePic || "https://via.placeholder.com/40";

  const navigate = useNavigate();

  const API_BASE_URL = import.meta.env.VITE_API_ADDRESS;

  // useEffect(() => {
  //   if (isAuthenticated) {
  //     console.log("aage bdh phle se login h")
  //     toast.success("✅ Login Successful! Redirecting...", { position: "top-right", autoClose: 2000 });
  //     setTimeout(() => navigate("/landing"), 2000);
  //   }
  // }, [isAuthenticated, navigate]);

  const handleLogin = () => {
    console.log("click ho rha h ")
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Navigate and close dropdown
  const navigateAndClose = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <Nav>
      <Logo>MVLive</Logo>
      <NavLinks>
        <Link to="/">Home</Link>
        {isAuthenticated ? (
          <>
            <Link to="/stream">Watch</Link>
            <button onClick={() => setIsOpen(!isOpen)}>
              <img src={pic} alt="User Profile" referrerPolicy="no-referrer" />
            </button>
            {/* Dropdown Menu */}
            <Dropdown ref={dropdownRef} show={isOpen}>
              <p>{user?.name || "User"}</p>
              <Link onClick={() => navigateAndClose('/profile')}>
                My Profile
              </Link>
              <Link onClick={() => navigateAndClose('/create-room')}>
                Create Room
              </Link>
              <Link onClick={() => navigateAndClose('/join-room')}>
                Join Room
              </Link>
              <div className="dropdown-divider"></div>
              <button className="logout-button" onClick={logout}>Logout</button>
            </Dropdown>
          </>
        ) : (
          <>
            <Link onClick={() => setIsOpen(!isOpen)}>Login</Link>
            <Dropdown ref={dropdownRef} show={isOpen}>
              <button id="google-login" onClick={handleLogin}>
                Login with Google
              </button>
            </Dropdown>
          </>
        )}
      </NavLinks>
    </Nav>
  );
}
