"use client";
import { User } from '@/type';
import React, { createContext, useState, useContext, ReactNode } from 'react';

// Create context type with user state and setter
interface UserContextType {
    user: User | null;
    setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

// Create the context with default undefined value
const UserContext = createContext<UserContextType | undefined>(undefined);

// Create provider component
interface UserProviderProps {
    children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);

    return (
        <UserContext.Provider value={{ user, setUser }}>
            {children}
        </UserContext.Provider>
    );
};

// Custom hook for using the user context
export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};

export default UserContext;