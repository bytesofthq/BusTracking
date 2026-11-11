import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './Components/Header';
import Footer from './Components/Footer';
import Home from './Pages/Home/Home';
import Login from './Pages/Auth/Login';
import Register from './Pages/Auth/Register';
import Tracking from './Pages/Tracking/Tracking';
import DriverHome from './Pages/Home/DriverHome';
import ParentDashboard from './Pages/Dashboard/ParentDashboard';
import StudentDashboard from './Pages/Dashboard/StudentDashboard';
import AdminDashboard from './Pages/Dashboard/AdminDashboard';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('student'); // student | parent | driver | admin

  // Initialize login state from localStorage if available
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('currentUser');
    if (token && user) {
      setIsLoggedIn(true);
      try {
        const parsed = JSON.parse(user);
        setUserRole(parsed.role || 'student');
      } catch (e) {
        setUserRole('student');
      }
    } else {
      setIsLoggedIn(false);
    }
  }, []);

  return (
    <>
      <Header
        isLoggedIn={isLoggedIn}
        setIsLoggedIn={setIsLoggedIn}
        userRole={userRole}
      />
      
      <main className="flex-1 w-full flex flex-col">
        <Routes>
          <Route 
            path="/" 
            element={
              !isLoggedIn ? (
                <Home isLoggedIn={false} userRole="guest" />
              ) : userRole === 'driver' ? (
                <Navigate to="/driver" replace />
              ) : userRole === 'admin' || userRole === 'institute' ? (
                <Navigate to="/admin" replace />
              ) : userRole === 'parent' ? (
                <ParentDashboard />
              ) : (
                <StudentDashboard />
              )
            } 
          />
          <Route 
            path="/driver" 
            element={
              isLoggedIn && userRole === 'driver' ? (
                <DriverHome />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          <Route 
            path="/admin" 
            element={
              isLoggedIn && (userRole === 'admin' || userRole === 'institute') ? (
                <AdminDashboard />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          <Route 
            path="/parent" 
            element={
              isLoggedIn && userRole === 'parent' ? (
                <ParentDashboard />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          <Route 
            path="/student" 
            element={
              isLoggedIn && userRole === 'student' ? (
                <StudentDashboard />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          <Route 
            path="/tracking" 
            element={
              <Tracking isLoggedIn={isLoggedIn} userRole={userRole} />
            } 
          />
          <Route 
            path="/login" 
            element={
              <Login 
                setIsLoggedIn={setIsLoggedIn} 
                setUserRole={setUserRole} 
              />
            } 
          />
          <Route 
            path="/register" 
            element={
              <Register 
                setIsLoggedIn={setIsLoggedIn} 
                setUserRole={setUserRole} 
              />
            } 
          />
          {/* Catch all redirecting to Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />
    </>
  );
}

export default App;
