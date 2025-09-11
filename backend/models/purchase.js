const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
	const Purchase = sequelize.define('Purchase', {
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
		purchaseTime: {
			type: DataTypes.DATE,
			allowNull: false,
			defaultValue: DataTypes.NOW,
		},
		invoiceLink: {
			type: DataTypes.STRING,
			allowNull: false,
		},
	}, {
		tableName: 'purchases',
		underscored: true,
		indexes: [
			{
				fields: ['trip_id', 'seat_number'],
			},
			{
				fields: ['user_id', 'purchase_time'],
			},
		],
	});

	return Purchase;
};


