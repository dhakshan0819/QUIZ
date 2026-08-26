import React, { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { getBackendUrl } from '../utils/config'

const socket = io(getBackendUrl());

export default function Lobby(){
  const [count, setCount] = useState(0);
  useEffect(()=>{
    socket.on('lobby:update', (p)=> setCount(p.count || 0));
    return ()=> socket.off('lobby:update');
  },[]);
  return (
    <div className="p-4 bg-black/50 rounded">
      <h4 className="text-cyan-200">Connected Participants</h4>
      <div className="text-3xl font-bold text-cyan-100">{count}</div>
    </div>
  )
}