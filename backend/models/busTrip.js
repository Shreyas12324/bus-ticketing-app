const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
	const BusTrip = sequelize.define('BusTrip', {
		routeDetails: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		departureTime: {
			type: DataTypes.DATE,
			allowNull: false,
		},
		arrivalTime: {
			type: DataTypes.DATE,
			allowNull: false,
		},
		busType: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		layout: {
			type: DataTypes.JSON,
			allowNull: false,
		},
		pricePerSeat: {
			type: DataTypes.FLOAT,
			allowNull: false,
			validate: {
				min: 0,
			},
		},
		saleDuration: {
			type: DataTypes.INTEGER,
			allowNull: false,
			validate: {
				min: 0,
			},
		},
	}, {
		tableName: 'bus_trips',
		underscored: true,
	});

	return BusTrip;
};


