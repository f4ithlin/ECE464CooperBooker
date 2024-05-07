import React, { useState, useEffect } from 'react';
import { Container, Grid, Box, FormControl, InputLabel, Select, MenuItem, Button, Typography, List, ListItem, ListItemText, Slider, TextField, Modal } from '@mui/material';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, endOfWeek } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { NavigateBefore, NavigateNext } from '@mui/icons-material';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './Bookings.css';
import CreateEventModal from './CreateEventModal';


// Setup for React Big Calendar
const locales = {
  'en-US': enUS,
};
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const getCurrentDateString = () => {
  const today = new Date();
  const utcDate = today.toISOString().slice(0, 10); // Formats it as "YYYY-MM-DD" in UTC
  return utcDate;

};

const CustomToolbar = ({ localizer, label, onView, onNavigate, view, views }) => {
  const [currentView, setCurrentView] = useState(view);

  useEffect(() => {
    setCurrentView(view);
  }, [view]);

  const navigate = (action) => {
    onNavigate(action);
  };

  const viewNamesGroup = views.map(name => (
    <Button
      key={name}
      onClick={() => onView(name)}
      color={currentView === name ? "primary" : "inherit"}
    >
      {name.charAt(0).toUpperCase() + name.slice(1)}
    </Button>
  ));

  const today = new Date();

  const isTodayHighlighted = localizer.format(today, 'MMMM yyyy') === label;


  return (
    <div className="rbc-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      {/* "Today" Button */}
      <Button
        onClick={() => navigate('TODAY')}
        className="today-btn"
        style={{
          color: isTodayHighlighted ? "var(--text-blue)" : "inherit",
        }}
      >
        Today
      </Button>

      {/* Navigation Buttons and Label */}
      <div style={{ display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'center', position: 'relative' }}>
        <Button
          onClick={() => navigate('PREV')}
          style={{
            minWidth: 'auto',
            padding: '0',
            boxShadow: 'none',
            background: 'none',
          }}
        >
          <NavigateBefore style={{ fontSize: '24px', color: 'black' }} />
        </Button>

        <div style={{ minWidth: '120px' }}>
          <span className="rbc-toolbar-label" style={{ color: "var(--text-blue)" }}>
            {label}
          </span>
        </div>

        <Button
          onClick={() => navigate('NEXT')}
          style={{
            minWidth: 'auto',
            padding: '0',
            boxShadow: 'none',
            background: 'none',
          }}
        >
          <NavigateNext style={{ fontSize: '24px', color: 'black' }} />
        </Button>
      </div>

      {/* View Selection Buttons */}
      <span style={{ display: 'flex', justifyContent: 'flex-end', flex: 1 }}>
        {views.map((view) => (
          <Button
            key={view}
            onClick={() => onView(view)}
            style={{
              color: currentView === view ? "var(--text-blue)" : "inherit",
              background: 'none',
              boxShadow: 'none',
              textTransform: 'none',
              marginLeft: '5px',
            }}
          >
            {view.charAt(0).toUpperCase() + view.slice(1)}
          </Button>
        ))}
      </span>
    </div>
  );


};

function determineCurrentViewDateRange(currentView, currentDate) {

  let startDate, endDate;

  switch (currentView) {
    case 'day':
      // Directly use currentDate for both start and end when view is 'day'
      startDate = endDate = format(currentDate, 'yyyy-MM-dd');
      break;
    case 'week':
      // Calculate start and end of the week based on currentDate
      startDate = format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      endDate = format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      break;

    default:
      // If no specific view matches, fallback to currentDate or another logic
      startDate = endDate = format(currentDate, 'yyyy-MM-dd');
      break;
  }

  return { startDate, endDate };
}


const Bookings = () => {


  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(format(new Date(), 'HH:mm'));
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedRoomDetails, setSelectedRoomDetails] = useState(null);
  const [selectedCapacity, setSelectedCapacity] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [newEventDetails, setNewEventDetails] = useState({
    event_name: '',
    starttime: '',
    endtime: '',
    date: '',
    room_name: '',
    profile_name: '',
  });
  const [availableRooms, setAvailableRooms] = useState([]);

  const [events, setEvents] = useState([]);



  // New state for controlling the calendar's current view and date
  const [currentView, setCurrentView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [rooms, setRooms] = useState([]);


  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);

  useEffect(() => {
    if (selectedDate) {
      setCurrentDate(new Date(selectedDate)); // Set the current date to the selected date
      setCurrentView('day'); // Switch to "Day" view
    }
  }, [selectedDate]);


  useEffect(() => {
    // Fetch buildings
    const fetchBuildings = async () => {
      const response = await fetch('http://localhost:3001/api/buildings');
      const data = await response.json();
      setBuildings(data);
    };

    // Call fetchBuildings function
    fetchBuildings();
  }, []); // Empty dependency array to run once on mount


  const handleSelectSlot = (slotInfo) => {
    // Function to round time to the nearest 30 minutes
    const roundToNearest30Min = date => {
      const minutes = date.getMinutes();
      const roundedMinutes = minutes < 30 ? 0 : 30;
      return new Date(date.setMinutes(roundedMinutes, 0, 0));
    };

    // Rounding start and end times
    const roundedStart = roundToNearest30Min(slotInfo.start);
    const roundedEnd = roundToNearest30Min(slotInfo.end);

    // Fetching available rooms based on the selected time slot
    fetchAvailableRoomsForNewEvent(roundedStart, roundedEnd);

    // Set modal to open and update event details
    setIsEventModalOpen(true);
    setNewEventDetails(prev => ({
      ...prev,
      starttime: format(roundedStart, 'HH:mm:ss'),
      endtime: format(roundedEnd, 'HH:mm:ss'),
      date: format(roundedStart, 'yyyy-MM-dd'),
    }));
  };

  function sortFloors(floors) {
    return floors.sort((a, b) => {
      // Define custom order
      const order = { 'LL2': 1, 'LL1': 2 };

      // Get order values or assign a high number if not found
      const orderA = order[a] || 999;
      const orderB = order[b] || 999;

      // Compare for sorting
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      // If both floors are neither LL2 nor LL1, sort normally (could use numeric or alphabetic sorting)
      return a.localeCompare(b, undefined, { numeric: true });
    });
  }

  useEffect(() => {
    const fetchFloors = async () => {
      const response = await fetch(`http://localhost:3001/api/floors?building=${selectedBuilding}`);
      const data = await response.json();
      const sortedFloors = sortFloors(data);  // Sort floors after fetching
      setFloors(sortedFloors);
    };

    if (selectedBuilding) {
      fetchFloors();
    }
  }, [selectedBuilding]); // Dependency array includes selectedBuilding to refetch when it changes


  useEffect(() => {
    // This useEffect hook is dedicated to fetching rooms
    // It runs whenever selectedBuilding or selectedFloor changes
    if (selectedBuilding) {
      const fetchRooms = async () => {
        let queryParams = new URLSearchParams();

        if (selectedBuilding) {
          queryParams.append("building", selectedBuilding);
        }
        if (selectedFloor) {
          queryParams.append("floor", selectedFloor);
        }
        if (selectedCapacity > 0) queryParams.append("capacity", selectedCapacity);

        const url = `http://localhost:3001/api/rooms?${queryParams.toString()}`;
        try {
          const response = await fetch(url);
          const data = await response.json();
          setRooms(data); // Update the rooms state with the fetched data
        } catch (error) {
          console.error('Failed to fetch rooms:', error);

        }
      };

      fetchRooms();
    } else {
      setRooms([]);
    }
  }, [selectedBuilding, selectedFloor, selectedCapacity]);

  useEffect(() => {
    const fetchEvents = async () => {
      let queryParams = new URLSearchParams();
      const todayString = getCurrentDateString(); // Use it directly within the URLSearchParams setup


      if (selectedBuilding) {
        queryParams.append("building", selectedBuilding);
      }

      if (selectedFloor) {
        queryParams.append("floor", selectedFloor);
      }

      if (selectedCapacity > 0) {
        queryParams.append("capacity", selectedCapacity);
      }

      if (selectedRoom) {
        queryParams.append("room_name", selectedRoom.room_name);
      }

      // Calculate date range if currentDate is valid; otherwise, fetch events for the current date
      if (currentDate && !isNaN(currentDate.valueOf())) {
        const dateRange = determineCurrentViewDateRange(currentView, currentDate);
        queryParams.append("startDate", dateRange.startDate);
        queryParams.append("endDate", dateRange.endDate);
      } else {
        queryParams.append("date", todayString); // Use the current date if no specific date range is provided
      }

      const response = await fetch(`http://localhost:3001/api/events?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.statusText}`);
      }

      const events = await response.json();

      const adjustedEvents = events.map(event => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end)
      }));

      setEvents(adjustedEvents);
    };

    fetchEvents().catch(console.error);
  }, [selectedBuilding, selectedFloor, selectedRoom, selectedCapacity, currentView, currentDate, selectedDate]);  // Dependency array updated to reflect used states
  // Function to handle slider change
  const handleSliderChange = (event, newValue) => {
    setSelectedCapacity(newValue);
  };

  const formatCapacityLabel = (value) => {
    return `${value}+`;
  };

  // Function to handle blur on input field
  const handleBlur = () => {
    if (selectedCapacity < 0) {
      setSelectedCapacity(0);
    } else if (selectedCapacity > 100) {
      setSelectedCapacity(100);
    }
  };

  useEffect(() => {
    if (selectedRoom) {
      const fetchRoomFeatures = async () => {
        try {
          const response = await fetch(`http://localhost:3001/api/room-details?room_name=${encodeURIComponent(selectedRoom.room_name)}`);
          if (!response.ok) {
            throw new Error('Failed to fetch room details');
          }
          const data = await response.json();
          setSelectedRoomDetails(data); // Set the room details directly from the fetched data
        } catch (error) {
          console.error('Error fetching room features:', error);
        }
      };

      fetchRoomFeatures();

      setNewEventDetails(prevDetails => ({
        ...prevDetails,
        room_name: selectedRoom.room_name,
      }));
    } else {
      setSelectedRoomDetails(null); // Clear details if no room is selected
    }
  }, [selectedRoom]);  // Depend on selectedRoom to trigger fetching details

  useEffect(() => {
    // Inside your fetchRoomFeatures function, after setting the data
    console.log('Updated room details:', selectedRoomDetails);
  }, [selectedRoomDetails]); // Add selectedRoomDetails as a dependency to log it when it updates


  useEffect(() => {
    if (selectedDate) {
      // Assuming selectedDate is in 'YYYY-MM-DD' format
      const [year, month, day] = selectedDate.split('-').map(num => parseInt(num, 10));
      // Assuming selectedTime is in 'HH:MM' format
      const [hours, minutes] = selectedTime.split(':').map(num => parseInt(num, 10));

      // Construct a new Date object using local time to avoid timezone issues
      const dateTime = new Date();
      dateTime.setFullYear(year, month - 1, day); // month is 0-indexed
      dateTime.setHours(hours, minutes, 0, 0); // Reset seconds and milliseconds to 0

      if (!isNaN(dateTime)) {
        setCurrentDate(dateTime);
        setCurrentView('day'); // Change view to 'day' when date/time is picked
      }
    } else {

    }
  }, [selectedDate, selectedTime]);

  // Bookings.js




  const fetchAvailableRoomsForNewEvent = async (startDate, endDate) => {
    const formattedDate = format(startDate, 'yyyy-MM-dd');
    const formattedStartTime = format(startDate, 'HH:mm:ss');
    const formattedEndTime = format(endDate, 'HH:mm:ss');

    // Construct the URL with query parameters
    const url = new URL('http://localhost:3001/api/available-rooms-for-event');
    url.searchParams.append('date', formattedDate);
    url.searchParams.append('startTime', formattedStartTime);
    url.searchParams.append('endTime', formattedEndTime);

    // Optionally add building and capacity if needed
    // url.searchParams.append('building', selectedBuilding);
    // url.searchParams.append('capacity', selectedCapacity);

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch available rooms');
      const availableRooms = await response.json();
      setAvailableRooms(availableRooms); // Update your state or handling logic
    } catch (error) {
      console.error('Error fetching available rooms:', error.message);
    }
  };


  const resetFilters = () => {
    setSelectedBuilding('');
    setSelectedFloor('');
    setSelectedDate(null);
    setSelectedTime(format(new Date(), 'HH:mm')); // Resets to current time
    setSelectedRoom(null);
    setSelectedCapacity(0);
    // Reset any other filter states here
    setCurrentDate(new Date());
    setCurrentView('month'); // or your default view
  };

  const handleEventSelect = (event) => {
    setSelectedEvent(event);
  };

  const handleSave = async (eventDetails) => {

    try {
      const response = await fetch('http://localhost:3001/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventDetails),
      });

      if (response.ok) {
        const newEvent = await response.json();
        setEvents(prevEvents => [...prevEvents, newEvent]);
        setIsEventModalOpen(false); // Close the modal
      } else {
        // Handle server errors
        console.error('Failed to save the event');
      }
    } catch (error) {
      console.error('Error saving the event:', error);
    }
  };


  return (
    <Container maxWidth="lg">
      <Grid container spacing={2}>
        {/* Filters for Building, Floor, and Available Rooms in one column */}
        <Grid item xs={12} md={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button variant="outlined" onClick={resetFilters}
              sx={{
                color: 'var(--text-blue)',
                borderColor: 'var(--text-blue)',
                '&:hover': {
                  backgroundColor: 'rgba(0, 128, 0, 0.04)',
                  borderColor: 'var(--text-blue)',
                },
              }}>Clear Filters</Button>

            <Grid container>
              <TextField
                id="date"
                label="Date"
                type="date"
                value={selectedDate || ""}
                onChange={e => setSelectedDate(e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
                variant="outlined"
                fullWidth
              />
            </Grid>

            <Grid container>
              <TextField
                id="time"
                label="Time"
                type="time"
                value={selectedTime}
                onChange={e => setSelectedTime(e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
                inputProps={{
                  step: 300,
                  'aria-label': 'Select Time', // Accessibility label
                }}
                variant="outlined"
                fullWidth
              />
            </Grid>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Grid container spacing={2}> {/* Container Grid to hold the items */}
                {/* Building Selection */}
                <Grid item xs={6}> {/* xs={6} makes it take up half the available width */}
                  <FormControl fullWidth>
                    <InputLabel>Building</InputLabel>
                    <Select
                      value={selectedBuilding}
                      label="Building"
                      onChange={(e) => setSelectedBuilding(e.target.value)}
                    >
                      {buildings.map((building, index) => (
                        <MenuItem key={index} value={building}>{building}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Floor Selection */}
                <Grid item xs={6}> {/* xs={6} makes it take up the other half of the available width */}
                  <FormControl fullWidth>
                    <InputLabel>Floor</InputLabel>
                    <Select
                      value={selectedFloor}
                      label="Floor"
                      onChange={(e) => setSelectedFloor(e.target.value)}
                    >
                      {floors.map((floor, index) => (
                        <MenuItem key={index} value={floor}>{floor}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>


              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {/* Slider for selecting capacity */}
                <TextField
                  label="Capacity"
                  value={selectedCapacity}
                  onChange={(e) => setSelectedCapacity(Number(e.target.value))}
                  onBlur={handleBlur}
                  type="number"
                  InputProps={{
                    inputProps: {
                      min: 0,
                      max: 100
                    }
                  }}
                  sx={{ width: '100px' }}
                />
                <Slider
                  value={selectedCapacity}
                  onChange={handleSliderChange}
                  aria-labelledby="capacity-slider"
                  valueLabelDisplay="auto"
                  step={1}
                  marks
                  min={0}
                  max={100}
                  getAriaValueText={formatCapacityLabel}
                  valueLabelFormat={formatCapacityLabel}
                  sx={{ flex: 1 }}
                />
              </Box>
              {/* Listing Available Rooms */}
              <Box className="available-rooms-container">
                <Typography className="available-rooms-label">Available Rooms</Typography>
                <Box className="available-rooms-box">
                  <List dense>
                    {rooms.map((room) => (
                      <ListItem button className="room-list-item" key={room.id} onClick={() => setSelectedRoom(room)}>
                        <ListItemText primary={room.room_name}
                          primaryTypographyProps={{ className: 'room-entry-text' }} />
                      </ListItem>
                    ))
                    }
                    {!rooms.length && <Typography className="detail-sentence">
                      No room selected.
                    </Typography>}
                  </List>
                </Box>
                {selectedRoomDetails && (
                  <Box className="room-details-container">
                    <Typography className="room-details-label">Room Details</Typography>
                    <Box className="room-details-box">
                      <Typography className="detail-sentence">
                        <span className="detail-heading">{selectedRoomDetails.formal_name || "No formal name provided"}</span>
                      </Typography>
                      <Typography className="detail-sentence">
                        <span className="detail-heading">Capacity:</span> {selectedRoomDetails.max_capacity || 'N/A'}
                      </Typography>
                      <Typography className="detail-sentence">
                        <span className="detail-heading">Features include:</span> {selectedRoomDetails.features && selectedRoomDetails.features.length > 0 ? selectedRoomDetails.features.join(', ') : 'No features listed.'}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </Grid>
        <Modal
          open={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          aria-labelledby="event-details-title"
          aria-describedby="event-details-description"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div className="event-details-modal">
            {selectedEvent && (
              <>
                <Typography id="event-details-title" variant="h6" component="h2" className="event-details-title">
                  {selectedEvent.title}
                </Typography>
                <Typography id="event-details-description" className="event-details-description">
                  <strong>Profile Name:</strong> {selectedEvent.profile_name}
                  <br />
                  <strong>Room:</strong> {selectedEvent.room_name}
                  <br />
                  <strong>Start Time:</strong> {format(new Date(selectedEvent.start), 'PPPp')}
                  <br />
                  <strong>End Time:</strong> {format(new Date(selectedEvent.end), 'PPPp')}
                  <br />
                  <strong>Booked By:</strong> {selectedEvent.user_name}
                </Typography>
              </>
            )}
          </div>
        </Modal>

        <CreateEventModal
          isOpen={isEventModalOpen}
          onClose={() => setIsEventModalOpen(false)}
          onSave={handleSave}
          eventDetails={newEventDetails}
          setEventDetails={setNewEventDetails}
          availableRooms={availableRooms} // Pass the state as a prop
          fetchAvailableRoomsForNewEvent={fetchAvailableRoomsForNewEvent}
        />



        {/* Calendar */}
        <Grid item xs={12} md={8}>
          <Calendar
            onSelectSlot={handleSelectSlot}
            selectable
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ width: '100%', minHeight: '500px', height: 'auto' }}
            views={['month', 'week', 'day', 'agenda']}
            components={{
              toolbar: CustomToolbar,
            }}
            date={currentDate || new Date()}
            view={currentView}
            onView={(newView) => setCurrentView(newView)}
            onNavigate={(newDate) => setCurrentDate(newDate)}
            onSelectEvent={handleEventSelect}
          />
        </Grid>
      </Grid>
    </Container >
  );
};

export default Bookings;