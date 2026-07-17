import React, { useState } from 'react';
import Header from './Components/Header';
import Footer from './Components/Footer';
import Home from './Pages/Home/Home';
import Login from './Pages/Auth/Login';
import Register from './Pages/Auth/Register';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('student'); // student | parent | driver

  return (
    <>
      <Header
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        isLoggedIn={isLoggedIn}
        setIsLoggedIn={setIsLoggedIn}
        userRole={userRole}
      />
      
      <main className="flex-1 w-full flex flex-col">
        {currentPage === 'home' && (
          <Home 
            setCurrentPage={setCurrentPage} 
            isLoggedIn={isLoggedIn} 
            userRole={userRole} 
          />
        )}
        {currentPage === 'login' && (
          <Login 
            setCurrentPage={setCurrentPage} 
            setIsLoggedIn={setIsLoggedIn} 
            setUserRole={setUserRole} 
          />
        )}
        {currentPage === 'register' && (
          <Register 
            setCurrentPage={setCurrentPage} 
            setIsLoggedIn={setIsLoggedIn} 
            setUserRole={setUserRole} 
          />
        )}
      </main>

      <Footer />
    </>
  );
}

export default App;
