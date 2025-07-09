import React, { useState } from 'react';
import Login from './Login';
import Register from './Register';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
  };

  return (
    <>
      {isLogin ? (
        <Login onToggleRegister={toggleAuthMode} />
      ) : (
        <Register onToggleLogin={toggleAuthMode} />
      )}
    </>
  );
};

export default AuthPage; 