import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import SeatMap from './SeatMap';

const TripPage = () => {
  const { id } = useParams();
  const [trip, setTrip] = useState(null);
  const [seatStatus, setSeatStatus] = useState({ soldSeats: [], heldSeats: [] });
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [message, setMessage] = useState(null);
  const [myHeldSeats, setMyHeldSeats] = useState([]);
  const [heldByUser, setHeldByUser] = useState({});
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState(123);
  const [holdExpiryBySeat, setHoldExpiryBySeat] = useState({}); // seat -> epoch ms
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ws, setWs] = useState(null);
  const [toasts, setToasts] = useState([]);
  const holdExpiryTimersRef = React.useRef({});

  const addToast = (text, variant = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, text, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };
  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // Proactively clear expired holds from local state so seats flip to green without refresh
  useEffect(() => {
    const interval = setInterval(() => {
      setSeatStatus((prev) => {
        if (!prev?.heldSeats?.length) return prev;
        const now = Date.now();
        const stillHeld = prev.heldSeats.filter((seat) => {
          const exp = holdExpiryBySeat[seat];
          return !exp || exp > now; // keep if no known expiry or not expired yet
        });
        if (stillHeld.length === prev.heldSeats.length) return prev;
        return { ...prev, heldSeats: stillHeld };
      });
      setMyHeldSeats((prev) => prev.filter((seat) => {
        const exp = holdExpiryBySeat[seat];
        return !exp || exp > Date.now();
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, [holdExpiryBySeat]);

  useEffect(() => {
    const fetchTripDetails = async () => {
      try {
        const response = await axios.get(`/trips/${id}`);
        setTrip(response.data.trip);
        setSeatStatus(response.data.status);
      } catch (err) {
        setError('Failed to fetch trip details');
        console.error('Error fetching trip:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTripDetails();
  }, [id]);

  useEffect(() => {
    // Initialize userId from localStorage for multi-user simulation across tabs
    const stored = localStorage.getItem('userId');
    if (stored) {
      setUserId(Number(stored));
    }
  }, []);

  useEffect(() => {
    // Persist userId for other tabs/windows
    if (userId) {
      localStorage.setItem('userId', String(userId));
    }
  }, [userId]);

  useEffect(() => {
    // Connect to WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const websocket = new WebSocket(`${protocol}://${window.location.host}`);
    
    websocket.onopen = () => {
      console.log('WebSocket connected');
      setWs(websocket);
    };

    websocket.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data);
        console.log('Received seat update:', update);
        
        if (update.tripId === parseInt(id)) {
          setSeatStatus(prevStatus => {
            const newStatus = { ...prevStatus };
            
            switch (update.type) {
              case 'seat-held':
                if (!newStatus.heldSeats.includes(update.seatNumber)) {
                  newStatus.heldSeats = [...newStatus.heldSeats, update.seatNumber];
                }
                // Remove from local selection unconditionally to avoid stale-closure issues
                setSelectedSeats((prev) => prev.filter((s) => s !== update.seatNumber));
                setHeldByUser((prev) => ({ ...prev, [update.seatNumber]: update.userId }));
                if (typeof update.ttlSeconds === 'number' && update.ttlSeconds > 10) {
                  const warnInMs = (update.ttlSeconds - 10) * 1000;
                  const seat = update.seatNumber;
                  if (holdExpiryTimersRef.current[seat]) {
                    clearTimeout(holdExpiryTimersRef.current[seat]);
                  }
                  holdExpiryTimersRef.current[seat] = setTimeout(() => {
                    addToast(`Hold for ${seat} is about to expire`, 'warning');
                  }, warnInMs);
                  setHoldExpiryBySeat((prev) => ({ ...prev, [seat]: Date.now() + update.ttlSeconds * 1000 }));
                }
                break;
              case 'seat-released':
                newStatus.heldSeats = newStatus.heldSeats.filter(seat => seat !== update.seatNumber);
                setHeldByUser((prev) => { const c = { ...prev }; delete c[update.seatNumber]; return c; });
                if (holdExpiryTimersRef.current[update.seatNumber]) {
                  clearTimeout(holdExpiryTimersRef.current[update.seatNumber]);
                  delete holdExpiryTimersRef.current[update.seatNumber];
                }
                setHoldExpiryBySeat((prev) => {
                  const copy = { ...prev };
                  delete copy[update.seatNumber];
                  return copy;
                });
                addToast(`Seat ${update.seatNumber} released`, 'info');
                break;
              case 'seat-sold':
                newStatus.soldSeats = [...newStatus.soldSeats, update.seatNumber];
                newStatus.heldSeats = newStatus.heldSeats.filter(seat => seat !== update.seatNumber);
                setSelectedSeats((prev) => prev.filter((s) => s !== update.seatNumber));
                setHeldByUser((prev) => { const c = { ...prev }; delete c[update.seatNumber]; return c; });
                if (holdExpiryTimersRef.current[update.seatNumber]) {
                  clearTimeout(holdExpiryTimersRef.current[update.seatNumber]);
                  delete holdExpiryTimersRef.current[update.seatNumber];
                }
                setHoldExpiryBySeat((prev) => {
                  const copy = { ...prev };
                  delete copy[update.seatNumber];
                  return copy;
                });
                // Avoid duplicate success toasts for our own purchase; UI already shows invoice toasts
                if (update.userId !== Number(userId)) {
                  addToast(`Seat ${update.seatNumber} purchased successfully`, 'success');
                }
                break;
              default:
                console.log('Unknown update type:', update.type);
            }
            
            return newStatus;
          });
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    websocket.onclose = () => {
      console.log('WebSocket disconnected');
      setWs(null);
    };

    return () => {
      websocket.close();
    };
  }, [id]);

  useEffect(() => {
    // derive myHeldSeats from heldByUser + userId, ensures switching user updates the timer visibility
    const next = Object.entries(heldByUser)
      .filter(([, uid]) => Number(uid) === Number(userId))
      .map(([seat]) => seat);
    setMyHeldSeats(next);
  }, [heldByUser, userId]);

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading trip details...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ color: 'red', marginBottom: '20px' }}>Error: {error}</div>
        <Link to="/" style={{ color: '#007bff', textDecoration: 'none' }}>
          ← Back to trips
        </Link>
      </div>
    );
  }

  if (!trip) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ color: 'red', marginBottom: '20px' }}>Trip not found</div>
        <Link to="/" style={{ color: '#007bff', textDecoration: 'none' }}>
          ← Back to trips
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Floating user selector for multi-user simulation */}
      <div style={{ position: 'fixed', top: 70, right: 16, zIndex: 10, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.2)', padding: '8px 10px', borderRadius: 10, color: '#f8f9fa', backdropFilter: 'saturate(140%) blur(1.5px)' }}>
        <span style={{ fontSize: 12, opacity: 0.9 }}>User ID</span>
        <input
          type="number"
          min="1"
          value={userId}
          onChange={(e) => setUserId(Number(e.target.value))}
          style={{ width: 80, padding: '6px 8px', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 6, background: 'rgba(0,0,0,0.25)', color: '#fff' }}
        />
      </div>
      <div style={{ marginBottom: '20px' }}>
        <Link to="/" style={{ color: '#f8f9fa', textDecoration: 'none', marginBottom: '20px', display: 'inline-block', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
          ← Back to trips
        </Link>
        <h1 style={{ marginBottom: 6, color: '#f8f9fa', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>{trip.routeDetails}</h1>
        <div style={{ color: '#e9ecef', marginBottom: 12 }}>
          {/* naive parse: assume "Source -> Destination" in routeDetails */}
          {(() => {
            const parts = String(trip.routeDetails || '').split('->');
            const from = parts[0]?.trim();
            const to = parts[1]?.trim();
            if (!from || !to) return null;
            return <span><strong>{from}</strong> → <strong>{to}</strong></span>;
          })()}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '20px', color: '#f8f9fa', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
          <div>
            <h3>Trip Details</h3>
            <p><strong>Bus Type:</strong> {trip.busType}</p>
            <p><strong>Departure:</strong> {new Date(trip.departureTime).toLocaleString()}</p>
            <p><strong>Arrival:</strong> {new Date(trip.arrivalTime).toLocaleString()}</p>
            <p><strong>Price per seat:</strong> ${trip.pricePerSeat}</p>
            <p><strong>Sale duration:</strong> {trip.saleDuration} minutes</p>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.2)', padding: 12, borderRadius: 10 }}>
            <h3>Seat Status</h3>
            <p><strong>Available:</strong> {trip.layout.rows * trip.layout.seatsPerRow - seatStatus.soldSeats.length - seatStatus.heldSeats.length}</p>
            <p><strong>Held:</strong> {seatStatus.heldSeats.length}</p>
            <p><strong>Sold:</strong> {seatStatus.soldSeats.length}</p>
            {seatStatus.heldSeats.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <strong>Held Seats:</strong>
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {seatStatus.heldSeats.map((s) => (
                    <span key={s} style={{ background: 'rgba(253,126,20,0.25)', border: '1px solid rgba(253,126,20,0.6)', color: '#ffd8a8', padding: '4px 8px', borderRadius: 999 }}>{s}</span>
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginTop: '10px', fontSize: '14px', color: '#ced4da' }}>
              {ws ? '🟢 WebSocket Connected' : '🔴 WebSocket Disconnected'}
            </div>
          </div>
        </div>
      </div>
      {message && (
        <div style={{ marginBottom: '12px', color: message.type === 'error' ? '#dc3545' : '#198754' }}>
          {message.text}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap', color: '#f8f9fa' }}>

        <button
          onClick={async () => {
            try {
              if (selectedSeats.length === 0) {
                setMessage({ type: 'error', text: 'Please select at least one available seat.' });
                return;
              }
              // Example static userId; in real app, use logged-in user
              const payload = {
                tripId: parseInt(id),
                userId: Number(userId),
                seatNumbers: selectedSeats,
                ttlSeconds: 120,
              };
              const res = await axios.post('/seats/hold', payload);
              const { held = [], conflicts = [] } = res.data || {};
              if (held.length > 0) {
                setMessage({ type: 'success', text: `Held: ${held.join(', ')}${conflicts.length ? `; Conflicts: ${conflicts.join(', ')}` : ''}` });
                // Selection will be cleared by WS updates; also clear here to be safe
                setSelectedSeats((prev) => prev.filter((s) => !held.includes(s)));
              } else {
                const conflictText = conflicts.map((c) => typeof c === 'string' ? c : `${c.seatNumber} (${c.reason})`).join(', ');
                setMessage({ type: 'error', text: `No seats held. Conflicts: ${conflictText || 'unknown'}` });
              }
            } catch (err) {
              const msg = err?.response?.data?.error || 'Failed to hold seats';
              setMessage({ type: 'error', text: msg });
            }
          }}
          style={{ padding: '8px 14px', background: '#0d6efd', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', boxShadow: '0 6px 12px rgba(13,110,253,0.35)' }}
        >
          Hold Seats
        </button>

        <button
          onClick={async () => {
            try {
              if (myHeldSeats.length === 0) {
                setMessage({ type: 'error', text: 'You have no held seats to purchase.' });
                return;
              }
              if (!email) {
                setMessage({ type: 'error', text: 'Please enter an email to receive your tickets.' });
                return;
              }
              const payload = {
                tripId: parseInt(id),
                userId: Number(userId),
                seatNumbers: myHeldSeats,
                email,
              };
              const res = await axios.post('/seats/purchase', payload);
              const purchased = res.data?.purchased || [];
              if (purchased.length > 0) {
                const seats = purchased.map((p) => p.seatNumber);
                setMessage({ type: 'success', text: `Purchased: ${seats.join(', ')}` });
                addToast(`Purchased: ${seats.join(', ')}`,'success');
                setMyHeldSeats((prev) => prev.filter((s) => !seats.includes(s)));
                // Show invoice buttons inline
                setToasts((prev) => [
                  ...prev,
                  ...purchased.map((p) => ({
                    id: `inv-${p.seatNumber}-${Date.now()}`,
                    text: `Invoice for ${p.seatNumber}`,
                    variant: 'success',
                    link: `${window.location.origin}${p.invoiceLink}`,
                  })),
                ]);
              } else {
                setMessage({ type: 'error', text: 'No seats purchased.' });
              }
            } catch (err) {
              const msg = err?.response?.data?.error || 'Failed to complete purchase';
              const invalid = err?.response?.data?.invalid;
              setMessage({ type: 'error', text: invalid?.length ? `${msg}: ${invalid.join(', ')}` : msg });
            }
          }}
          style={{ padding: '8px 14px', background: '#198754', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', boxShadow: '0 6px 12px rgba(25,135,84,0.35)' }}
        >
          Purchase Held Seats
        </button>

        <div style={{ color: '#6c757d' }}>
          Selected: {selectedSeats.length ? selectedSeats.join(', ') : 'None'}
        </div>

        <div style={{ color: '#f8f9fa' }}>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: '8px', border: '1px solid rgba(255,255,255,0.35)', borderRadius: '6px', background: 'rgba(0,0,0,0.25)', color: '#fff' }}
          />
        </div>
      </div>

      <SeatMap
        layout={trip.layout}
        seatStatus={seatStatus}
        selectable
        selectedSeats={selectedSeats}
        holdExpiryBySeat={holdExpiryBySeat}
        myHeldSeats={myHeldSeats}
        onToggleSelect={(seat) => {
          setSelectedSeats((prev) => (
            prev.includes(seat) ? prev.filter((s) => s !== seat) : [...prev, seat]
          ));
        }}
      />

      {/* Toast container */}
      <div style={{ position: 'fixed', right: 16, bottom: 16, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 9999 }}>
        {toasts.map((t) => (
          <div key={t.id} style={{
            minWidth: 240,
            maxWidth: 380,
            padding: '10px 12px',
            borderRadius: 8,
            color: '#fff',
            boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
            background: t.variant === 'success' ? '#198754' : t.variant === 'warning' ? '#fd7e14' : '#0d6efd',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <span>{t.text}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {t.link && (
                <button onClick={() => { window.open(t.link, '_blank'); removeToast(t.id); }} style={{
                  padding: '6px 10px', background: 'rgba(0,0,0,0.2)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer'
                }}>
                  View Invoice
                </button>
              )}
              <button aria-label="Close" onClick={() => removeToast(t.id)} style={{
                padding: '6px', background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 16
              }}>×</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TripPage;
