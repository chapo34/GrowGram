// src/context/AuthContext.tsx

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../utils/firebase";

// 👇 Neue Schnittstelle inkl. logout()
interface AuthContextProps {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

// 👇 Default-Werte mit leerer Logout-Funktion
const AuthContext = createContext<AuthContextProps>({
  user: null,
  loading: true,
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // 👇 Logout-Funktion implementieren
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Fehler beim Ausloggen:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// 👇 Sauberer Zugriff auf den Context
export const useAuth = () => useContext(AuthContext);