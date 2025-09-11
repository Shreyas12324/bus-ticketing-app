const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
	const User = sequelize.define('User', {
		name: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		email: {
			type: DataTypes.STRING,
			allowNull: false,
			unique: true,
			validate: {
				isEmail: true,
			},
		},
		role: {
			type: DataTypes.ENUM('organizer', 'passenger'),
			allowNull: false,
			defaultValue: 'passenger',
		},
	}, {
		tableName: 'users',
		underscored: true,
	});

	return User;
};


