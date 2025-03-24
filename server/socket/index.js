const Message = require("../models/Message")
const Room = require("../models/Room")
const mongoose = require("mongoose")

const initializeSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    const googleId = socket.handshake.auth.googleId
    const username = socket.handshake.auth.username
    const userId = socket.handshake.auth.userId

    if (!googleId || !username || !userId) {
      console.error("Authentication error: Google ID or username missing")
      socket.disconnect()
      return
    }

    socket.user = { id: googleId, username, userId }
    console.log(`User connected: ${socket.user.username} (${socket.id})`)

    // Store active peers for video calls
    const activePeers = new Map()

    socket.on("joinRoom", async ({ roomId }) => {
      if (!socket.user || !roomId) return

      try {
        const room = await Room.findOne({ roomId })
        if (!room) {
          socket.emit("error", { message: "Room not found" })
          return
        }

        if (room.participants.length >= room.maxParticipants) {
          socket.emit("error", { message: "Room is full" })
          return
        }

        socket.join(roomId)
        console.log(`${socket.user.username} joined room: ${roomId}`)

        const participantExists = room.participants.some((p) => p.equals(socket.user.userId))
        if (!participantExists) {
          room.participants.push(socket.user.userId)
        }

        room.lastActive = new Date()
        await room.save()

        const roomUsers = await io.in(roomId).allSockets()
        const connectedUsers = Array.from(roomUsers).map((socketId) => {
          const userSocket = io.sockets.sockets.get(socketId)
          return {
            userId: userSocket.user.userId,
            googleId: userSocket.user.id,
            username: userSocket.user.username,
            socketId: socketId, // Include socket ID for WebRTC connections
          }
        })

        const populatedRoom = await Room.findOne({ roomId }).populate("participants", "name googleId")

        io.to(roomId).emit("roomUpdate", {
          participants: connectedUsers,
          total: connectedUsers.length,
          media: room.currentMedia,
        })

        io.to(roomId).emit("userJoined", {
          userId: socket.user.userId,
          googleId: socket.user.id,
          username: socket.user.username,
          socketId: socket.id,
        })

        // Notify the new user about existing peers for video calls
        socket.emit(
          "existingPeers",
          connectedUsers.filter((user) => user.socketId !== socket.id && activePeers.has(user.socketId)),
        )
      } catch (error) {
        console.error("Error in joinRoom:", error)
        socket.emit("error", { message: "Failed to join room" })
      }
    })

    socket.on("sendMessage", async ({ roomId, content }) => {
      if (!socket.user || !roomId) return

      try {
        const room = await Room.findOne({ roomId })
        if (!room) {
          socket.emit("error", { message: "Room not found" })
          return
        }

        if (!(room.settings?.allowChat ?? true)) {
          socket.emit("error", { message: "Chat is disabled in this room" })
          return
        }

        const message = new Message({
          roomId,
          sender: mongoose.Types.ObjectId.isValid(socket.user.userId)
            ? socket.user.userId
            : new mongoose.Types.ObjectId(),
          content,
        })

        await message.save()
        io.to(roomId).emit("newMessage", {
          sender: socket.user.username,
          content,
          timestamp: new Date(),
        })
      } catch (error) {
        console.error("Error sending message:", error)
        socket.emit("error", { message: "Failed to send message" })
      }
    })

    socket.on("updateMedia", async ({ roomId, mediaState }) => {
      try {
        const room = await Room.findOne({ roomId })
        if (!room) return

        const participant = room.participants.find((p) => p.googleId === socket.user.id)
        if (!room.settings.allowMediaControl && !room.createdBy.equals(socket.user.id)) {
          socket.emit("error", { message: "Media control restricted to room creator" })
          return
        }

        room.currentMedia = { ...room.currentMedia, ...mediaState }
        await room.save()

        io.to(roomId).emit("mediaUpdate", room.currentMedia)
      } catch (error) {
        console.error("Error updating media:", error)
        socket.emit("error", { message: "Failed to update media" })
      }
    })

    // WebRTC signaling for video calls
    socket.on("startCall", ({ roomId, isScreenSharing }) => {
      // Mark this user as an active peer for video
      activePeers.set(socket.id, {
        userId: socket.user.userId,
        username: socket.user.username,
        isScreenSharing,
      })

      // Notify everyone in the room that this user is starting a call
      socket.to(roomId).emit("peerStartedCall", {
        peerId: socket.id,
        userId: socket.user.userId,
        username: socket.user.username,
        isScreenSharing,
      })
    })

    socket.on("endCall", ({ roomId }) => {
      // Remove this user from active peers
      activePeers.delete(socket.id)

      // Notify everyone in the room that this user ended their call
      socket.to(roomId).emit("peerEndedCall", {
        peerId: socket.id,
        userId: socket.user.userId,
        username: socket.user.username,
      })
    })

    socket.on("toggleScreenShare", ({ roomId, isScreenSharing }) => {
      if (activePeers.has(socket.id)) {
        const peerInfo = activePeers.get(socket.id)
        peerInfo.isScreenSharing = isScreenSharing
        activePeers.set(socket.id, peerInfo)
      }

      socket.to(roomId).emit("peerToggleScreenShare", {
        peerId: socket.id,
        userId: socket.user.userId,
        username: socket.user.username,
        isScreenSharing,
      })
    })

    socket.on("offer", (data) => {
      const { to, offer, isScreenSharing } = data
      io.to(to).emit("offer", {
        from: socket.id,
        offer,
        username: socket.user.username,
        isScreenSharing,
      })
    })

    socket.on("answer", (data) => {
      const { to, answer } = data
      io.to(to).emit("answer", { from: socket.id, answer })
    })

    socket.on("ice-candidate", (data) => {
      const { to, candidate } = data
      io.to(to).emit("ice-candidate", { from: socket.id, candidate })
    })

    socket.on("leaveRoom", async ({ roomId }) => {
      if (!socket.user) return

      try {
        socket.leave(roomId)

        // Remove from active peers
        activePeers.delete(socket.id)

        // Notify others that this user left
        io.to(roomId).emit("userLeft", {
          userId: socket.user.userId,
          username: socket.user.username,
          socketId: socket.id,
        })

        // Update room participants
        const roomUsers = await io.in(roomId).allSockets()
        const connectedUsers = Array.from(roomUsers)
          .map((socketId) => {
            const userSocket = io.sockets.sockets.get(socketId)
            return userSocket?.user
              ? {
                  userId: userSocket.user.userId,
                  googleId: userSocket.user.id,
                  username: userSocket.user.username,
                  socketId,
                }
              : null
          })
          .filter(Boolean)

        io.to(roomId).emit("roomUpdate", {
          participants: connectedUsers,
          total: connectedUsers.length,
        })
      } catch (error) {
        console.error("Error in leaveRoom:", error)
      }
    })

    socket.on("disconnect", async () => {
      if (!socket.user) return

      // Remove from active peers
      activePeers.delete(socket.id)

      const rooms = Array.from(socket.rooms)
      for (const roomId of rooms) {
        if (roomId !== socket.id) {
          try {
            const room = await Room.findOne({ roomId })
            if (room) {
              io.to(roomId).emit("userLeft", {
                userId: socket.user.userId,
                username: socket.user.username,
                socketId: socket.id,
              })

              const roomUsers = await io.in(roomId).allSockets()
              const connectedUsers = Array.from(roomUsers)
                .map((socketId) => {
                  const userSocket = io.sockets.sockets.get(socketId)
                  return userSocket?.user
                    ? {
                        userId: userSocket.user.userId,
                        googleId: userSocket.user.id,
                        username: userSocket.user.username,
                        socketId,
                      }
                    : null
                })
                .filter(Boolean)

              io.to(roomId).emit("roomUpdate", {
                participants: connectedUsers,
                total: connectedUsers.length,
                media: room.currentMedia,
              })
            }
          } catch (error) {
            console.error("Error in disconnect:", error)
          }
        }
      }
      console.log(`User disconnected: ${socket.user.username}`)
    })
  })
}

module.exports = { initializeSocketHandlers }

