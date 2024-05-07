import React, { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App'; // Adjust the path as necessary
import './Layout.css';

const Layout = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { setIsLoggedIn } = useContext(AuthContext);
    const showSidebar = location.pathname !== "/login"; // Adjust "/login" as needed

    const handleLogout = () => {
        setIsLoggedIn(false);  // Update the login status
        navigate('/login');    // Redirect to the login page
    };


    return (
        <div className="all">

            <link href="https://db.onlinewebfonts.com/c/079a044d58fa1d86496ff27b6b85315b?family=FoundryGridnik+W01-Regular" rel="stylesheet" />
            <link href="https://db.onlinewebfonts.com/c/d3f1342abd8102278499b984bd1c70f3?family=Foundry+Gridnik+W03+Bold" rel="stylesheet" />
            <link href="https://db.onlinewebfonts.com/c/94a2eec4adcebc27646229795f10c68f?family=Foundry+Gridnik+W03+Medium" rel="stylesheet" />


            <div className="header-title">
                <h1>
                    <Link to="/" style={{ textDecoration: 'none', color: "var(--text-red)" }}>COOPER</Link>
                    <Link to="/" style={{ textDecoration: 'none', color: "var(--text-gray)" }}>BOOKER</Link>
                </h1>
            </div>


            <div className="flex flex-grow">
                {showSidebar && (
                    <div className="sidebar">
                        <ul className="menu-items">
                            <li><Link to="/">Home</Link></li>
                            <li><Link to="/bookings">Bookings</Link></li>
                            <li><Link to="/myaccount">Account</Link></li>
                            <li>
                                <Link to="/login" onClick={handleLogout}>Logout</Link>
                            </li>
                        </ul>
                        <div className="menu-icon">☰</div>
                    </div>
                )}
                <main className={`flex-grow ${showSidebar ? '' : 'full-width'}`}></main>
                <main className="flex-grow">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;