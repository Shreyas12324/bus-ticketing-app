import React from 'react';
import './SeatMap.css';

const SeatMap = ({ layout, seatStatus = {}, selectable = false, selectedSeats = [], onToggleSelect, holdExpiryBySeat = {}, myHeldSeats = [] }) => {
  const { soldSeats = [], heldSeats = [] } = seatStatus;

  // Local ticking countdown (seconds remaining) per held seat
  const [localHoldSeconds, setLocalHoldSeconds] = React.useState({});

  // Sync incoming expiry -> seconds map
  React.useEffect(() => {
    const next = { ...localHoldSeconds };
    Object.keys(holdExpiryBySeat || {}).forEach((seat) => {
      const ms = holdExpiryBySeat[seat] - Date.now();
      next[seat] = Math.max(0, Math.ceil(ms / 1000));
    });
    // Remove seats no longer in held list
    Object.keys(next).forEach((seat) => {
      if (!heldSeats.includes(seat)) delete next[seat];
    });
    setLocalHoldSeconds(next);
  }, [holdExpiryBySeat, heldSeats]);

  // Ticking interval
  React.useEffect(() => {
    const timer = setInterval(() => {
      setLocalHoldSeconds((prev) => {
        const updated = {};
        Object.entries(prev).forEach(([seat, secs]) => {
          const next = Math.max(0, (secs || 0) - 1);
          if (next > 0) updated[seat] = next;
          // if 0, omit so UI turns green/clickable; WS will also release soon
        });
        return updated;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getSeatStatus = (seatNumber) => {
    if (soldSeats.includes(seatNumber)) return 'sold';
    // Treat any seat in heldSeats as held; timer is only for UI countdown.
    if (heldSeats.includes(seatNumber)) return 'held';
    return 'available';
  };

  const getSeatStyle = (status, isSelected) => {
    const baseStyle = {
      width: '40px',
      height: '40px',
      margin: '4px',
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: selectable && status === 'available' ? 'pointer' : 'not-allowed',
      fontSize: '12px',
      fontWeight: 'bold',
      transition: 'all 0.2s ease',
    };

    if (isSelected) {
      return { ...baseStyle, backgroundColor: '#0d6efd', color: 'white' };
    }

    switch (status) {
      case 'sold':
        return { ...baseStyle, backgroundColor: '#dc3545', color: 'white' };
      case 'held':
        return { ...baseStyle, backgroundColor: '#fd7e14', color: 'white' };
      case 'available':
        return { ...baseStyle, backgroundColor: '#28a745', color: 'white' };
      default:
        return { ...baseStyle, backgroundColor: '#6c757d', color: 'white' };
    }
  };

  const renderSeat = (seatNumber) => {
    const status = getSeatStatus(seatNumber);
    const isSelected = selectedSeats.includes(seatNumber);
    const secondsLeft = localHoldSeconds[seatNumber] ?? null;
    // Build CSS classes for consistent borders by state
    const classNames = ['seat'];
    if (status === 'sold') classNames.push('seat-sold');
    else if (status === 'held') {
      classNames.push('seat-held');
      if (myHeldSeats.includes(seatNumber)) classNames.push('seat-mine');
    }
    else classNames.push('seat-available');
    if (isSelected) classNames.push('seat-selected');

    return (
      <div
        key={seatNumber}
        className={classNames.join(' ')}
        style={getSeatStyle(status, isSelected)}
        title={`Seat ${seatNumber} - ${status}`}
        onClick={() => {
          if (!selectable || status !== 'available') return;
          if (onToggleSelect) onToggleSelect(seatNumber);
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
          <span>{seatNumber}</span>
          {status === 'held' && secondsLeft !== null && myHeldSeats.includes(seatNumber) && (
            <span style={{ fontSize: 10 }}>{secondsLeft}s</span>
          )}
        </div>
      </div>
    );
  };

  if (!layout || !layout.seats) {
    return <div>No seat layout available</div>;
  }

  const { rows, seatsPerRow } = layout;

  return (
    <div style={{
      padding: '16px',
      background: 'rgba(0,0,0,0.28)',
      borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.15)',
      backdropFilter: 'saturate(140%) blur(1.5px)',
    }}>
      <h3 style={{ marginTop: 0, color: '#f8f9fa', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>Seat Map</h3>
      <div style={{ marginBottom: '16px', color: '#e9ecef' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
          <div style={getSeatStyle('available')}></div>
          <span style={{ marginLeft: '10px' }}>Available</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
          <div style={getSeatStyle('held')}></div>
          <span style={{ marginLeft: '10px' }}>Held</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
          <div style={getSeatStyle('sold')}></div>
          <span style={{ marginLeft: '10px' }}>Sold</span>
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div key={rowIndex} style={{ display: 'flex', marginBottom: '8px' }}>
            {Array.from({ length: seatsPerRow }, (_, seatIndex) => {
              const seatNumber = `${String.fromCharCode(65 + rowIndex)}${seatIndex + 1}`;
              return renderSeat(seatNumber);
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SeatMap;
