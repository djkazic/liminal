import React, { createContext, useState } from 'react';

export const PayModeContext = createContext();

export const PayModeProvider = ({ children }) => {
  const [payMode, setPayMode] = useState('lightning');

  return (
    <PayModeContext.Provider value={{ payMode, setPayMode }}>
      {children}
    </PayModeContext.Provider>
  );
};
