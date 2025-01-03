import avatarImage from '../assets/avatar.png';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import '../styles/SideBar.css'
import {useNavigate} from "react-router-dom";
import {
    faComment, faUserGroup, faBell, faArrowRightFromBracket
} from '@fortawesome/free-solid-svg-icons';
import React, {useState, useRef, useEffect} from 'react';
import {sendGetRequest} from "../utils/HTTP.js";
import {connectStompClient, disconnectStompClient} from '../utils/WebSocket.jsx';

function logOut() {

}

function SideBar({ notifications }) {
    const navigate = useNavigate();
    const userAvatar = sessionStorage.getItem('userAvt');
    const [notificationVisible, setNotificationVisible] = useState(false);
    const handleNotificationToggle = () => {
        setNotificationVisible(prev => !prev);
    };

    return (<div className="sideBar">
            <div className={`notificationBox ${notificationVisible ? 'active' : ''}`}>
                <p>Thông báo</p>
                {notifications?.map((notification) => (<Notification notification={notification}/>))}
            </div>
            <img
                className="avatar"
                src={!userAvatar || userAvatar === 'null' ? avatarImage : userAvatar}
                alt="User Avatar"
            />
            <button className='chat-button'>
                <FontAwesomeIcon icon={faBell} onClick={handleNotificationToggle}/>
                {notifications.length > 0 && <span className="notification-count">{notifications.length}</span>}
            </button>

            <button className="chat-button">
                <FontAwesomeIcon icon={faComment} onClick={() => navigate('/Chat/0')}/>
            </button>
            <button className="chat-button">
                <FontAwesomeIcon icon={faUserGroup} onClick={() => navigate('/Friends')}/>
            </button>
            <button className="chat-button gear-button">
                <FontAwesomeIcon icon={faArrowRightFromBracket} onClick={() => navigate('/LogIn')}/>
            </button>
        </div>);
}

function Notification({notification}) {
    return <div className="notificationContainer">
        <p>{notification.notificationContent}</p>
        <p>{new Date(notification.timeStamp).toLocaleString('en-GB', {
            weekday: 'short', // Day in short format (Mon, Tue, etc.)
            hour: '2-digit', minute: '2-digit', hour12: false, // Optional: 24-hour format
        })}</p>

    </div>
}

export default SideBar