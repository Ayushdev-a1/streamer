import { Link, useAsyncError } from "react-router-dom";
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
  const [createRoom, setcreateRoom] = useState(false);
  const [joinLink, setJoinLink] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();
  const [roomName, setRoomName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [shareableLink, setShareableLink] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_ADDRESS;

  const handleCreateRoom = async () => {
    console.log(user?.googleId);

    if (!roomName.trim()) {
      console.log("Room name cannot be empty");
      toast.error("Room name cannot be empty");
      return;
    }

    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/rooms/`,
        {
          name: roomName,
          description: description,
          isPrivate: isPrivate,
          isHost: isHost,
        },
        {
          headers: { Authorization: user?.googleId },
          withCredentials: true,
        }
      );

      console.log(res);
      const link = res.data.data.shareableLink
      console.log(link)

      // Extract room ID directly from the response
      const fullLink = res.data.data.shareableLink;
      const roomPath = fullLink.replace(`${API_BASE_URL}/api/rooms/`, "");
      const roomId = roomPath.split("/")[0];

      setShareableLink(fullLink);
      navigate(`/room?roomId=${roomId}`, { state: { isHost, link } });

      toast.success("🎉 Room Created Successfully!");
      console.log("Navigating to /room?roomId=" + roomId + " with isHost=" + isHost);
    } catch (error) {
      console.error(error);
      toast.error("Failed to create room!");
    }
  };

  const handleJoinRoom = () => {
    setShowModal(true);
  };
  const OpenCreateRoom = () => {
    setcreateRoom(true);
  };
  const CloseCreateRoom = () => {
    setcreateRoom(false);
  }
  const handleCloseModal = () => {
    setShowModal(false);
    setJoinLink("");
  };

  const handleSubmit = async () => {
    if (joinLink.trim()) {
      const urlParts = joinLink.split("/");
      const roomId = urlParts[urlParts.length - 2];
      console.log(user?.googleId);
      try {
        const response = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/join`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `${user?.googleId}`,
          },
        });

        const data = await response.json();

        if (response.ok) {
          console.log("Joined room successfully:", data);
          navigate(`/room?roomId=${roomId}`);
        } else {
          console.error("Failed to join room:", data.message);
        }
      } catch (error) {
        console.error("Error joining room:", error);
      }
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
          onClick={OpenCreateRoom}
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
              <CheckboxLabel>
                <input
                  type="checkbox"
                  checked={isHost}
                  onChange={(e) => setIsHost(e.target.checked)}
                />
                I’m the host
              </CheckboxLabel>
            </div>
            <div className="flex justify-center gap-4">
              <motion.button
                onClick={handleCreateRoom}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-200"
              >
                Create Room
              </motion.button>
              <motion.button
                onClick={CloseCreateRoom}
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
            <p className="text-gray-300 mb-6">Please paste the room link below</p>
            <input
              type="text"
              placeholder="Paste your room link here..."
              value={joinLink}
              onChange={(e) => setJoinLink(e.target.value)}
              className="w-full p-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 mb-6"
            />
            <div className="flex justify-center gap-4">
              <motion.button
                onClick={handleSubmit}
                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-all duration-200"
              >
                Join
              </motion.button>
              <motion.button
                onClick={handleCloseModal}
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