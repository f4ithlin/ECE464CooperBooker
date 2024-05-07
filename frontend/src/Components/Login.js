import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import { AuthContext } from '../App';


const Login = () => {
    const [localUsername, setLocalUsername] = useState(''); // Changed for clarity
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const { setIsLoggedIn, setUsername: setGlobalUsername } = useContext(AuthContext);
    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const response = await fetch('http://localhost:3001/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username: localUsername, password })
        });

        if (response.ok) {
            setIsLoggedIn(true);
            setGlobalUsername(localUsername);
            navigate('/');
            setError(null);
        } else {
            const errorData = await response.json();
            setError(errorData.message);
            setIsLoggedIn(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen">
            <link href="https://db.onlinewebfonts.com/c/079a044d58fa1d86496ff27b6b85315b?family=FoundryGridnik+W01-Regular" rel="stylesheet" />
            <link href="https://db.onlinewebfonts.com/c/d3f1342abd8102278499b984bd1c70f3?family=Foundry+Gridnik+W03+Bold" rel="stylesheet" />
            <link href="https://db.onlinewebfonts.com/c/94a2eec4adcebc27646229795f10c68f?family=Foundry+Gridnik+W03+Medium" rel="stylesheet" />
            <div className="login-box">
                <h2>Login</h2>
                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="username">Username: </label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            required
                            value={localUsername}
                            onChange={(e) => setLocalUsername(e.target.value)}
                            className={localUsername ? 'input-has-value' : ''}
                        />
                    </div>
                    <div className="form-group password-group">
                        <label htmlFor="password">Password: </label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            id="password"
                            name="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={password ? 'input-has-value' : ''}
                        />
                        <span className="toggle-password" onClick={togglePasswordVisibility}>
                            {showPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10 10 0 0 0 21 12 10 10 0 0 0 3 12a10 10 0 0 0 3.06 3.06m1.18-1.18A8 8 0 0 1 4.56 9m14.88 0a8 8 0 0 1-5.06 5.06M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                            )}
                        </span>
                    </div>
                    {error && <div className="alert alert-danger" role="alert">{error}</div>}
                    <button type="submit">Sign In</button>
                </form>
            </div>
        </div>
    );
};

export default Login;
