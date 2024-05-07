const Sequelize = require('sequelize');

const sequelize = new Sequelize('cooperbookerdb', 'postgres', 'antfarm', {
    host: '34.86.116.48',
    dialect: 'postgres',
    logging: console.log
});

const User = sequelize.define('user', {
    uid: { type: Sequelize.STRING, primaryKey: true },
    user_name: { type: Sequelize.STRING, allowNull: false },
    password: { type: Sequelize.STRING, allowNull: false },
    access_type: { type: Sequelize.ENUM('student', 'faculty', 'staff', 'administrator'), allowNull: false },
    email: { type: Sequelize.STRING, unique: true, allowNull: false }
});


const Room = sequelize.define('room', {
    rid: { type: Sequelize.STRING, primaryKey: true },
    room_name: { type: Sequelize.STRING, allowNull: false, unique: true },
    formal_name: { type: Sequelize.STRING, allowNull: true },
    max_capacity: { type: Sequelize.INTEGER, allowNull: true },
    building: { type: Sequelize.ENUM('Foundation', '41CS'), allowNull: false },
    floor: { type: Sequelize.STRING, allowNull: false }
});

const Feature = sequelize.define('feature', {
    fid: { type: Sequelize.STRING, primaryKey: true },
    name: { type: Sequelize.STRING, allowNull: false, unique: 'uniqueName' } // Ensuring name is unique
});


const Event = sequelize.define('event', {
    eid: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4  // Automatically generate UUIDs
    },
    event_name: { type: Sequelize.STRING, allowNull: false },
    date: { type: Sequelize.DATEONLY, allowNull: false },
    starttime: { type: Sequelize.TIME, allowNull: false },
    endtime: { type: Sequelize.TIME, allowNull: false },
    profile_name: { type: Sequelize.STRING, allowNull: true },
    rid: { type: Sequelize.STRING, allowNull: false, references: { model: 'rooms', key: 'rid' } },
    uid: { type: Sequelize.STRING, allowNull: false, references: { model: 'users', key: 'uid' } }
});

const RoomFeatures = sequelize.define('roomFeatures', {
    roomRid: {
        type: Sequelize.STRING,
        references: { model: 'room', key: 'rid' }
    },
    featureFid: {
        type: Sequelize.STRING,
        references: { model: 'feature', key: 'fid' }
    }
});


// Relationships
Room.belongsToMany(Feature, { through: RoomFeatures });
Feature.belongsToMany(Room, { through: RoomFeatures });

Room.hasMany(Event, { foreignKey: 'rid' }); // Changed from 'roomId' to 'rid'
User.hasMany(Event, { foreignKey: 'uid' }); // Changed from 'userId' to 'uid'
Event.belongsTo(Room, { foreignKey: 'rid', as: 'room' });
Event.belongsTo(User, { foreignKey: 'uid', as: 'user' });

// Correctly exporting all defined models and sequelize instance
module.exports = {
    sequelize,
    User,
    Room,
    Event,
    Feature,
    RoomFeatures
};
