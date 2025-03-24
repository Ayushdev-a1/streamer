import { useEffect, useState, useRef } from "react"
import io from "socket.io-client"
import { useAuth } from "../../context/AuthContext"
import { useNavigate } from "react-router-dom"
import WebRTCService from "../../services/webrtc-service"

const MovieStream = () => {
  const [participants, setParticipants] = useState([])
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [mediaState, setMediaState] = useState({
    title: "",
    url: "",
    currentTime: 0,
    isPlaying: false,
    duration: 0,
  })
  const [showHangupModal, setShowHangupModal] = useState(false)
  const [isInCall, setIsInCall] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [remoteStreams, setRemoteStreams] = useState(new Map())
  const [localStream, setLocalStream] = useState(null)

  const { user } = useAuth()
  const query = new URLSearchParams(location.search)
  const roomId = query.get("roomId")
  const googleId = user?.googleId
  const username = user?.name
  const userId = user?._id
  const socketRef = useRef(null)
  const videoRef = useRef(null)
  const localVideoRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!socketRef.current && googleId && username) {
      socketRef.current = io("http://localhost:5000", {
        transports: ["websocket"],
        auth: { googleId, username, userId },
      })

      socketRef.current.on("connect", () => {
        console.log("Connected to WebSocket")
        socketRef.current.emit("joinRoom", { roomId })

        // Initialize WebRTC service
        WebRTCService.initialize(socketRef.current, roomId)

        // Handle incoming remote streams
        WebRTCService.onTrack((stream, peerId, isScreenSharing) => {
          console.log(`Received stream from ${peerId}`, isScreenSharing)
          setRemoteStreams((prev) => {
            const newStreams = new Map(prev)
            newStreams.set(peerId, { stream, isScreenSharing })
            return newStreams
          })
        })

        // Handle screen sharing end
        WebRTCService.onStreamEnd(() => {
          setIsScreenSharing(false)
          handleToggleScreenShare(false)
        })
      })

      socketRef.current.on("roomUpdate", ({ participants, total, media }) => {
        setParticipants(participants)
        if (media) setMediaState((prev) => ({ ...prev, ...media }))
      })

      socketRef.current.on("userJoined", (data) => {
        console.log(`${data.username} joined the room`)
      })

      socketRef.current.on("userLeft", (data) => {
        console.log(`${data.username} left the room`)

        // Remove remote stream if exists
        setRemoteStreams((prev) => {
          const newStreams = new Map(prev)
          newStreams.delete(data.socketId)
          return newStreams
        })
      })

      socketRef.current.on("newMessage", ({ sender, content, timestamp }) => {
        setMessages((prev) => [...prev, { sender, content, timestamp }])
      })

      socketRef.current.on("mediaUpdate", (newMediaState) => {
        setMediaState(newMediaState)
        if (videoRef.current) {
          videoRef.current.currentTime = newMediaState.currentTime
          newMediaState.isPlaying ? videoRef.current.play() : videoRef.current.pause()
        }
      })

      socketRef.current.on("error", ({ message }) => {
        console.error("Socket error:", message)
      })

      socketRef.current.on("disconnect", () => {
        console.log("Disconnected from WebSocket")
      })
    }

    return () => {
      if (isInCall) {
        handleEndCall()
      }

      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [googleId, username, roomId])

  // Update local video when local stream changes
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  const sendMessage = () => {
    if (newMessage.trim() && socketRef.current) {
      socketRef.current.emit("sendMessage", { roomId, content: newMessage })
      setNewMessage("")
    }
  }

  const handleHangup = () => {
    setShowHangupModal(true)
  }

  const confirmHangup = () => {
    if (socketRef.current) {
      if (isInCall) {
        handleEndCall()
      }

      socketRef.current.emit("leaveRoom", { roomId })
      socketRef.current.disconnect()
      setParticipants([])
      setMessages([])
      setMediaState({ title: "", url: "", currentTime: 0, isPlaying: false, duration: 0 })
      setShowHangupModal(false)
      navigate("/")
    }
  }

  const cancelHangup = () => {
    setShowHangupModal(false)
  }

  const handleMediaControl = (newState) => {
    if (socketRef.current) {
      const updatedState = { ...mediaState, ...newState }
      socketRef.current.emit("updateMedia", { roomId, mediaState: updatedState })
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current && Math.abs(videoRef.current.currentTime - mediaState.currentTime) > 1) {
      handleMediaControl({ currentTime: videoRef.current.currentTime })
    }
  }

  // Video call functions
  const handleStartCall = async () => {
    try {
      const stream = await WebRTCService.startCall(false)
      setLocalStream(stream)
      setIsInCall(true)

      // Create peer connections with existing participants
      participants.forEach((participant) => {
        if (participant.socketId !== socketRef.current.id) {
          WebRTCService.createPeerConnection(participant.socketId)
        }
      })
    } catch (error) {
      console.error("Failed to start call:", error)
    }
  }

  const handleEndCall = () => {
    WebRTCService.endCall()
    setLocalStream(null)
    setIsInCall(false)
    setIsScreenSharing(false)
    setRemoteStreams(new Map())
  }

  const handleToggleScreenShare = async (enable) => {
    try {
      if (!isInCall) {
        // Start call with screen sharing
        const stream = await WebRTCService.startCall(true)
        setLocalStream(stream)
        setIsInCall(true)
        setIsScreenSharing(true)

        // Create peer connections with existing participants
        participants.forEach((participant) => {
          if (participant.socketId !== socketRef.current.id) {
            WebRTCService.createPeerConnection(participant.socketId, false, true)
          }
        })
      } else {
        // Toggle screen sharing for existing call
        const stream = await WebRTCService.toggleScreenShare(enable)
        setLocalStream(stream)
        setIsScreenSharing(enable)
      }
    } catch (error) {
      console.error("Failed to toggle screen sharing:", error)
      setIsScreenSharing(false)
    }
  }

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1>Movie Stream - Room {roomId}</h1>

      {/* Video Call Section */}
      <div style={{ marginBottom: "20px" }}>
        <h3>Video Call</h3>
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          {!isInCall ? (
            <>
              <button
                onClick={handleStartCall}
                style={{
                  padding: "8px 15px",
                  background: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Start Video Call
              </button>
              <button
                onClick={() => handleToggleScreenShare(true)}
                style={{
                  padding: "8px 15px",
                  background: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Share Screen
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleEndCall}
                style={{
                  padding: "8px 15px",
                  background: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                End Call
              </button>
              {isScreenSharing ? (
                <button
                  onClick={() => handleToggleScreenShare(false)}
                  style={{
                    padding: "8px 15px",
                    background: "#6c757d",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Stop Sharing
                </button>
              ) : (
                <button
                  onClick={() => handleToggleScreenShare(true)}
                  style={{
                    padding: "8px 15px",
                    background: "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Share Screen
                </button>
              )}
            </>
          )}
        </div>

        {/* Video Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "10px",
            marginBottom: "20px",
          }}
        >
          {/* Local Video */}
          {localStream && (
            <div style={{ position: "relative" }}>
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                style={{
                  width: "100%",
                  height: "225px",
                  objectFit: "cover",
                  borderRadius: "8px",
                  backgroundColor: "#000",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: "10px",
                  left: "10px",
                  background: "rgba(0,0,0,0.5)",
                  color: "white",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "12px",
                }}
              >
                You {isScreenSharing ? "(Screen)" : "(Camera)"}
              </div>
            </div>
          )}

          {/* Remote Videos */}
          {Array.from(remoteStreams).map(([peerId, { stream, isScreenSharing: isRemoteScreenSharing }]) => {
            const participant = participants.find((p) => p.socketId === peerId)
            return (
              <div key={peerId} style={{ position: "relative" }}>
                <video
                  autoPlay
                  playsInline
                  style={{
                    width: "100%",
                    height: "225px",
                    objectFit: "cover",
                    borderRadius: "8px",
                    backgroundColor: "#000",
                  }}
                  ref={(el) => {
                    if (el) el.srcObject = stream
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: "10px",
                    left: "10px",
                    background: "rgba(0,0,0,0.5)",
                    color: "white",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                  }}
                >
                  {participant?.username || "Unknown"} {isRemoteScreenSharing ? "(Screen)" : "(Camera)"}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Video Player */}
      <div style={{ marginBottom: "20px" }}>
        <h3>Movie Player</h3>
        {mediaState.url ? (
          <video
            ref={videoRef}
            src={mediaState.url}
            controls
            style={{ width: "100%", maxHeight: "500px" }}
            onPlay={() => handleMediaControl({ isPlaying: true })}
            onPause={() => handleMediaControl({ isPlaying: false })}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={() => handleMediaControl({ duration: videoRef.current.duration })}
          />
        ) : (
          <div
            style={{
              height: "300px",
              background: "#333",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              borderRadius: "8px",
            }}
          >
            No media selected
          </div>
        )}
      </div>

      {/* Participants */}
      <div style={{ marginBottom: "20px" }}>
        <h3>Participants ({participants.length})</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {participants.map((participant) => (
            <div
              key={participant.googleId}
              style={{
                padding: "10px",
                background: participant.googleId === googleId ? "#e0f0ff" : "#f0f0f0",
                borderRadius: "5px",
                minWidth: "100px",
                textAlign: "center",
              }}
            >
              {participant.username}
            </div>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div style={{ marginBottom: "20px" }}>
        <h3>Chat</h3>
        <div
          style={{
            height: "300px",
            overflowY: "auto",
            border: "1px solid #ccc",
            padding: "10px",
            marginBottom: "10px",
            background: "#fafafa",
            borderRadius: "8px",
          }}
        >
          {messages.map((msg, idx) => (
            <p key={idx} style={{ margin: "5px 0" }}>
              <strong>{msg.sender}</strong>
              <span style={{ color: "#666", fontSize: "0.8em", marginLeft: "5px" }}>
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
              : {msg.content}
            </p>
          ))}
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            style={{ flex: 1, padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
            placeholder="Type a message..."
          />
          <button
            onClick={sendMessage}
            style={{
              padding: "8px 15px",
              background: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Send
          </button>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={handleHangup}
          style={{
            padding: "10px 20px",
            background: "#ff4444",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Hang Up
        </button>
        {mediaState.url && (
          <button
            onClick={() => handleMediaControl({ isPlaying: !mediaState.isPlaying })}
            style={{
              padding: "10px 20px",
              background: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            {mediaState.isPlaying ? "Pause" : "Play"}
          </button>
        )}
      </div>

      {/* Hangup Modal */}
      {showHangupModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "8px",
              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
              textAlign: "center",
            }}
          >
            <h3>Are you sure you want to hang up?</h3>
            <p>This will disconnect you from the room.</p>
            <div style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                onClick={confirmHangup}
                style={{
                  padding: "10px 20px",
                  background: "#ff4444",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                Yes
              </button>
              <button
                onClick={cancelHangup}
                style={{
                  padding: "10px 20px",
                  background: "#ccc",
                  color: "black",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debug Info */}
      {process.env.NODE_ENV === "development" && (
        <div style={{ marginTop: "20px", color: "#666", fontSize: "0.9em" }}>
          <p>Current Time: {mediaState.currentTime.toFixed(2)}s</p>
          <p>Duration: {mediaState.duration}s</p>
          <p>Playing: {mediaState.isPlaying ? "Yes" : "No"}</p>
          <p>In Call: {isInCall ? "Yes" : "No"}</p>
          <p>Screen Sharing: {isScreenSharing ? "Yes" : "No"}</p>
          <p>Remote Streams: {remoteStreams.size}</p>
        </div>
      )}
    </div>
  )
}

export default MovieStream

