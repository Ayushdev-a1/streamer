import { Link } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../../context/AuthContext.jsx";

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
  a, button {
    color: white;
    text-decoration: none;
    margin-right: 15px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 1rem;
  }
`;

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <Nav>
      <Logo>MVLive</Logo>
      <NavLinks>
        <Link to="/">Home</Link>
        {isAuthenticated ? (
          <>
            <Link to="/stream">Watch</Link>
            <button onClick={logout}>Logout</button>
          </>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </NavLinks>
    </Nav>
  );
}
