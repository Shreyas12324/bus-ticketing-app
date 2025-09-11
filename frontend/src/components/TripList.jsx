import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const TripList = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Move search state above early returns to keep hooks order stable
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('userId') || '';
    setUserId(stored);
  }, []);

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const response = await axios.get('http://localhost:3000/trips');
        setTrips(response.data);
      } catch (err) {
        setError('Failed to fetch trips');
        console.error('Error fetching trips:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrips();
  }, []);

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading trips...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;
  }

  const filteredTrips = trips.filter((t) => {
    const rd = String(t.routeDetails || '');
    const matchSource = source ? rd.toLowerCase().includes(source.toLowerCase()) : true;
    const matchDest = destination ? rd.toLowerCase().includes(destination.toLowerCase()) : true;
    const matchDate = date ? new Date(t.departureTime).toISOString().slice(0,10) === date : true;
    return matchSource && matchDest && matchDate;
  });

  const handleSearch = async () => {
    setHasSearched(true);
    if (!userId) {
      alert('Please enter a User ID before booking.');
      return;
    }
    localStorage.setItem('userId', String(userId));
    if (!source || !destination || !date) return;
    if (filteredTrips.length > 0) {
      navigate(`/trip/${filteredTrips[0].id}`);
      return;
    }
    // Auto-create a trip with sensible defaults, then navigate
    try {
      const departureTime = new Date(date + 'T10:00:00.000Z').toISOString();
      const arrivalTime = new Date(date + 'T14:00:00.000Z').toISOString();
      const payload = {
        routeDetails: `${source} -> ${destination}`,
        departureTime,
        arrivalTime,
        busType: 'AC Sleeper',
        layout: { rows: 8, seatsPerRow: 4, seats: true },
        pricePerSeat: 25.5,
        saleDuration: 120,
      };
      const res = await axios.post('http://localhost:3000/trips', payload);
      navigate(`/trip/${res.data.id}`);
    } catch (e) {
      console.error('Auto-create trip failed', e);
      alert('No trips found and failed to create a new one. Please try again.');
    }
  };

  return (
    <div style={{ padding: '32px 20px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ background: 'rgba(255,255,255,0.9)', padding: '22px', borderRadius: 14, boxShadow: '0 10px 28px rgba(0,0,0,0.12)', backdropFilter: 'saturate(160%) blur(2px)' }}>
        <h1 style={{ marginTop: 0, marginBottom: 12, color: '#212529' }}>Find Bus Tickets</h1>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr 0.8fr auto', gap: 12, alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', color: '#6c757d', marginBottom: 6 }}>User ID</label>
            <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="e.g. 123" style={{ width: '100%', padding: '12px', border: '1px solid #ced4da', borderRadius: 10, background: '#fff' }} />
          </div>
          <div>
            <label style={{ display: 'block', color: '#6c757d', marginBottom: 6 }}>Source</label>
            <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="From" style={{ width: '100%', padding: '12px', border: '1px solid #ced4da', borderRadius: 10, background: '#fff' }} />
          </div>
          <div>
            <label style={{ display: 'block', color: '#6c757d', marginBottom: 6 }}>Destination</label>
            <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="To" style={{ width: '100%', padding: '12px', border: '1px solid #ced4da', borderRadius: 10, background: '#fff' }} />
          </div>
          <div>
            <label style={{ display: 'block', color: '#6c757d', marginBottom: 6 }}>Date of Journey</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: '100%', padding: '12px', border: '1px solid #ced4da', borderRadius: 10, background: '#fff' }} />
          </div>
          <button
            onClick={handleSearch}
            style={{ padding: '12px 18px', borderRadius: 10, border: 'none', background: '#dc3545', color: '#fff', cursor: 'pointer', height: 46, boxShadow: '0 6px 12px rgba(220,53,69,0.35)' }}
          >
            Book seat
          </button>
        </div>
      </div>

      {hasSearched && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16, marginTop: 24 }}>
          {filteredTrips.map((trip) => (
            <Link
              key={trip.id}
              to={`/trip/${trip.id}`}
              style={{
                textDecoration: 'none',
                color: 'inherit',
                border: '1px solid #dee2e6',
                borderRadius: 12,
                padding: 16,
                backgroundColor: '#fff',
                boxShadow: '0 6px 18px rgba(0,0,0,0.06)'
              }}
            >
              <h3 style={{ margin: '0 0 10px 0', color: '#212529' }}>{trip.routeDetails}</h3>
              <p style={{ margin: '4px 0', color: '#495057' }}><strong>Bus Type:</strong> {trip.busType}</p>
              <p style={{ margin: '4px 0', color: '#495057' }}><strong>Departure:</strong> {new Date(trip.departureTime).toLocaleString()}</p>
              <p style={{ margin: '4px 0', color: '#495057' }}><strong>Arrival:</strong> {new Date(trip.arrivalTime).toLocaleString()}</p>
              <p style={{ margin: '4px 0', color: '#495057' }}><strong>Price per seat:</strong> ${trip.pricePerSeat}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default TripList;
