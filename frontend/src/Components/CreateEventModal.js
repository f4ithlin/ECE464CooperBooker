import React, { useContext } from 'react';
import { Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button, Select, MenuItem, Box } from '@mui/material';
import { AuthContext } from '../App';


function CreateEventModal({ isOpen, onClose, onSave, eventDetails, setEventDetails, availableRooms, fetchAvailableRoomsForNewEvent }) {
    const { username } = useContext(AuthContext);
    // Helper function to format time string for display as 'HH:mm'
    const formatTimeForDisplay = (timeStr) => {
        console.log("Received time string:", timeStr);  // Log what the function receives initially

        if (!timeStr) {
            console.log("No time string provided, returning empty string.");
            return '';
        }

        const parts = timeStr.split(':');
        console.log("Time parts:", parts);  // Check the result of the split operation

        if (parts.length >= 2 && parts[0] && parts[1]) {
            const formattedTime = `${parts[0]}:${parts[1]}`; // Ensure it returns 'HH:mm'
            console.log("Formatted time string:", formattedTime);  // Log the formatted time
            return formattedTime;
        } else {
            console.log("Time string is not in expected format, returning original time string:", timeStr);
            return timeStr;  // Return the original if it doesn't meet expected formatting
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        // Remap form field names to match state keys expected by the API
        const apiFieldMapping = {
            start_time: 'starttime',
            end_time: 'endtime'
        };
        const fieldName = apiFieldMapping[name] || name;

        // Update event details first
        setEventDetails(prevDetails => {
            const newDetails = {
                ...prevDetails,
                [fieldName]: value
            };

            // Trigger room fetching if one of the relevant fields is changed
            if (['date', 'starttime', 'endtime'].includes(fieldName)) {
                const newStartDate = new Date(newDetails.date + 'T' + newDetails.starttime);
                const newEndDate = new Date(newDetails.date + 'T' + newDetails.endtime);
                fetchAvailableRoomsForNewEvent(newStartDate, newEndDate);
            }

            return newDetails;
        });
    };



    const handleSave = async () => {
        if (!eventDetails.event_name || !eventDetails.starttime || !eventDetails.endtime || !eventDetails.room_name) {
            alert('Please fill all required fields');
            return;
        }

        try {
            // Fetch UID based on username before sending booking details
            const userResponse = await fetch(`http://localhost:3001/api/users/${username}`);
            if (!userResponse.ok) {
                throw new Error('Failed to fetch user data');
            }

            const userData = await userResponse.json();

            const bookingDetails = {
                roomName: eventDetails.room_name,
                date: eventDetails.date,
                startTime: eventDetails.starttime,
                endTime: eventDetails.endtime,
                eventName: eventDetails.event_name,
                uid: userData.uid  // Assuming your user API returns a uid field
            };

            console.log("Booking Details being sent:", bookingDetails);

            const response = await fetch('http://localhost:3001/api/book-room', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bookingDetails),
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const createdEvent = await response.json();
            console.log('Event created:', createdEvent);
            onClose();
        } catch (error) {
            console.error('Error creating event:', error);
        }
    };

    return (
        <Dialog open={isOpen} onClose={onClose} PaperProps={{
            style: { width: '80%', maxWidth: '600px' }
        }} >
            <DialogTitle>Add New Event</DialogTitle>
            <DialogContent>
                <Box marginBottom={2}>
                    <TextField
                        name="event_name"
                        label="Event Name"
                        value={eventDetails.event_name || ''}
                        onChange={handleChange}
                        fullWidth
                    />
                </Box>
                <Box marginBottom={2}>
                    <TextField
                        name="date"
                        label="Date"
                        type="date"
                        value={eventDetails.date || ''}
                        onChange={handleChange}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                    />
                </Box>
                <Box marginBottom={2}>
                    <TextField
                        name="start_time"
                        label="Start Time"
                        type="time"
                        value={eventDetails.starttime || ''}
                        onChange={handleChange}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        inputProps={{
                            step: 1800,  // 30 minutes
                        }}
                    />
                </Box>
                <Box marginBottom={2}>
                    <TextField
                        name="end_time"
                        label="End Time"
                        type="time"
                        value={eventDetails.endtime || ''}
                        onChange={handleChange}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        inputProps={{
                            step: 1800,  // 30 minutes
                        }}
                    />
                </Box>
                <Box marginBottom={2}>
                    <TextField
                        name="description"
                        label="Description"
                        value={eventDetails.description || ''}
                        onChange={handleChange}
                        fullWidth
                        multiline
                        rows={4}
                    />
                </Box>
                <Box marginBottom={2}>
                    <Select
                        name="room_name"
                        value={eventDetails.room_name || ''}
                        onChange={handleChange}
                        displayEmpty
                        fullWidth
                    >
                        <MenuItem disabled value="">
                            <em>Select a room</em>
                        </MenuItem>
                        {availableRooms.map(room => (
                            <MenuItem key={room.room_name} value={room.room_name}>{room.room_name}</MenuItem>
                        ))}
                    </Select>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave}>Save</Button>
            </DialogActions>
        </Dialog>
    );
}

export default CreateEventModal;