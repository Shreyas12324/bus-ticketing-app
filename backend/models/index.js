const { sequelize } = require('../db');

// Import model definers
const defineBusTrip = require('./busTrip');
const defineSeatHold = require('./seatHold');
const definePurchase = require('./purchase');
const defineUser = require('./user');

// Initialize models
const BusTrip = defineBusTrip(sequelize);
const SeatHold = defineSeatHold(sequelize);
const Purchase = definePurchase(sequelize);
const User = defineUser(sequelize);

// Define associations (if/when needed)
// Example (commented to avoid enforcing FKs before routes are ready):
// SeatHold.belongsTo(BusTrip, { foreignKey: 'tripId' });
// Purchase.belongsTo(BusTrip, { foreignKey: 'tripId' });
// SeatHold.belongsTo(User, { foreignKey: 'userId' });
// Purchase.belongsTo(User, { foreignKey: 'userId' });

const models = {
	BusTrip,
	SeatHold,
	Purchase,
	User,
};

module.exports = {
	sequelize,
	models,
};


