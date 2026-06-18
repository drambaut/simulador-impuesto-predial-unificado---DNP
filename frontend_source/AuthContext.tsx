// src/AuthContext.tsx

import React, { createContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';

interface AuthContextType {
  isAuthenticated: boolean;
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
}

export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  setIsAuthenticated: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // Initialize isAuthenticated based on the cookie synchronously
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const token = Cookies.get('sessionToken');
    return token !== undefined;
  });

  return (
    <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};
