import { motion } from "framer-motion";
import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import styled from "styled-components";
import { toast } from "react-toastify";

const CheckboxLabel = styled.label`
  margin: 10px 0;
  display: flex;
  align-items: center;
  gap: 5px;
`;

export default function LandingPage() {
  const [showModal, setShowModal] = useState(false);
  const [createRoom, setCreateRoom] = useState(false);
  const [joinLink, setJoinLink] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [roomName, setRoomName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_ADDRESS || "http://localhost:5000";
//shi se nhi hoga
  const handleCreateRoom = async () => {
    if (!user || !user.googleId) {
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
            allowVideoChat: true,
          },
        },
        {
          headers: {
            Authorization: user.googleId || user._id,
          },
          withCredentials: true,
        }
      );

      const { roomId, inviteLink } = res.data;

      if (!roomId) {
        throw new Error("Failed to get room ID from response");
      }

      toast.success("🎉 Room Created Successfully!");

      // Navigate to the room with the shareable link
      navigate(`/room?roomId=${roomId}`, {
        state: {
          isHost: true,
          link: inviteLink,
        },
      });

      setCreateRoom(false);
    } catch (error) {
      console.error("Create room error:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to create room";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = () => {
    setShowModal(true);
  };

  const openCreateRoom = () => {
    setCreateRoom(true);
  };

  const closeCreateRoom = () => {
    setCreateRoom(false);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setJoinLink("");
  };

  const handleSubmit = async () => {
    if (!joinLink.trim()) {
      toast.error("Please enter a room link or ID");
      return;
    }

    setLoading(true);

    try {
      let roomId;

      if (joinLink.includes("?roomId=")) {
        roomId = new URLSearchParams(joinLink.split("?")[1]).get("roomId");
      } else if (joinLink.includes("/room/")) {
        const urlParts = joinLink.split("/");
        roomId = urlParts[urlParts.length - 1];
      } else {
        roomId = joinLink.trim();
      }

      if (!roomId) {
        toast.error("Invalid room link format");
        return;
      }

      navigate(`/room?roomId=${roomId}`, {
        state: {
          isHost: false,
          link: `${window.location.origin}/room?roomId=${roomId}`,
        },
      });

      handleCloseModal();
    } catch (error) {
      console.error("Error joining room:", error);
      toast.error("Failed to join room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-950 text-white p-4">
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="text-4xl md:text-5xl lg:text-6xl font-bold text-red-500 mb-10 tracking-tight"
      >
        Welcome to MVLive
      </motion.h1>

      <div className="flex flex-col sm:flex-row gap-6">
        <motion.button
          onClick={openCreateRoom}
          whileHover={{ scale: 1.05 }}
          className="px-8 py-4 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg shadow-lg transition-all duration-200 ease-in-out"
        >
          Create a Room
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          onClick={handleJoinRoom}
          className="px-8 py-4 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg shadow-lg transition-all duration-200 ease-in-out"
        >
          Join a Room
        </motion.button>
      </div>

      {createRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-xl w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-semibold text-white mb-4">Create Room</h2>
            <input
              type="text"
              placeholder="Enter Room Name ..."
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full p-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 mb-6"
            />
            <input
              type="text"
              placeholder="Room Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 mb-6"
            />
            <div className="flex gap-2">
              <CheckboxLabel>
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                />
                Private Room
              </CheckboxLabel>
            </div>
            <div className="flex justify-center gap-4">
              <motion.button
                onClick={handleCreateRoom}
                disabled={loading || !roomName.trim()}
                className={`px-6 py-2 ${
                  loading ? "bg-gray-500" : "bg-red-500 hover:bg-red-600"
                } text-white font-semibold rounded-lg transition-all duration-200`}
              >
                {loading ? "Creating..." : "Create Room"}
              </motion.button>
              <motion.button
                onClick={closeCreateRoom}
                disabled={loading}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-200"
              >
                Close
              </motion.button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-xl w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-semibold text-white mb-4">Join a Room</h2>
            <p className="text-gray-300 mb-6">
              Please paste the room link or ID below
            </p>
            <input
              type="text"
              placeholder="Paste your room link or ID here..."
              value={joinLink}
              onChange={(e) => setJoinLink(e.target.value)}
              className="w-full p-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 mb-6"
            />
            <div className="flex justify-center gap-4">
              <motion.button
                onClick={handleSubmit}
                disabled={loading || !joinLink.trim()}
                className={`px-6 py-2 ${
                  loading ? "bg-gray-500" : "bg-red-500 hover:bg-red-600"
                } text-white font-semibold rounded-lg transition-all duration-200`}
              >
                {loading ? "Joining..." : "Join"}
              </motion.button>
              <motion.button
                onClick={handleCloseModal}
                disabled={loading}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-200"
              >
                Cancel
              </motion.button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}