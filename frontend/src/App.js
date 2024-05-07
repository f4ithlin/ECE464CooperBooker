import React, { useState, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './Components/Home';
import Bookings from './Components/Bookings';
import MyAccount from './Components/MyAccount';
import Layout from './Components/Layout';
import Login from './Components/Login';


export const AuthContext = createContext({
  isLoggedIn: false,
  setIsLoggedIn: () => { },
  username: null,
  setUsername: () => { }
});

// PrivateRoute component
const PrivateRoute = ({ element: Component, ...rest }) => {
  const { isLoggedIn } = useContext(AuthContext);

  return isLoggedIn ? Component : <Navigate to="/login" />;
};



const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');

  return (
    <AuthContext.Provider value={{ isLoggedIn, setIsLoggedIn, username, setUsername }}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute element={<Home />} />} />
            <Route path="/bookings" element={<PrivateRoute element={<Bookings />} />} />
            <Route path="/myaccount" element={<PrivateRoute element={<MyAccount />} />} />
            {/* Add more routes as needed */}
          </Routes>
        </Layout>
      </Router>
    </AuthContext.Provider>
  );
};

export default App;
