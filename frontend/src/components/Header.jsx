import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header = () => {
	const location = useLocation();
	return (
		<header style={{
			position: 'sticky', top: 0, zIndex: 1000,
			background: '#ffffffcc', backdropFilter: 'saturate(180%) blur(6px)',
			borderBottom: '1px solid #e9ecef',
		}}>
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1200, margin: '0 auto', padding: '10px 16px' }}>
				<Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
					<img src="/logo.png" alt="Logo" style={{ height: 32 }} />
					<span style={{ fontWeight: 700, color: '#0d6efd' }}>Bus Ticketing</span>
				</Link>

				<nav style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
					<Link to="/" style={{ color: location.pathname === '/' ? '#0d6efd' : '#495057', textDecoration: 'none' }}>Home</Link>
				</nav>
			</div>
		</header>
	);
};

export default Header;


