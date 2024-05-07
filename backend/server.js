const express = require('express');
const { Sequelize, Op } = require('sequelize');
const cors = require('cors');
const { User, Room, Event, Feature, RoomFeatures } = require('./sync');
const { isRoomAvailable, getRoomIdByName, getUserIdByUsername } = require('./bookingUtils');

// PostgreSQL connection setup using Sequelize
const sequelize = new Sequelize('cooperbookerdb', 'postgres', 'antfarm', {
  host: '34.86.116.48',
  dialect: 'postgres',
  logging: console.log
});

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/buildings', async (req, res) => {
  try {
    const buildings = await Room.findAll({
      attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('building')), 'building']],
    });
    res.send(buildings.map(b => b.building));
  } catch (error) {
    console.error('Failed to fetch buildings:', error);
    res.status(500).send('Internal server error');
  }
});

// Define an endpoint to get rooms
app.get('/api/rooms', async (req, res) => {
  const { building, floor, capacity } = req.query;
  let filter = {};
  if (building) filter.building = building;
  if (floor) filter.floor = floor;
  if (capacity) filter.max_capacity = { [Op.gte]: parseInt(capacity, 10) };

  try {
    const rooms = await Room.findAll({ where: filter });
    res.send(rooms);
  } catch (error) {
    console.error('Failed to fetch rooms:', error);
    res.status(500).send('Internal server error');
  }
});

// POST Endpoint for login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ where: { user_name: username } });
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" }); // Generic error for security
    }

    // Directly compare the plain text passwords
    if (user.password !== password) {
      return res.status(401).json({ message: "Invalid username or password" }); // Generic error for security
    }

    // Authentication successful
    res.json({
      message: "Login successful",
      user: {
        user_name: user.user_name,
        access_type: user.access_type,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});



// Endpoint to fetch a user by user_name
app.get('/api/users/:username', async (req, res) => {
  const username = req.params.username;
  try {
    const user = await User.findOne({ where: { user_name: username } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error('Failed to fetch user:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});


app.get('/api/floors', async (req, res) => {
  const { building } = req.query;
  if (!building) {
    return res.status(400).send('Building parameter is required');
  }

  try {
    const floors = await Room.findAll({
      attributes: [
        [Sequelize.fn('DISTINCT', Sequelize.col('floor')), 'floor']
      ],
      where: { building }
    });

    const floorList = floors.map(f => f.dataValues.floor);
    res.json(floorList);
  } catch (error) {
    console.error('Failed to fetch floors:', error);
    res.status(500).send('Internal server error');
  }
});

app.get('/api/room-details', async (req, res) => {
  const { room_name } = req.query;
  try {
    const roomDetails = await Room.findOne({
      where: { room_name },
      include: [{
        model: Feature,
        as: 'features',
        through: {
          attributes: []
        },
        attributes: ['name']
      }],
      attributes: ['rid', 'room_name', 'formal_name', 'max_capacity', 'building', 'floor']
    });

    if (!roomDetails) {
      return res.status(404).send('Room not found');
    }

    const features = roomDetails.features.map(f => f.name);

    const response = {
      ...roomDetails.dataValues,
      features
    };

    res.json(response);
  } catch (error) {
    console.error('Failed to fetch room details:', error);
    res.status(500).send('Internal server error');
  }
});

app.get('/api/events', async (req, res) => {
  const { startDate, endDate, building, floor, capacity, room_name } = req.query;
  console.log('Querying events from:', startDate, 'to', endDate);
  try {
    const queryOptions = {
      include: [{
        model: Room,
        as: 'room',
        required: true,
        attributes: ['building', 'room_name', 'floor', 'max_capacity'],
        where: {}
      }, {
        model: User,
        as: 'user',
        required: true,
        attributes: ['user_name'],
      }],
      where: {}
    };

    if (building) queryOptions.include[0].where.building = building;
    if (room_name) queryOptions.include[0].where.room_name = room_name;
    if (floor) queryOptions.include[0].where.floor = floor;
    if (capacity) queryOptions.include[0].where.max_capacity = { [Op.gte]: capacity };

    if (startDate && endDate) {
      // Parse startDate and endDate as UTC
      const startUtc = new Date(`${startDate}T00:00:00`); // Assuming dates are in YYYY-MM-DD format
      const endUtc = new Date(`${endDate}T23:59:59`); // Use end of day for end date

      queryOptions.where.date = {
        [Op.between]: [startUtc, endUtc]
      };
    }

    const events = await Event.findAll(queryOptions);

    res.json(events.map(event => {
      const startDateTime = new Date(event.date + 'T' + event.starttime);
      const endDateTime = new Date(event.date + 'T' + event.endtime);

      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        console.error('Invalid date created:', event.date + 'T' + event.starttime);
        return {
          ...event.get({ plain: true }),
          start: null,
          end: null,
          title: event.event_name
        };
      }

      return {
        ...event.get({ plain: true }),
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
        title: event.event_name,
        room_name: event.room.room_name, // Accessing room name from joined Room model
        user_name: event.user.user_name
      };
    }));
  } catch (error) {
    console.error('Failed to fetch events:', error);
    res.status(500).json({ error: 'Failed to fetch events', details: error.message });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const newEvent = await Event.create({
      ...req.body,
      rid: req.body.roomId,
      uid: req.body.userId
    });

    const eventWithDetails = await Event.findByPk(newEvent.id, {
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['building', 'room_name', 'floor', 'max_capacity']
        },
        {
          model: User,
          as: 'user',
          attributes: ['user_name']
        }
      ]
    });

    res.status(201).json(eventWithDetails);
  } catch (error) {
    console.error('Failed to create event:', error);
    res.status(400).json({ message: 'Error creating event', error: error.message });
  }
});


app.get('/api/events/upcoming/:username', async (req, res) => {
  const { username } = req.params;
  const today = new Date();
  const startOfToday = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const endDate = new Date(today.setHours(23, 59, 59, 999)).toISOString();

  try {
    const events = await Event.findAll({
      include: [{
        model: Room,
        as: 'room',
        attributes: ['room_name']
      }, {
        model: User,
        as: 'user',
        attributes: ['user_name'],
        where: {
          user_name: username
        }
      }],
      where: {
        date: {
          [Op.gte]: startOfToday // Fetch events starting from today onward
        }
      },
      order: [['date', 'ASC'], ['starttime', 'ASC']] //Order by date and start time
    });

    res.json(events.map(event => ({
      ...event.get({ plain: true }),
      eid: event.eid,
      event_name: event.event_name,
      date: event.date,
      start_time: new Date(event.date + 'T' + event.starttime).toISOString(),
      end_time: new Date(event.date + 'T' + event.endtime).toISOString(),
      room_name: event.room.room_name, // Accessing room name from joined Room model
      user_name: event.user.user_name
    })));
  } catch (error) {
    console.error('Failed to fetch today\'s events for user:', username, error);
    res.status(500).send('Internal server error');
  }
});

// POST endpoint to book a room
app.post('/api/book-room', async (req, res) => {
  const { roomName, date, startTime, endTime, eventName, uid } = req.body;
  console.log(req.body);
  try {
    // Check if the room is available using bookingUtils.js
    const available = await isRoomAvailable(roomName, date, startTime, endTime);

    if (!available) {
      return res.status(400).send({ message: "Room is already booked for the given time slot." });
    }

    // Get room ID from room name
    const roomId = await getRoomIdByName(roomName);
    if (!roomId) {
      return res.status(404).send({ message: "Room not found." });
    }

    // If available, create a new event using the uid and room ID
    const newEvent = await Event.create({
      rid: roomId,
      uid: uid,
      date,
      starttime: startTime,
      event_name: eventName,
      endtime: endTime
    });

    res.send({
      message: "Room booked successfully!",
      event: newEvent
    });
  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).send('Failed to book room');
  }
});

app.post('/api/events/update/:eventId', async (req, res) => {
  const { eventId } = req.params;
  const { event_name, room_name, date, starttime, endtime } = req.body;

  try {
    const isAvailable = await isRoomAvailable(room_name, date, starttime, endtime, eventId);
    console.log(`Checking availability for room: ${room_name}, date: ${date}, starttime: ${starttime}, endtime: ${endtime}`);

    if (!isAvailable) {
      return res.status(409).json({ message: "Room is already booked for the specified time range." });
    }

    const rid = await getRoomIdByName(room_name);

    const updatedEvent = await Event.update({
      event_name,
      rid,
      date,
      starttime,
      endtime
    }, {
      where: { eid: eventId }
    });

    res.json({ message: "Event updated successfully", event: updatedEvent });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});


app.delete('/api/events/delete/:eventId', async (req, res) => {
  const { eventId } = req.params;

  try {
    const result = await Event.destroy({
      where: { eid: eventId }
    });

    if (result > 0) {
      res.status(200).send('Event deleted successfully');
    } else {
      res.status(404).send('Event not found');
    }
  } catch (error) {
    console.error('Failed to delete event:', error);
    res.status(500).send('Internal server error');
  }
});

app.get('/api/available-rooms-for-event', async (req, res) => {
  const { date, startTime, endTime, building, capacity } = req.query;

  try {
    const rooms = await Room.findAll({
      where: {
        ...(building && { building }),
        ...(capacity && { max_capacity: { [Op.gte]: parseInt(capacity, 10) } })
      },
      include: [{
        model: Event,
        required: false,
        where: {
          date: date,
          [Op.or]: [
            { starttime: { [Op.lt]: endTime, [Op.gte]: startTime } },
            { endtime: { [Op.gt]: startTime, [Op.lte]: endTime } }
          ]
        },
        attributes: []
      }],
      group: ['room.rid'],
      having: Sequelize.literal(`COUNT("events"."eid") = 0`)  // Corrected to use double quotes
    });
    rooms.sort((a, b) => a.room_name.localeCompare(b.room_name));
    res.json(rooms.map(room => room.toJSON()));
  } catch (error) {
    console.error('Failed to fetch available rooms:', error);
    res.status(500).send('Internal server error');
  }
});




// Listen on a port
const port = process.env.PORT || 3001;

// Synchronize models with the database
sequelize.sync()
  .then(() => {
    console.log('Database & tables synced!');
    // Start listening only after the models are synced
    app.listen(port, () => console.log(`Listening on port ${port}...`));
  })
  .catch(error => {
    console.error('Failed to sync database & tables:', error);
  });
