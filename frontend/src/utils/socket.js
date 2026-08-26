import { io } from 'socket.io-client'
import { getBackendUrl } from './config'
const socket = io(getBackendUrl());
export default socket;