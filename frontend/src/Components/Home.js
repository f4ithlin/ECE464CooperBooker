import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../App';
import './Home.css';
import { TextField, Modal, Box, Button } from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { parseISO, format } from 'date-fns';
import AdapterDateFns from '@date-io/date-fns';
import { formatInTimeZone } from 'date-fns-tz';



const Home = () => {
    const today = new Date();

    // Function to add the ordinal indicator to the day
    const getOrdinalNum = (n) => {
        return n + (n > 0 ? ['th', 'st', 'nd', 'rd'][(n > 3 && n < 21) || n % 10 > 3 ? 0 : n % 10] : '');
    };

    // Construct the formatted date string including the day of the week
    const formattedDate = `${today.toLocaleString('default', { weekday: 'long' })}, ${getOrdinalNum(today.getDate())} ${today.toLocaleString('default', { month: 'long' })}, ${today.getFullYear()}`;
    const formattedToday = format(today, 'yyyy-MM-dd'); // For comparisons
    const { username } = useContext(AuthContext);
    const [events, setEvents] = useState([]);
    const [currentEvent, setCurrentEvent] = useState(null);
    const [eventIdToDelete, setEventIdToDelete] = useState(null);
    const [displayTimes, setDisplayTimes] = useState({ start: '', end: '' });
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [searchQuery, setSearchQuery] = useState(""); // State to hold the search query
    const [allEvents, setAllEvents] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());

    const formattedSelectedDate = format(selectedDate, 'yyyy-MM-dd');
    const timeZone = 'America/New_York';
    const formatTimeForDisplay = (time) => {
        return formatInTimeZone(new Date(time), timeZone, 'HH:mm');
    };

    const handleOpenEditModal = () => {
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setErrorMessage("");
        setSuccessMessage("");
        handleClose();
    };
    const handleDateChange = (date) => {
        setSelectedDate(date);
    };

    const handleSearchChange = (event) => {
        setSearchQuery(event.target.value.toLowerCase());
    };

    const filteredEvents = allEvents.filter(event =>
        format(parseISO(event.date), 'yyyy-MM-dd') === formattedSelectedDate &&
        event.event_name.toLowerCase().includes(searchQuery)
    );


    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const response = await fetch(`http://localhost:3001/api/events/upcoming/${username}`);
                if (response.ok) {
                    const events = await response.json();
                    console.log(events);
                    setAllEvents(events);
                } else {
                    throw new Error('Failed to fetch events');
                }
            } catch (error) {
                console.error('Failed to fetch events:', error);
            }
        };

        if (username) {
            fetchEvents();
        }
    }, [username]);

    const handleEdit = (event) => {
        setCurrentEvent({
            ...event,
            initial: { ...event }
        });
        setDisplayTimes({
            start: formatTimeForDisplay(event.start_time),
            end: formatTimeForDisplay(event.end_time)
        });
        handleOpenEditModal(true);
    };

    const handleChange = (fieldName, value) => {
        console.log(`Changing ${fieldName} to`, value);

        setCurrentEvent(prev => {
            const updatedEvent = { ...prev, [fieldName]: value };

            // Check if the field changed is a time field and update display times
            if (fieldName === 'start_time' || fieldName === 'end_time') {
                setDisplayTimes(prevTimes => ({
                    ...prevTimes,
                    [fieldName === 'start_time' ? 'start' : 'end']: formatTimeForDisplay(new Date(`${updatedEvent.date}T${value}`))
                }));
            }

            return updatedEvent;
        });
    };


    const handleSubmit = async () => {
        const { initial, ...current } = currentEvent;
        if (JSON.stringify(initial) === JSON.stringify(current)) {
            setErrorMessage("No changes detected.");
            return;
        }
        const formattedStartTime = format(new Date(`${currentEvent.date}T${displayTimes.start}`), 'HH:mm:ss');
        const formattedEndTime = format(new Date(`${currentEvent.date}T${displayTimes.end}`), 'HH:mm:ss');

        const updatedEvent = {
            id: currentEvent.eid,
            event_name: currentEvent.event_name,
            room_name: currentEvent.room_name,
            date: currentEvent.date,
            starttime: formattedStartTime,
            endtime: formattedEndTime
        };

        console.log(updatedEvent);

        try {
            const response = await fetch(`http://localhost:3001/api/events/update/${updatedEvent.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedEvent)
            });
            if (response.ok) {
                const data = await response.json();
                const updatedAllEvents = allEvents.map(event =>
                    event.eid === updatedEvent.id ? { ...event, ...updatedEvent } : event
                );
                setAllEvents(updatedAllEvents);
                setSuccessMessage("Edit event successful!");
                setTimeout(() => setSuccessMessage(""), 3000);
                handleCloseEditModal();
            } else {
                const errorData = await response.json();
                setErrorMessage(errorData.message || "Failed to update event due to an unknown error.");
            }
        } catch (error) {
            console.error('Error updating event:', error);
            setErrorMessage("Internal server error while updating event.");
        }
    };


    const handleOpenDeleteModal = (eventId) => {
        setEventIdToDelete(eventId);
        setShowDeleteModal(true);
    };

    const handleCloseDeleteModal = () => {
        setShowDeleteModal(false);
    };

    const handleClose = () => {
        setCurrentEvent(null);
    };

    const modalStyle = {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 400,
        bgcolor: 'background.paper',
        boxShadow: 24,
        p: 4,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        borderRadius: '16px',
    };


    const confirmDelete = async () => {
        if (eventIdToDelete) {
            try {
                const response = await fetch(`http://localhost:3001/api/events/delete/${eventIdToDelete}`, {
                    method: 'DELETE'
                });
                if (response.ok) {
                    setAllEvents(prevEvents => prevEvents.filter(event => event.eid !== eventIdToDelete));
                    setShowDeleteModal(false);
                    console.log('Event deleted successfully');
                } else {
                    throw new Error('Failed to delete event');
                }
            } catch (error) {
                console.error('Error deleting event:', error);
            } finally {
                setEventIdToDelete(null);
                setShowDeleteModal(false);
            }
        }
    };


    return (
        <div className="flex flex-col min-h-screen">
            <div className="home-page">
                <div className="events-container-side"></div>


                <div className="events-container-main">
                    <h2>Today: {formattedDate}</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h2 style={{ margin: 0, paddingRight: '20px' }}>Your Events for</h2>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                            <DatePicker
                                label="Choose a Date"
                                value={selectedDate}
                                onChange={handleDateChange}
                                renderInput={(params) => <TextField {...params} style={{ width: '360px' }} />}
                            />
                        </LocalizationProvider>
                    </div>
                    <TextField
                        label="Search Events"
                        variant="outlined"
                        fullWidth
                        value={searchQuery}
                        onChange={handleSearchChange}
                        style={{ marginBottom: '20px', marginTop: '20px' }}
                    />
                    <div className="events-scrollable">
                        {filteredEvents.length > 0 ? filteredEvents.map(event => (
                            <div key={event.id} className="event-box" onClick={() => handleEdit(event)}>
                                <h3>{event.event_name}</h3>
                                <p>Room: {event.room_name}</p>
                                <p>Time: {formatTimeForDisplay(event.start_time)} - {formatTimeForDisplay(event.end_time)}</p>
                                <button onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(event);
                                }} className="edit-btn">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pen" viewBox="0 0 16 16">
                                        <path d="m13.498.795.149-.149a1.207 1.207 0 1 1 1.707 1.708l-.149.148a1.5 1.5 0 0 1-.059 2.059L4.854 14.854a.5.5 0 0 1-.233.131l-4 1a.5.5 0 0 1-.606-.606l1-4a.5.5 0 0 1 .131-.232l9.642-9.642a.5.5 0 0 0-.642.056L6.854 4.854a.5.5 0 1 1-.708-.708L9.44.854A1.5 1.5 0 0 1 11.5.796a1.5 1.5 0 0 1 1.998-.001m-.644.766a.5.5 0 0 0-.707 0L1.95 11.756l-.764 3.057 3.057-.764L14.44 3.854a.5.5 0 0 0 0-.708z" />
                                    </svg>
                                </button>
                                <button onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenDeleteModal(event.eid);
                                }} className="delete-btn">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-calendar-x" viewBox="0 0 16 16">
                                        <path d="M6.146 7.146a.5.5 0 0 1 .708 0L8 8.293l1.146-1.147a.5.5 0 1 1 .708.708L8.707 9l1.147 1.146a.5.5 0 0 1-.708.708L8 9.707l-1.146 1.147a.5.5 0 0 1-.708-.708L7.293 9 6.146 7.854a.5.5 0 0 1 0-.708" />
                                        <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z" />
                                    </svg>
                                </button>
                            </div>
                        )) : <p>No events for today or no events match your search.</p>}
                    </div>
                </div>



            </div>
            {currentEvent && (
                <Modal
                    open={isEditModalOpen}
                    onClose={handleCloseEditModal}
                    aria-labelledby="edit-event-modal-title"
                    aria-describedby="edit-event-modal-description"
                >
                    <Box sx={modalStyle}>
                        <h2 id="edit-event-modal-title">Edit Event</h2>
                        <TextField
                            label="Event Name"
                            variant="outlined"
                            fullWidth
                            value={currentEvent.event_name}
                            onChange={e => handleChange('event_name', e.target.value)}
                        />
                        <TextField
                            label="Room Name"
                            variant="outlined"
                            fullWidth
                            value={currentEvent.room_name}
                            onChange={e => handleChange('room_name', e.target.value)}
                        />
                        <TextField
                            label="Date"
                            type="date"
                            variant="outlined"
                            fullWidth
                            value={new Date(currentEvent.date).toISOString().substring(0, 10)}
                            onChange={e => handleChange('date', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            label="Start Time"
                            type="time"
                            variant="outlined"
                            fullWidth
                            value={displayTimes.start}
                            onChange={e => handleChange('start_time', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ step: 1800 }}
                        />
                        <TextField
                            label="End Time"
                            type="time"
                            variant="outlined"
                            fullWidth
                            value={displayTimes.end}
                            onChange={e => handleChange('end_time', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ step: 1800 }}
                        />
                        <Button
                            onClick={handleSubmit}
                            variant="outlined"
                            color="success"
                            sx={{
                                borderColor: 'green',
                                color: 'green',
                                '&:hover': {
                                    backgroundColor: 'green',
                                    borderColor: 'darkgreen',
                                    color: '#fff',
                                },
                                marginTop: 2
                            }}
                        >
                            Save
                        </Button>
                        <Button onClick={handleCloseEditModal} variant="outlined" color="error" sx={{ mt: 1 }}>
                            Cancel
                        </Button>
                        {errorMessage && (
                            <Box sx={{ mt: 2, bgcolor: 'error.main', color: 'white', p: 1, borderRadius: 1 }}>
                                {errorMessage}
                            </Box>
                        )}
                        {successMessage && (
                            <Box sx={{ mt: 2, bgcolor: 'success.main', color: 'white', p: 1, borderRadius: 1 }}>
                                {successMessage}
                            </Box>
                        )}
                    </Box>
                </Modal>
            )}
            {showDeleteModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        <h2 style={{ fontSize: '20px', textAlign: 'center' }}>Are you sure you want to delete this event?</h2>
                        <button onClick={confirmDelete} style={{
                            marginRight: '10px',
                            backgroundColor: 'transparent',
                            border: '2px solid red',
                            padding: '8px 16px',
                            borderRadius: '5px',
                            cursor: 'pointer'
                        }}>Yes</button>
                        <button onClick={handleCloseDeleteModal} style={{
                            backgroundColor: 'transparent',
                            border: '2px solid #ccc',
                            padding: '8px 16px',
                            borderRadius: '5px',
                            cursor: 'pointer'
                        }}>No</button>
                    </div>
                </div>
            )}
        </div>
    );

};

export default Home;