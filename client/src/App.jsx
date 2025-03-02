import { Routes, Route, BrowserRouter } from "react-router-dom";
import LandingPage from "./components/LandingPage/LandingPage";
import Login from "./pages/Login";
import Stream from "./pages/Stream";
import Navbar from "./components/Navbar/Navbar";
import CreateRoom from "./components/CreateRoom/CreateRoom"
import JoinRoom from "./components/JoinRoom/JoinRoom"
export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/stream" element={<Stream />} />
        <Route path="/create-room" element={<CreateRoom />} />
        <Route path="/join-room/:roomId" element={<JoinRoom />} />

      </Routes>
    </BrowserRouter>
  );
}
