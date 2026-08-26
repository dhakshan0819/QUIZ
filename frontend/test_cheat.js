const { io } = require('socket.io-client');

async function test() {
  console.log('Registering student...');
  try {
    const res = await fetch('http://localhost:4000/api/students/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice Cooper',
        registerNumber: 'CS101',
        department: 'Cyber Security'
      })
    });
    const data = await res.json();
    console.log('Registration result:', data);
  } catch (err) {
    console.log('Registration failed (might already exist):', err.message);
  }

  // Connect socket and trigger alert
  const socket = io('http://localhost:4000');
  socket.on('connect', () => {
    console.log('Socket connected. Emitting student:cheat_alert...');
    socket.emit('student:cheat_alert', {
      registerNumber: 'CS101',
      action: 'Window focus lost (switched tabs or apps)'
    });
    
    setTimeout(() => {
      socket.disconnect();
      console.log('Test execution completed.');
      process.exit(0);
    }, 1500);
  });
}

test().catch(console.error);
