import { io, Socket } from 'socket.io-client'

export const RELAY_URL = import.meta.env.VITE_RELAY_URL as string

/**
 * Connect to the Cloud Relay as a student.
 * Joins the specified room and returns the socket instance.
 */
export function connectToRelay(roomCode: string): Socket {
  const socket = io(RELAY_URL, {
    transports: ['websocket'],
    timeout: 8000,
    reconnection: true,
    reconnectionDelay: 2000
  })

  socket.on('connect', () => {
    socket.emit('join-room', roomCode)
  })

  return socket
}
