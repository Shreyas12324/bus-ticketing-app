import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TripList from './components/TripList';
import TripPage from './components/TripPage';
import Header from './components/Header';

function App() {
  return (
    <Router>
      <div className="App" style={{ position: 'relative', minHeight: '100vh' }}>
        {/* Video background */}
        <video
          autoPlay
          muted
          loop
          playsInline
          src={`${process.env.PUBLIC_URL}/busvideo.mp4`}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: -1,
          }}
        />

        {/* Dark overlay for readability */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.55))',
          zIndex: -1,
        }} />

        <Header />
        <Routes>
          <Route path="/" element={<TripList />} />
          <Route path="/trip/:id" element={<TripPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
