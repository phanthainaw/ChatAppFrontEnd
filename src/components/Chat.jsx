import React, {useState, useRef, useContext, useEffect} from 'react';
import '../styles/Chat.css';
import {sendDeleteRequest, sendGetRequest, sendPostRequest} from "../utils/HTTP";
import {connectStompClient, disconnectStompClient, sendMessage} from '../utils/WebSocket.jsx';
import SideBar from "./SideBar.jsx";
import {useNavigate, useParams} from 'react-router-dom';
import ChatList from "./ChatList.jsx";
import ChatBox from "./ChatBox.jsx";

function Chat() {

    const navigate = useNavigate()
    //Chat messages data
    const [messageMode, setMessageMode] = useState('ACTIVE')
    const [messages, setMessages] = useState([])
    const {conversationId} = useParams()
    const [targetConversationInfo, setTargetConversationInfo] = useState({});
    const [conversations, setConversations] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [groupMembers, setGroupMembers] = useState([]);

    async function getGroupMembers() {
        if (targetConversationInfo.conversationType === "Group") {
            const data = await sendGetRequest('http://localhost:8081/api/conversation/member_list', {conversationId: conversationId});
            setGroupMembers(data)
        }
    }

    async function getNotifications() {
        const data = await sendGetRequest('http://localhost:8081/api/notification');
        setNotifications(data.notificationList);
    }

    async function fetchTargetConversation() {
        let activeConversation = await sendGetRequest('http://localhost:8081/api/conversation', {'membershipStatus': 'ACTIVE'});
        let pendingConversation = await sendGetRequest('http://localhost:8081/api/conversation', {'membershipStatus': 'PENDING'});
        const newConversation = [...activeConversation.groupList.map((conversation) => ({
            ...conversation,
            membershipStatus: 'ACTIVE'
        })), ...activeConversation.oneToOneList.map((conversation) => ({
            ...conversation,
            membershipStatus: 'ACTIVE'
        })), ...pendingConversation.groupList.map((conversation) => ({
            ...conversation,
            membershipStatus: 'PENDING'
        })), ...pendingConversation.oneToOneList.map((conversation) => ({
            ...conversation,
            membershipStatus: 'PENDING'
        }))]
        const targetConversation = newConversation.filter(conversation => conversation.conversationId === conversationId)[0]
        setTargetConversationInfo(targetConversation)
        const data = await sendGetRequest('http://localhost:8081/api/message?conversationId=' + conversationId + '&pivotId=' + (targetConversation.lastMessageID + 1))
        let newMessages = data.messages;
        newMessages.sort((a, b) => new Date(a.sentTime) - new Date(b.sentTime)); // Ensure proper date comparison
        setMessages(newMessages);
    }

    async function getConversations() {
        const data = await sendGetRequest('http://localhost:8081/api/conversation', {'membershipStatus': messageMode})
        let newConversation = [...data.groupList, ...data.oneToOneList]
        setConversations(newConversation.sort((a, b) => new Date(b.sentTime) - new Date(a.sentTime)))
    }

    async function subscribeToGroupTopics(stompClient) {
        const activeConversations = await sendGetRequest('http://localhost:8081/api/conversation', {'membershipStatus': 'ACTIVE'})
        const pendingConversations = await sendGetRequest('http://localhost:8081/api/conversation', {'membershipStatus': 'PENDING'})
        let Conversations = [...activeConversations.groupList, ...pendingConversations.groupList]
        Conversations.forEach(conversation => {
            const topic = `/topic/${conversation.conversationId}`;
            if (stompClient.connected) {// Example topic format
                stompClient.subscribe(topic, async (message) => {
                    if (JSON.parse(message.body).message.senderId !== sessionStorage.getItem('userId') && JSON.parse(message.body).message.conversationId === conversationId) setMessages(prevMessages => [...prevMessages, JSON.parse(message.body).message]);
                });
                console.log(`Subscribed to topic: ${topic}`);
            }
        });
    }

    function setWSCallback(stompClient, setMessages, conversationId, conversations, setConversations, messageMode) {
        stompClient.onConnect = (frame) => {
            console.log('Connected');
            stompClient.subscribe('/user/queue/messages', async (message) => {
                const newMessage = JSON.parse(message.body);
                switch (newMessage.notificationType) {
                    case "NEW_CONVERSATION":
                        if (messageMode === newMessage.newConversation.membershipStatus) {
                            setConversations((prevConversation) => [newMessage.newConversation, ...prevConversation]);
                        }
                        break;
                    case "RECEIVED_FRIEND_REQUEST":
                        getNotifications()
                        break;
                    case "FRIEND_REQUEST_ACCEPTED":
                        getNotifications()
                        break;
                    case "REMOVED_FROM_GROUP":
                        setConversations((prevConversation) => prevConversation.filter((conversation)=>conversation.conversationId !== newMessage.groupId));
                        if(targetConversationInfo.conversationId === newMessage.groupId) navigate('/Chat/0')
                        setMessages([])
                        setTargetConversationInfo({})
                        break;
                    default:
                        if (newMessage.message.senderId !== sessionStorage.getItem('userId') && newMessage.message.conversationId === conversationId) setMessages(prevMessages => [...prevMessages, newMessage.message]);
                }
            });
            subscribeToGroupTopics(stompClient)
        };

        if (!stompClient.connected) {
            console.error('Cannot set up listener: STOMP client not connected.');
        }
    }

    useEffect(() => {
        const stompClient = connectStompClient()
        setWSCallback(stompClient, setMessages, conversationId, conversations, setConversations, messageMode)
        return () => {
            disconnectStompClient();
        };
    }, [conversationId, conversations, messageMode]);

    useEffect(() => {
        conversationId !== '0' && fetchTargetConversation();
    }, [conversationId]);

    useEffect(() => {
        getNotifications()
    }, []);
    return (
        <div className="chatAppContainer">
            <SideBar notifications={notifications}/>
            <div className='chat'>
                <ChatList conversations={conversations} getConversations={getConversations} messageMode={messageMode}
                          setMessageMode={setMessageMode} groupMembers={groupMembers}
                />
                <ChatBox messages={messages} setMessages={setMessages} targetConversationInfo={targetConversationInfo}
                         getConversations={getConversations} messageMode={messageMode} setMesageMode={setMessageMode}
                         blocked={!(targetConversationInfo.blocker == null)}/>
            </div>
        </div>
    )
}

export default Chat
