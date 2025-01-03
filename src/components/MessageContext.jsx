// MessageContext.js
import React, { createContext, useState } from 'react';

// Create the context
export const MessageContext = createContext();

// Create the provider component
export const MessageProvider = ({ children }) => {
  const [messages, setMessages] = useState([]); // Shared state

  return (
    <MessageContext.Provider value={{ messages, setMessages }}>
      {children}
    </MessageContext.Provider>
  );
};
