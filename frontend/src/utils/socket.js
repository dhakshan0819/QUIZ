import { io } from 'socket.io-client'
import { getBackendUrl } from './config'

const backendUrl = getBackendUrl();
const socket = io(backendUrl || undefined, {
  transports: ['websocket', 'polling'],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});

export default socket;