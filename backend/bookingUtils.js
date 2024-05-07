const { Event, Room, User, sequelize } = require('./sync');
const { Op } = require('sequelize'); // Import Op directly from sequelize

async function isRoomAvailable(roomName, date, startTime, endTime, excludeEventId = null) {
    try {
        const room = await Room.findOne({ where: { room_name: roomName } });
        if (!room) {
            throw new Error("Room not found");
        }
        const rid = room.rid;

        const queryOptions = {
            where: {
                rid: rid,
                date: date,
                [Op.or]: [
                    { starttime: { [Op.lt]: endTime, [Op.gt]: startTime } },
                    { [Op.and]: [{ starttime: { [Op.lte]: startTime } }, { endtime: { [Op.gte]: endTime } }] },
                    { endtime: { [Op.gt]: startTime, [Op.lt]: endTime } }
                ]
            }
        };

        // Exclude the current event ID for update
        if (excludeEventId) {
            queryOptions.where.eid = { [Op.ne]: excludeEventId };
        }

        const overlappingEvents = await Event.findAll(queryOptions);

        return overlappingEvents.length === 0; // Returns true if no overlapping events found
    } catch (error) {
        console.error("Error checking room availability:", error);
        throw error; // Rethrow or handle as needed
    }
}



module.exports = {
    isRoomAvailable,
    getRoomIdByName: async (roomName) => {
        const room = await Room.findOne({ where: { room_name: roomName } });
        if (!room) throw new Error("Room not found");
        return room.rid;
    },
    getUserIdByUsername: async (username) => {
        const user = await User.findOne({ where: { user_name: username } });
        if (!user) throw new Error("User not found");
        return user.uid;
    }
};
