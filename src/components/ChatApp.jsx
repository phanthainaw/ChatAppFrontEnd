import React, { useState, useRef, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import '../styles/ChatApp.css';
import Chat from './Chat.jsx';
import Friends from './Friends.jsx';
import LogIn from './LogIn.jsx'
import {ConversationsProvider} from "./ConversationContext.jsx";

function ChatApp() {
  return (
      <ConversationsProvider>
        <Router>
          <Routes>
            <Route path='/Chat/:conversationId' element={<Chat/>}/>
            <Route path='/LogIn' element={<LogIn/>}/>
            <Route path='/Friends' element={<Friends/>}/>
          </Routes>
        </Router>
      </ConversationsProvider>
  );
}

export default ChatApp;
