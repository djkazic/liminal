import React, { createContext, useState } from 'react';

export const InitContext = createContext();

export const InitProvider = ({ children }) => {
  const [isWalletInitialized, setIsWalletInitialized] = useState(false);

  return (
    <InitContext.Provider
      value={{ isWalletInitialized, setIsWalletInitialized }}
    >
      {children}
    </InitContext.Provider>
  );
};
