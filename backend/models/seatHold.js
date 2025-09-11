const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
	const SeatHold = sequelize.define('SeatHold', {
		tripId: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
		seatNumber: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		userId: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
		expiresAt: {
			type: DataTypes.DATE,
			allowNull: false,
		},
	}, {
		tableName: 'seat_holds',
		underscored: true,
		indexes: [
			{
				unique: true,
				fields: ['trip_id', 'seat_number'],
			},
			{
				fields: ['expires_at'],
			},
		],
	});

	return SeatHold;
};


