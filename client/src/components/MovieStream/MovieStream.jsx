"use client"

import { useEffect, useState, useRef } from "react"
import io from "socket.io-client"
import { useAuth } from "../../context/AuthContext"
import { useNavigate, useLocation } from "react-router-dom"
import toast from "react-hot-toast"
import UploadProgress from "./UploadProgress"

const MovieStream = () => {
  const [roomId, setRoomId] = useState("")
  const [isHost, setIsHost] = useState(false)
  const [isLive, setIsLive] = useState(true)
  const [users, setUsers] = useState([])
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [videoSource, setVideoSource] = useState("http://localhost:5000/video/sample.mp4")
  const [userCount, setUserCount] = useState(0)
  const [localStream, setLocalStream] = useState(null)
  const [remoteStreams, setRemoteStreams] = useState({})
  const [cameraOn, setCameraOn] = useState(false)
  const [micOn, setMicOn] = useState(false)
  const [showControls, setShowControls] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState("Disconnected")
  const [debugInfo, setDebugInfo] = useState({})
  const [link, setsharelink] = useState('')
  const { user } = useAuth()
  const socketRef = useRef(null)
  const videoRef = useRef(null)
  const localVideoRef = useRef(null)
  const peerConnectionsRef = useRef({})
  const remoteVideoRefs = useRef({})
  const navigate = useNavigate()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const linkRef = useRef(null);

  const API_BASE_URL = import.meta.env.VITE_API_ADDRESS;
  
  const openModal = () => {
    setIsOpen(true);
    setCopied(false);
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  const copyToClipboard = () => {
    if (linkRef.current && !copied) {
      linkRef.current.select();
      document.execCommand('copy');
      // Modern clipboard API
      navigator.clipboard.writeText(link).then(() => {
        setCopied(true);
      });
    }
  };

  // Close modal when clicking outside
  const handleOutsideClick = (e) => {
    if (e.target.id === "modal-backdrop") {
      closeModal();
    }
  };

  // Debug function to log peer connection state
  const logPeerConnectionState = (userId, pc) => {
    const state = {
      connectionState: pc.connectionState,
      iceConnectionState: pc.iceConnectionState,
      iceGatheringState: pc.iceGatheringState,
      signalingState: pc.signalingState,
    }

    console.log(`Peer connection with ${userId}:`, state)

    setDebugInfo((prev) => ({
      ...prev,
      [userId]: state,
    }))

    return state
  }

  useEffect(() => {
    const query = new URLSearchParams(location.search)
    const room = query.get("roomId")
    setRoomId(room)
    setsharelink(location.state?.link || {});
    const hostFromState = location.state?.isHost ?? false
    setIsHost(hostFromState)

    if (!socketRef.current && user?.googleId && user?.name) {
      // Initialize socket connection
      socketRef.current = io(`${API_BASE_URL}`, {
        transports: ["websocket"],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        auth: { googleId: user.googleId, username: user.name, userId: user._id },
      })

      socketRef.current.on("connect", () => {
        console.log("Connected to WebSocket")
        setConnectionStatus("Connected to server")
        socketRef.current.emit("join-room", room, hostFromState)

        if (hostFromState) {
          // Send host state updates at regular intervals
          const hostStateInterval = setInterval(() => {
            if (videoRef.current && socketRef.current.connected) {
              socketRef.current.emit("host-state", {
                roomId: room,
                time: videoRef.current.currentTime,
                playing: !videoRef.current.paused,
              })
            }
          }, 500)

          // Clean up interval on component unmount
          return () => clearInterval(hostStateInterval)
        }
      })

      socketRef.current.on("connect_error", (err) => {
        console.error("Socket connection error:", err)
        setConnectionStatus("Connection error")
        setIsLoading(false)
      })

      socketRef.current.on("reconnect", (attempt) => {
        console.log(`Reconnected after ${attempt} attempts`)
        setConnectionStatus("Reconnected")
        if (room) socketRef.current.emit("join-room", room, hostFromState)
      })

      socketRef.current.on("user-count", (count) => setUserCount(count))

      socketRef.current.on("user-joined", (userId) => {
        console.log("User joined:", userId)
        setUsers((prev) => [...new Set([...prev, userId])])

        // Delay initiating call to ensure both sides are ready
        setTimeout(() => {
          if (localStream) {
            console.log("Initiating call with new user:", userId)
            createPeerConnection(userId, true)
          }
        }, 1000)
      })

      socketRef.current.on("user-left", (userId) => {
        console.log("User left:", userId)
        setUsers((prev) => prev.filter((id) => id !== userId))

        // Close peer connection
        if (peerConnectionsRef.current[userId]) {
          peerConnectionsRef.current[userId].close()
          delete peerConnectionsRef.current[userId]
        }

        // Remove remote stream
        setRemoteStreams((prev) => {
          const newStreams = { ...prev }
          delete newStreams[userId]
          return newStreams
        })
      })

      socketRef.current.on("video-source", (source) => {
        const fullSource = `${API_BASE_URL}${source}`
        console.log("Received new video source:", fullSource)
        setVideoSource(fullSource)
        setIsLoading(true)
        loadAndPlayVideo(fullSource)
      })

      socketRef.current.on("live-state", (state) => {
        if (isLive && !isHost && videoRef.current) {
          console.log("Syncing to host state:", state)

          // Only update time if difference is significant (more than 2 seconds)
          const timeDiff = Math.abs(videoRef.current.currentTime - state.time)
          if (timeDiff > 2) {
            videoRef.current.currentTime = state.time
          }

          if (state.playing && videoRef.current.paused) {
            videoRef.current.play().catch((err) => console.error("Live state playback failed:", err))
          } else if (!state.playing && !videoRef.current.paused) {
            videoRef.current.pause()
          }
        }
      })

      socketRef.current.on("pause-all-streams", (time) => {
        if (videoRef.current) {
          videoRef.current.currentTime = time
          videoRef.current.pause()
          setIsLive(true)
        }
      })

      socketRef.current.on("chat-message", (data) => {
        setMessages((prev) => [...prev, data])
      })

      socketRef.current.on("error", ({ message }) => {
        console.error("Socket error:", message)
        toast.error(message)
      })

      socketRef.current.on("existing-users", (users) => {
        console.log("Existing users:", users)
        setUsers(users.map((user) => user.socketId))

        // Delay initiating calls to ensure both sides are ready
        setTimeout(() => {
          users.forEach((user) => {
            if (user.socketId !== socketRef.current.id) {
              console.log("Creating peer connection with existing user:", user.socketId)
              createPeerConnection(user.socketId, true)
            }
          })
        }, 1000)
      })

      socketRef.current.on("offer", async (data) => {
        try {
          const { offer, from } = data
          console.log("Received offer from:", from)

          // Create peer connection if it doesn't exist
          const pc = createPeerConnection(from, false)

          // Set remote description (the offer)
          await pc.setRemoteDescription(new RTCSessionDescription(offer))
          console.log("Set remote description (offer) successfully")

          // Create answer
          const answer = await pc.createAnswer()
          console.log("Created answer")

          // Set local description (the answer)
          await pc.setLocalDescription(answer)
          console.log("Set local description (answer) successfully")

          // Send the answer back
          socketRef.current.emit("answer", { answer, target: from })
          console.log("Sent answer to:", from)

          // Log connection state
          logPeerConnectionState(from, pc)
        } catch (error) {
          console.error("Error handling offer:", error)
        }
      })

      socketRef.current.on("answer", async (data) => {
        try {
          const { answer, from } = data
          console.log("Received answer from:", from)

          const pc = peerConnectionsRef.current[from]
          if (pc) {
            // Set remote description (the answer)
            await pc.setRemoteDescription(new RTCSessionDescription(answer))
            console.log("Set remote description (answer) successfully")

            // Log connection state
            logPeerConnectionState(from, pc)
          } else {
            console.warn("Received answer but no peer connection exists for:", from)
          }
        } catch (error) {
          console.error("Error handling answer:", error)
        }
      })

      socketRef.current.on("ice-candidate", async (data) => {
        try {
          const { candidate, from } = data
          console.log("Received ICE candidate from:", from)

          const pc = peerConnectionsRef.current[from]
          if (pc && candidate) {
            // Add the ICE candidate
            await pc.addIceCandidate(new RTCIceCandidate(candidate))
            console.log("Added ICE candidate successfully")

            // Log connection state
            logPeerConnectionState(from, pc)
          } else {
            console.warn("Received ICE candidate but no peer connection exists for:", from)
          }
        } catch (error) {
          console.error("Error handling ICE candidate:", error)
        }
      })

      socketRef.current.on("media-status", (data) => {
        const { userId, cameraOn, micOn } = data
        console.log("Media status update:", { userId, cameraOn, micOn })

        setRemoteStreams((prev) => {
          const newStreams = { ...prev }
          if (newStreams[userId]) {
            newStreams[userId] = {
              ...newStreams[userId],
              cameraOn,
              micOn,
            }
          }
          return newStreams
        })
      })

      // Initial video load
      loadAndPlayVideo(videoSource)

      return () => {
        if (socketRef.current) {
          socketRef.current.emit("leaveRoom", { roomId: room })
          socketRef.current.disconnect()
          socketRef.current = null
        }

        // Close all peer connections
        Object.values(peerConnectionsRef.current).forEach((pc) => pc.close())
        peerConnectionsRef.current = {}

        // Stop all local media tracks
        if (localStream) {
          localStream.getTracks().forEach((track) => track.stop())
        }
      }
    }
  }, [user, location])

  // Auto-enable camera and mic when joining
  useEffect(() => {
    if (roomId && !localStream && !cameraOn && !micOn) {
      // Auto-enable camera and mic after a short delay
      const timer = setTimeout(() => {
        toggleCamera()
        toggleMic()
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [roomId])

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  const loadAndPlayVideo = (source) => {
    if (videoRef.current) {
      console.log("Loading video from:", source)

      // Reset video element
      videoRef.current.pause()
      videoRef.current.removeAttribute("src")
      videoRef.current.load()

      // Set new source
      videoRef.current.src = source

      // Configure video element for better buffering
      videoRef.current.preload = "auto"

      // Add buffer size (if supported)
      try {
        if ("buffered" in videoRef.current) {
          videoRef.current.bufferSize = 5 // Buffer 5 seconds ahead
        }
      } catch (e) {
        console.log("Buffer size not supported")
      }

      // Event listeners for better loading feedback
      videoRef.current.onloadstart = () => {
        console.log("Video loading started")
        setIsLoading(true)
      }

      videoRef.current.oncanplay = () => {
        console.log("Video can play")
        setIsLoading(false)
        videoRef.current.play().catch((err) => {
          console.error("Initial playback failed:", err)
          setIsLoading(false)
        })
      }

      videoRef.current.onprogress = () => {
        // Update buffering progress if needed
        const buffered = videoRef.current.buffered
        if (buffered.length > 0) {
          const bufferedEnd = buffered.end(buffered.length - 1)
          const duration = videoRef.current.duration
          console.log(`Buffered: ${Math.round((bufferedEnd / duration) * 100)}%`)
        }
      }

      videoRef.current.onerror = (e) => {
        console.error("Video loading error:", e)
        setIsLoading(false)
        toast.error("Error loading video. Please try again.")
      }

      videoRef.current.onwaiting = () => {
        console.log("Video buffering...")
        setIsLoading(true)
      }

      videoRef.current.onplaying = () => {
        console.log("Video playing")
        setIsLoading(false)
      }

      videoRef.current.load()
    }
  }

  const playVideo = () => {
    if (videoRef.current) {
      videoRef.current.play().catch((err) => console.error("Play failed:", err))
      setIsLive(false)
      if (isHost) {
        socketRef.current.emit("host-state", {
          roomId,
          time: videoRef.current.currentTime,
          playing: true,
        })
      }
    }
  }

  const pauseVideo = () => {
    if (videoRef.current) {
      videoRef.current.pause()
      setIsLive(false)
      if (isHost) {
        socketRef.current.emit("host-state", {
          roomId,
          time: videoRef.current.currentTime,
          playing: false,
        })
      }
    }
  }

  const seekVideo = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds
      setIsLive(false)
      if (isHost) {
        socketRef.current.emit("host-state", {
          roomId,
          time: videoRef.current.currentTime,
          playing: !videoRef.current.paused,
        })
      }
    }
  }

  const pauseAll = () => {
    if (isHost && videoRef.current) {
      videoRef.current.pause()
      socketRef.current.emit("pause-all", roomId)
      socketRef.current.emit("host-state", {
        roomId,
        time: videoRef.current.currentTime,
        playing: false,
      })
    }
  }

  const resyncToLive = () => {
    setIsLive(true)
  }

  const uploadVideo = () => {
    if (!isHost) return

    const fileInput = document.getElementById("videoUpload")
    const file = fileInput.files[0]

    if (!file) {
      console.error("No file selected for upload")
      toast.error("Please select a video file!")
      return
    }

    // Check file size
    if (file.size > 200 * 1024 * 1024) {
      // 200MB
      toast.error("File is too large. Maximum size is 200MB.")
      return
    }

    // Check file type
    if (!file.type.startsWith("video/")) {
      toast.error("Only video files are allowed!")
      return
    }

    const formData = new FormData()
    formData.append("video", file)

    setIsLoading(true)
    setUploadProgress(0)
    console.log("Uploading video:", file.name, "Size:", (file.size / (1024 * 1024)).toFixed(2) + "MB")

    // Use XMLHttpRequest for better upload progress tracking
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100)
        console.log(`Upload progress: ${percentComplete}%`)
        setUploadProgress(percentComplete)
      }
    })

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText)
          console.log("Video uploaded successfully:", data)

          const newSource = `${API_BASE_URL}${data.path}`
          socketRef.current.emit("change-video-source", { roomId, source: data.path })
          setVideoSource(newSource)
          loadAndPlayVideo(newSource)

          toast.success("Video uploaded successfully!")
          setUploadProgress(0)
          setIsLoading(false)
        } catch (error) {
          console.error("Error parsing response:", error)
          toast.error("Error processing server response")
          setUploadProgress(0)
          setIsLoading(false)
        }
      } else {
        console.error("Upload failed with status:", xhr.status)
        toast.error(`Upload failed: ${xhr.statusText}`)
        setUploadProgress(0)
        setIsLoading(false)
      }
    })

    xhr.addEventListener("error", () => {
      console.error("Upload failed due to network error")
      toast.error("Network error during upload. Please try again.")
      setUploadProgress(0)
      setIsLoading(false)
    })

    xhr.addEventListener("abort", () => {
      console.log("Upload aborted")
      toast.info("Upload cancelled")
      setUploadProgress(0)
      setIsLoading(false)
    })

    xhr.addEventListener("timeout", () => {
      console.error("Upload timed out")
      toast.error("Upload timed out. Please try again with a smaller file.")
      setUploadProgress(0)
      setIsLoading(false)
    })

    // Set a longer timeout for large files
    xhr.timeout = 300000 // 5 minutes

    xhr.open("POST", `${API_BASE_URL}/upload-video`, true)
    xhr.send(formData)
  }

  const toggleCamera = async () => {
    try {
      if (!cameraOn) {
        // Starting camera
        let stream

        try {
          // Request camera access with constraints
          const videoStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              frameRate: { ideal: 30 },
            },
            audio: false,
          })

          if (!localStream) {
            // If no stream exists yet, use this one
            stream = videoStream

            // If mic is also on, add audio tracks
            if (micOn) {
              try {
                const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
                audioStream.getAudioTracks().forEach((track) => {
                  stream.addTrack(track)
                })
              } catch (audioErr) {
                console.error("Could not add audio to stream:", audioErr)
              }
            }
          } else {
            // If we already have a stream, add the video track to it
            stream = localStream

            // Remove any existing video tracks
            stream.getVideoTracks().forEach((track) => {
              stream.removeTrack(track)
              track.stop()
            })

            // Add the new video track
            videoStream.getVideoTracks().forEach((track) => {
              stream.addTrack(track)
            })
          }

          // Update local stream
          setLocalStream(stream)
          setCameraOn(true)

          // Update all peer connections with the new stream
          updateAllPeerConnections()

          // Notify other users about camera status
          socketRef.current.emit("toggle-media", { cameraOn: true, micOn })

          console.log("Camera enabled successfully")
          toast.success("Camera enabled")
        } catch (err) {
          console.error("Error accessing camera:", err)
          toast.error("Could not access camera. Please check permissions.")
          return
        }
      } else {
        // Stopping camera
        if (localStream) {
          // Stop all video tracks
          localStream.getVideoTracks().forEach((track) => {
            track.stop()
            localStream.removeTrack(track)
          })

          // If we have no audio tracks either, set localStream to null
          if (localStream.getAudioTracks().length === 0) {
            setLocalStream(null)
          }

          setCameraOn(false)

          // Update all peer connections
          updateAllPeerConnections()

          // Notify other users about camera status
          socketRef.current.emit("toggle-media", { cameraOn: false, micOn })

          console.log("Camera disabled")
          toast.success("Camera disabled")
        }
      }
    } catch (err) {
      console.error("Camera toggle error:", err)
      toast.error("Error toggling camera")
    }
  }

  const toggleMic = async () => {
    try {
      if (!micOn) {
        // Starting microphone
        let stream

        try {
          // Request microphone access
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
            },
          })

          if (!localStream) {
            // If no stream exists yet, use this one
            stream = audioStream

            // If camera is also on, add video tracks
            if (cameraOn) {
              try {
                const videoStream = await navigator.mediaDevices.getUserMedia({ video: true })
                videoStream.getVideoTracks().forEach((track) => {
                  stream.addTrack(track)
                })
              } catch (videoErr) {
                console.error("Could not add video to stream:", videoErr)
              }
            }
          } else {
            // If we already have a stream, add the audio track to it
            stream = localStream

            // Remove any existing audio tracks
            stream.getAudioTracks().forEach((track) => {
              stream.removeTrack(track)
              track.stop()
            })

            // Add the new audio track
            audioStream.getAudioTracks().forEach((track) => {
              stream.addTrack(track)
            })
          }

          // Update local stream
          setLocalStream(stream)
          setMicOn(true)

          // Update all peer connections with the new stream
          updateAllPeerConnections()

          // Notify other users about mic status
          socketRef.current.emit("toggle-media", { cameraOn, micOn: true })

          console.log("Microphone enabled successfully")
          toast.success("Microphone enabled")
        } catch (err) {
          console.error("Error accessing microphone:", err)
          toast.error("Could not access microphone. Please check permissions.")
          return
        }
      } else {
        // Stopping microphone
        if (localStream) {
          // Stop all audio tracks
          localStream.getAudioTracks().forEach((track) => {
            track.stop()
            localStream.removeTrack(track)
          })

          // If we have no video tracks either, set localStream to null
          if (localStream.getVideoTracks().length === 0) {
            setLocalStream(null)
          }

          setMicOn(false)

          // Update all peer connections
          updateAllPeerConnections()

          // Notify other users about mic status
          socketRef.current.emit("toggle-media", { cameraOn, micOn: false })

          console.log("Microphone disabled")
          toast.success("Microphone disabled")
        }
      }
    } catch (err) {
      console.error("Microphone toggle error:", err)
      toast.error("Error toggling microphone")
    }
  }

  // Helper function to update all peer connections with current tracks
  const updateAllPeerConnections = () => {
    if (!localStream) return

    Object.entries(peerConnectionsRef.current).forEach(([userId, pc]) => {
      // Get all current senders (tracks we're sending)
      const senders = pc.getSenders()

      // For each track in our local stream
      localStream.getTracks().forEach((track) => {
        const sender = senders.find((s) => s.track && s.track.kind === track.kind)

        if (sender) {
          // If we already have a sender for this track type, replace the track
          console.log(`Replacing ${track.kind} track for peer:`, userId)
          sender.replaceTrack(track)
        } else {
          // Otherwise add the track as a new sender
          console.log(`Adding ${track.kind} track to peer connection:`, userId)
          pc.addTrack(track, localStream)
        }
      })

      // Log the updated connection state
      logPeerConnectionState(userId, pc)
    })
  }

  const createPeerConnection = (userId, isInitiator) => {
    // If we already have a connection to this peer, close it first
    if (peerConnectionsRef.current[userId]) {
      console.log(`Closing existing peer connection with ${userId}`)
      peerConnectionsRef.current[userId].close()
      delete peerConnectionsRef.current[userId]
    }

    console.log(`Creating new peer connection with ${userId}, initiator: ${isInitiator}`)

    // Use multiple STUN/TURN servers for better connectivity
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },
      ],
      iceCandidatePoolSize: 10,
    })

    peerConnectionsRef.current[userId] = pc

    // Handle ICE candidate generation
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`Generated ICE candidate for ${userId}`)
        socketRef.current.emit("ice-candidate", {
          candidate: event.candidate,
          target: userId,
        })
      }
    }

    // Log ICE gathering state changes
    pc.onicegatheringstatechange = () => {
      console.log(`ICE gathering state for ${userId}: ${pc.iceGatheringState}`)
    }

    // Log ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      console.log(`ICE connection state for ${userId}: ${pc.iceConnectionState}`)

      if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
        console.log(`ICE connection with ${userId} failed or disconnected. Attempting to restart...`)

        // Try to restart ICE
        pc.restartIce()

        // If still failing after a delay, recreate the connection
        setTimeout(() => {
          if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
            console.log(`Recreating peer connection with ${userId} after failure`)
            createPeerConnection(userId, true)
          }
        }, 5000)
      }
    }

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`Connection state for ${userId}: ${pc.connectionState}`)

      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        console.log(`Connection to ${userId} failed or disconnected. Attempting to reconnect...`)

        // Attempt to reconnect after a short delay
        setTimeout(() => {
          if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
            console.log(`Recreating peer connection with ${userId}`)
            createPeerConnection(userId, true)
          }
        }, 3000)
      }
    }

    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log(`Received ${event.track.kind} track from ${userId}`)

      // Create a new MediaStream if we don't have one for this user yet
      const stream = new MediaStream()

      // Add all tracks from the event
      event.streams[0].getTracks().forEach((track) => {
        stream.addTrack(track)
      })

      // Update remote streams state
      setRemoteStreams((prev) => ({
        ...prev,
        [userId]: {
          stream,
          cameraOn: stream.getVideoTracks().length > 0,
          micOn: stream.getAudioTracks().length > 0,
        },
      }))

      console.log(
        `Remote stream for ${userId} now has ${stream.getTracks().length} tracks:`,
        stream
          .getTracks()
          .map((t) => t.kind)
          .join(", "),
      )
    }

    // Add existing tracks to the peer connection
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        console.log(`Adding ${track.kind} track to new peer connection:`, userId)
        pc.addTrack(track, localStream)
      })
    }

    // If we're the initiator, create and send an offer
    if (isInitiator) {
      console.log(`Creating offer as initiator for ${userId}`)
      pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      })
        .then((offer) => {
          pc.setLocalDescription(offer)
            .then(() => {
              console.log(`Sending offer to ${userId}`)
              socketRef.current.emit("offer", {
                target: userId,
                offer: offer,
              })
            })
            .catch((error) => {
              console.error("Error setting local description:", error)
            })
        })
        .catch((error) => {
          console.error("Error creating offer:", error)
        })
    }

    return pc
  }

  const sendMessage = () => {
    if (newMessage.trim() && socketRef.current) {
      socketRef.current.emit("chat-message", { roomId, message: newMessage })
      setNewMessage("")
    }
  }

  const handleLeave = () => {
    if (socketRef.current) {
      socketRef.current.emit("leaveRoom", { roomId })
      socketRef.current.disconnect()
    }
    navigate("/")
  }

  const toggleChat = () => {
    setShowChat(!showChat)
  }

  return (
    <div className="h-screen w-full bg-black text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 p-2 flex justify-between items-center">
        <div className="flex items-center">
          <h2 className="text-xl font-bold">MV-live</h2>
          <span className="mx-2">|</span>
          <span>Room: {roomId}</span>
          <span className="mx-2">|</span>
          <div className="font-sans">
            {/* Share Button */}
            <button
              onClick={openModal}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z"></path>
              </svg>
              Share
            </button>

            {/* Modal Overlay */}
            {isOpen && (
              <div
                id="modal-backdrop"
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
                onClick={handleOutsideClick}
              >
                {/* Modal Content */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-medium text-gray-100">Share Link</h3>
                    <button
                      onClick={closeModal}
                      className="text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  </div>

                  <div className="mb-6">
                    <p className="text-gray-300 mb-2">Copy the link below to share:</p>
                    <div className="flex rounded-md overflow-hidden">
                      <input
                        ref={linkRef}
                        type="text"
                        readOnly
                        value={link}
                        className="flex-grow bg-gray-800 text-gray-200 py-2 px-3 focus:outline-none"
                      />
                      <button
                        onClick={copyToClipboard}
                        disabled={copied}
                        className={`px-4 flex items-center transition-colors ${copied
                            ? "bg-green-700 text-white cursor-not-allowed"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white"
                          }`}
                      >
                        {copied ? (
                          <>
                            <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                            </svg>
                            Copied
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                              <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"></path>
                              <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"></path>
                            </svg>
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={closeModal}
                      className="bg-gray-700 hover:bg-gray-600 text-gray-200 py-2 px-4 rounded-md transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <span>{isHost ? "Host" : "Guest"}</span>
          <span className="mx-2">|</span>
          <span>Users: {userCount}</span>
          <span className="mx-2">|</span>
          <span className="text-xs">{connectionStatus}</span>
        </div>
        <button onClick={handleLeave} className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded">
          Leave
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video Container */}
        <div className="relative flex-1 bg-gray-900 flex flex-col items-center justify-center">
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            <video
              ref={videoRef}
              className="max-h-full max-w-full mx-auto h-[90%]"
              onError={(e) => {
                console.error("Video element error:", e.nativeEvent)
                setIsLoading(false)
              }}
              onMouseEnter={() => setShowControls(true)}
              onMouseLeave={() => setShowControls(true)}
              preload="auto"
              playsInline
              crossOrigin="anonymous"
              onStalled={() => console.log("Video stalled")}
              onSuspend={() => console.log("Video suspended")}
              onAbort={() => console.log("Video aborted")}
            >
              <source src={videoSource} type="video/mp4" />
              Your browser doesn't support video.
            </video>

            {/* Loading Spinner */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {/* Video controls overlay - shown on hover */}
            {showControls && !isLoading && (
              <div className="bottom-10 left-0 right-0 mx-auto w-1/2 bg-black bg-opacity-70 p-2 rounded-lg flex justify-center items-center space-x-6 transition-opacity duration-200">
                <button
                  onClick={() => seekVideo(-10)}
                  className="bg-gray-800 hover:bg-gray-600 p-2 rounded-full text-xl"
                  title="Rewind 10s"
                >
                  ⏴
                </button>
                <button
                  onClick={pauseVideo}
                  className="bg-gray-800 hover:bg-gray-600 p-2 rounded-full text-xl"
                  title="Pause"
                >
                  ⏸
                </button>
                <button
                  onClick={playVideo}
                  className="bg-gray-800 hover:bg-gray-600 p-2 rounded-full text-xl"
                  title="Play"
                >
                  ⏵
                </button>
                <button
                  onClick={() => seekVideo(10)}
                  className="bg-gray-800 hover:bg-gray-600 p-2 rounded-full text-xl"
                  title="Forward 10s"
                >
                  ⏵
                </button>
                <button
                  onClick={resyncToLive}
                  className="bg-gray-800 hover:bg-gray-600 p-2 rounded-full text-xl"
                  title="Sync to Live"
                >
                  ⭮
                </button>
                {isHost && (
                  <button
                    onClick={pauseAll}
                    className="bg-gray-800 hover:bg-gray-600 p-2 rounded-full text-xl"
                    title="Pause All"
                  >
                    ⏹
                  </button>
                )}
              </div>
            )}

            {/* Bottom toolbar - always visible */}
            <div className="bottom-0 left-0 right-0 bg-black p-4 flex justify-center space-x-6">
              <button
                onClick={toggleCamera}
                className={`p-2 rounded-full ${cameraOn ? "bg-blue-600" : "bg-gray-700"}`}
                disabled={isLoading}
              >
                📹
              </button>
              <button
                onClick={toggleMic}
                className={`p-2 rounded-full ${micOn ? "bg-blue-600" : "bg-gray-700"}`}
                disabled={isLoading}
              >
                🎤
              </button>
              <button
                onClick={toggleChat}
                className={`p-2 rounded-full ${showChat ? "bg-blue-600" : "bg-gray-700"}`}
                disabled={isLoading}
              >
                💬
              </button>
              {isHost && (
                <div className="flex space-x-2">
                  <input type="file" id="videoUpload" accept="video/*" className="hidden" disabled={isLoading} />
                  <label
                    htmlFor="videoUpload"
                    className={`bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded cursor-pointer ${isLoading ? "opacity-50" : ""}`}
                  >
                    📂
                  </label>
                  <button
                    onClick={uploadVideo}
                    className={`bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded ${isLoading ? "opacity-50" : ""}`}
                    disabled={isLoading}
                  >
                    Upload
                  </button>
                </div>
              )}
            </div>

            {/* Video information overlay */}
            <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-50 p-2 text-sm">
              <div className="flex justify-between">
                <span>Room: {roomId}</span>
                <span>{isLive ? "Live" : "Not synced"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-64 bg-gray-900 flex flex-col">
          {/* Participants */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-2 bg-gray-800">
              <h3 className="font-bold">Participants ({userCount})</h3>
            </div>
            <div className="p-2 space-y-2">
              {localStream && (
                <div className="relative bg-gray-800 rounded p-1">
                  <video ref={localVideoRef} autoPlay muted className="w-full rounded" />
                  <div className="absolute bottom-2 left-2 text-sm bg-black bg-opacity-70 px-1 rounded">
                    You {!micOn && "🔇"}
                  </div>
                </div>
              )}
              {Object.entries(remoteStreams).map(([userId, { stream, cameraOn, micOn: remoteMicOn }]) => (
                <div key={userId} className="relative bg-gray-800 rounded p-1">
                  <video
                    autoPlay
                    ref={(el) => {
                      if (el) {
                        el.srcObject = stream
                        // Store reference to video element
                        remoteVideoRefs.current[userId] = el
                      }
                    }}
                    className="w-full rounded"
                  />
                  <div className="absolute bottom-2 left-2 text-sm bg-black bg-opacity-70 px-1 rounded">
                    User {userId.substring(0, 4)} {!remoteMicOn && "🔇"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat */}
          {showChat && (
            <div className="h-64 border-t border-gray-700 flex flex-col">
              <div className="p-2 bg-gray-800">
                <h3 className="font-bold">Chat</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {messages.map((msg, idx) => (
                  <div key={idx} className="text-sm">
                    <span className="font-semibold text-blue-400">{msg.userId}: </span>
                    <span>{msg.message}</span>
                  </div>
                ))}
              </div>
              <div className="p-2 flex">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  className="flex-1 bg-gray-700 text-white px-2 py-1 rounded-l outline-none"
                  placeholder="Type a message..."
                  disabled={isLoading}
                />
                <button
                  onClick={sendMessage}
                  className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-r"
                  disabled={isLoading}
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {uploadProgress > 0 && <UploadProgress progress={uploadProgress} />}
    </div>
  )
}

export default MovieStream

