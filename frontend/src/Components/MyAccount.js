import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';

const MyAccount = () => {
    const [user, setUser] = useState(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [editMode, setEditMode] = useState(false);
    const { username } = useContext(AuthContext);  // Ensure username is correctly provided

    useEffect(() => {
        if (!username) {
            console.error('No username provided');
            return;
        }

        const fetchUserData = async () => {
            try {
                const response = await fetch(`http://localhost:3001/api/users/${username}`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
                }
                const data = await response.json();
                setUser(data);
                setEmail(data.email);
                setPassword('');
            } catch (error) {
                console.error('Failed to fetch user data:', error);
            }
        };

        fetchUserData();
    }, [username]);

    const handleEmailChange = (event) => setEmail(event.target.value);
    const handlePasswordChange = (event) => setPassword(event.target.value);

    const handleUpdate = async (event) => {
        event.preventDefault();
        try {
            const response = await fetch(`http://localhost:3001/api/users/${username}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })  // Send updated email and password
            });
            if (!response.ok) {
                throw new Error(`Failed to update: ${response.status} ${response.statusText}`);
            }
            console.log('Profile updated successfully');
            setEditMode(false);
        } catch (error) {
            console.error('Error updating profile:', error);
        }
    };

    return (
        <div className="my-account-container">
            {user ? (
                <>
                    <h2>Hi {user.user_name},</h2>
                    {!editMode ? (
                        <>
                            <p>Contact Email: {user.email}</p>
                            <p>Status: {user.access_type}</p>
                            <button onClick={() => setEditMode(true)}>Edit Profile</button>
                        </>
                    ) : (
                        <form onSubmit={handleUpdate}>
                            <label>
                                Email: <input type="email" value={email} onChange={handleEmailChange} />
                            </label>
                            <label>
                                Password: <input type="password" value={password} onChange={handlePasswordChange} placeholder="Enter new password" />
                            </label>
                            <button type="submit">Save Changes</button>
                            <button onClick={() => setEditMode(false)}>Cancel</button>
                        </form>
                    )}
                </>
            ) : (
                <p>Loading user data...</p>
            )}
        </div>
    );
};

export default MyAccount;
