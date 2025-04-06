class WebRTCService {
  constructor() {
    this.peerConnections = new Map()
    this.localStream = null
    this.screenStream = null
    this.onTrackCallbacks = []
    this.onStreamEndCallbacks = []
    this.onPlaybackControlCallbacks = []
    this.isScreenSharing = false
    this.screenShareVideoElement = null
  }

  // Initialize WebRTC with the socket
  initialize(socket, roomId) {
    this.socket = socket
    this.roomId = roomId

    // Listen for WebRTC signaling events
    this.socket.on("offer", async ({ from, offer, username, isScreenSharing }) => {
      console.log(`Received offer from ${username}`)
      await this.handleOffer(from, offer, isScreenSharing)
    })

    this.socket.on("answer", async ({ from, answer }) => {
      console.log(`Received answer from ${from}`)
      await this.handleAnswer(from, answer)
    })

    this.socket.on("ice-candidate", async ({ from, candidate }) => {
      await this.handleIceCandidate(from, candidate)
    })

    this.socket.on("peerStartedCall", ({ peerId, username, isScreenSharing }) => {
      console.log(`${username} started a call`)
      this.createPeerConnection(peerId, true, isScreenSharing)
    })

    this.socket.on("peerEndedCall", ({ peerId, username }) => {
      console.log(`${username} ended their call`)
      this.closePeerConnection(peerId)
    })

    this.socket.on("peerToggleScreenShare", ({ peerId, username, isScreenSharing }) => {
      console.log(`${username} ${isScreenSharing ? "started" : "stopped"} screen sharing`)
      // We'll handle this when they send a new offer
    })

    this.socket.on("userLeft", ({ socketId }) => {
      this.closePeerConnection(socketId)
    })

    this.socket.on("existingPeers", (peers) => {
      peers.forEach((peer) => {
        this.createPeerConnection(peer.socketId, true)
      })
    })

    // Handle screen share playback control commands
    this.socket.on("screenShareControlCommand", ({ action, value, fromUser }) => {
      console.log(`Received control command: ${action} from ${fromUser.username}`)
      if (this.isScreenSharing && this.screenShareVideoElement) {
        this.handlePlaybackControl(action, value)

        // Broadcast the current state to all users
        this.broadcastPlaybackState()
      }
    })
  }

  // Handle playback control for screen sharing
  handlePlaybackControl(action, value) {
    if (!this.screenShareVideoElement) return

    const video = this.screenShareVideoElement

    switch (action) {
      case "play":
        video.play()
        break
      case "pause":
        video.pause()
        break
      case "seek":
        if (typeof value === "number" && !isNaN(value)) {
          video.currentTime = value
        }
        break
      case "forward":
        if (typeof value === "number" && !isNaN(value)) {
          video.currentTime += value
        } else {
          video.currentTime += 10 // Default 10 seconds forward
        }
        break
      case "backward":
        if (typeof value === "number" && !isNaN(value)) {
          video.currentTime -= value
        } else {
          video.currentTime -= 10 // Default 10 seconds backward
        }
        break
    }

    // Notify callbacks about the control action
    this.onPlaybackControlCallbacks.forEach((callback) => callback(action, value))
  }

  // Broadcast current playback state to all users
  broadcastPlaybackState() {
    if (!this.screenShareVideoElement || !this.socket) return

    const video = this.screenShareVideoElement

    this.socket.emit("screenSharePlaybackState", {
      roomId: this.roomId,
      state: {
        currentTime: video.currentTime,
        duration: video.duration,
        isPlaying: !video.paused,
        playbackRate: video.playbackRate,
      },
    })
  }

  // Set the video element that's being shared
  setScreenShareVideoElement(videoElement) {
    this.screenShareVideoElement = videoElement

    if (videoElement) {
      // Add event listeners to broadcast state changes
      videoElement.addEventListener("play", () => this.broadcastPlaybackState())
      videoElement.addEventListener("pause", () => this.broadcastPlaybackState())
      videoElement.addEventListener("seeked", () => this.broadcastPlaybackState())
      videoElement.addEventListener("ratechange", () => this.broadcastPlaybackState())

      // Initial broadcast
      this.broadcastPlaybackState()
    }
  }

  // Start a video call
  async startCall(isScreenSharing = false) {
    try {
      if (isScreenSharing) {
        this.screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        })
        this.localStream = this.screenStream
        this.isScreenSharing = true
      } else {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })
        this.isScreenSharing = false
      }

      // Notify server that we're starting a call
      this.socket.emit("startCall", {
        roomId: this.roomId,
        isScreenSharing,
      })

      return this.localStream
    } catch (error) {
      console.error("Error starting call:", error)
      throw error
    }
  }

  // End the call
  endCall() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop())
      this.localStream = null
    }

    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop())
      this.screenStream = null
    }

    this.isScreenSharing = false
    this.screenShareVideoElement = null

    // Close all peer connections
    this.peerConnections.forEach((pc, peerId) => {
      this.closePeerConnection(peerId)
    })

    // Notify server that we're ending the call
    this.socket.emit("endCall", { roomId: this.roomId })
  }

  // Toggle screen sharing
  async toggleScreenShare(enable) {
    try {
      // Stop current streams
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => track.stop())
      }

      if (enable) {
        // Start screen sharing
        this.screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        })
        this.localStream = this.screenStream
        this.isScreenSharing = true

        // Add ended event listener to detect when user stops sharing
        const videoTrack = this.screenStream.getVideoTracks()[0]
        if (videoTrack) {
          videoTrack.onended = () => {
            this.isScreenSharing = false
            // Notify server that screen sharing has ended
            if (this.socket && this.roomId) {
              this.socket.emit("toggleScreenShare", {
                roomId: this.roomId,
                isScreenSharing: false,
              })
            }
            this.onStreamEndCallbacks.forEach((callback) => callback())
          }
        }
      } else {
        // Switch back to camera
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })
        this.isScreenSharing = false
        this.screenShareVideoElement = null
      }

      // Update all peer connections with the new stream
      this.peerConnections.forEach((pc, peerId) => {
        this.updatePeerStream(peerId, this.localStream)
      })

      // Notify server about screen sharing status
      if (this.socket && this.roomId) {
        this.socket.emit("toggleScreenShare", {
          roomId: this.roomId,
          isScreenSharing: enable,
        })
      }

      return this.localStream
    } catch (error) {
      console.error("Error toggling screen share:", error)
      this.isScreenSharing = false
      throw error
    }
  }

  // Create a peer connection to a specific peer
  async createPeerConnection(peerId, isReceiver = false, isScreenSharing = false) {
    try {
      if (this.peerConnections.has(peerId)) {
        console.log(`Peer connection to ${peerId} already exists`)
        return
      }

      const configuration = {
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
      }

      const peerConnection = new RTCPeerConnection(configuration)
      this.peerConnections.set(peerId, peerConnection)

      // Add local stream tracks to the connection
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, this.localStream)
        })
      }

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.socket.emit("ice-candidate", {
            to: peerId,
            candidate: event.candidate,
          })
        }
      }

      // Handle incoming tracks
      peerConnection.ontrack = (event) => {
        console.log("Received remote track")
        this.onTrackCallbacks.forEach((callback) => callback(event.streams[0], peerId, isScreenSharing))
      }

      // If we're the initiator, create and send an offer
      if (!isReceiver && this.localStream) {
        const offer = await peerConnection.createOffer()
        await peerConnection.setLocalDescription(offer)

        this.socket.emit("offer", {
          to: peerId,
          offer: offer,
          isScreenSharing: isScreenSharing,
        })
      }

      return peerConnection
    } catch (error) {
      console.error("Error creating peer connection:", error)
      this.closePeerConnection(peerId)
      throw error
    }
  }

  // Handle an incoming offer
  async handleOffer(peerId, offer, isScreenSharing) {
    try {
      let peerConnection = this.peerConnections.get(peerId)

      if (!peerConnection) {
        peerConnection = await this.createPeerConnection(peerId, true, isScreenSharing)
      }

      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)

      this.socket.emit("answer", {
        to: peerId,
        answer: answer,
      })
    } catch (error) {
      console.error("Error handling offer:", error)
    }
  }

  // Handle an incoming answer
  async handleAnswer(peerId, answer) {
    try {
      const peerConnection = this.peerConnections.get(peerId)
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
      }
    } catch (error) {
      console.error("Error handling answer:", error)
    }
  }

  // Handle an incoming ICE candidate
  async handleIceCandidate(peerId, candidate) {
    try {
      const peerConnection = this.peerConnections.get(peerId)
      if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
      }
    } catch (error) {
      console.error("Error handling ICE candidate:", error)
    }
  }

  // Update a peer connection with a new stream
  async updatePeerStream(peerId, stream) {
    try {
      const peerConnection = this.peerConnections.get(peerId)
      if (!peerConnection) return

      // Remove existing senders
      const senders = peerConnection.getSenders()
      senders.forEach((sender) => {
        peerConnection.removeTrack(sender)
      })

      // Add tracks from the new stream
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream)
      })

      // Create and send a new offer
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)

      this.socket.emit("offer", {
        to: peerId,
        offer: offer,
        isScreenSharing: stream === this.screenStream,
      })
    } catch (error) {
      console.error("Error updating peer stream:", error)
    }
  }

  // Close a specific peer connection
  closePeerConnection(peerId) {
    const peerConnection = this.peerConnections.get(peerId)
    if (peerConnection) {
      peerConnection.close()
      this.peerConnections.delete(peerId)
    }
  }

  // Register callback for when a new remote stream is received
  onTrack(callback) {
    this.onTrackCallbacks.push(callback)
  }

  // Register callback for when screen sharing ends
  onStreamEnd(callback) {
    this.onStreamEndCallbacks.push(callback)
  }

  // Register callback for playback control events
  onPlaybackControl(callback) {
    this.onPlaybackControlCallbacks.push(callback)
  }

  // Send playback control command to the screen sharer
  sendPlaybackControl(action, value = null) {
    if (!this.socket) {
      console.error("Cannot send playback control: Socket not initialized")
      return
    }

    if (!this.roomId) {
      console.error("Cannot send playback control: Room ID not set")
      return
    }

    try {
      this.socket.emit("screenShareControl", {
        roomId: this.roomId,
        action,
        value,
      })
    } catch (error) {
      console.error("Error sending playback control:", error)
    }
  }
}

export default new WebRTCService()

