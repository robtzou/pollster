import { useEffect, useState } from 'react';
import io from 'socket.io-client';

// Connect to our own local server
const socket = io('http://localhost:3000');

function App() {
  const [results, setResults] = useState({ A: 0, B: 0, C: 0, D: 0 });
  const [status, setStatus] = useState("Idle");

  useEffect(() => {
    // Listen for live updates from server
    socket.on('update-results', (newResults) => {
      setResults(newResults);
    });

    return () => {
      socket.off('update-results');
    };
  }, []);

  const startPoll = () => {
    setStatus("Active");
    // Tell server to wake up the students
    socket.emit('teacher-start-poll', "What is the capital of Maryland?");
  };

  const stopPoll = () => {
    setStatus("Stopped");
    socket.emit('teacher-stop-poll');
  };

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>Teacher Dashboard</h1>

      <div style={{ marginBottom: 20 }}>
        Status: <strong>{status}</strong>
      </div>

      <button onClick={startPoll} style={{ padding: '10px 20px', marginRight: 10, background: 'green', color: 'white' }}>
        Start Poll
      </button>

      <button onClick={stopPoll} style={{ padding: '10px 20px', background: 'red', color: 'white' }}>
        Stop Poll
      </button>

      <div style={{ marginTop: 40, display: 'flex', gap: 20 }}>
        {Object.keys(results).map(key => (
          <div key={key} style={{
            background: '#252a37ff',
            padding: 20,
            borderRadius: 8,
            textAlign: 'center',
            width: 60
          }}>
            <h2>{key}</h2>
            <div style={{ fontSize: 40, fontWeight: 'bold' }}>{results[key]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;