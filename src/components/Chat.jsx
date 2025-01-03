import React, {useState, useRef, useContext, useEffect} from 'react';
import '../styles/Chat.css';
import avatarImage from '../assets/avatar.png';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
    faPaperPlane,
    faPaperclip,
    faMagnifyingGlass,
    faUser,
    faBan,
    faHandshakeAltSlash,
    faArrowRight,
    faCircleInfo,
    faCirclePlus,
    faTrash
} from '@fortawesome/free-solid-svg-icons';
import {sendDeleteRequest, sendGetRequest, sendPostRequest} from "../utils/HTTP";
import {connectStompClient, disconnectStompClient, sendMessage} from '../utils/WebSocket.jsx';
import SideBar from "./SideBar.jsx";
import {useNavigate, useParams} from 'react-router-dom';

function Chat() {

    //Chat messages data
    const [messageMode, setMessageMode] = useState('ACTIVE')
    const [messages, setMessages] = useState([])
    const {conversationId} = useParams()
    const [targetConversationInfo, setTargetConversationInfo] = useState({});
    const [conversations, setConversations] = useState([]);
    const [notifications, setNotifications] = useState([]);

    async function getNotifications() {
        const data = await sendGetRequest('http://localhost:8081/api/notification');
        setNotifications(data.notificationList);
    }

    async function fetchTargetConversation() {
        const activeConversation = await sendGetRequest('http://localhost:8081/api/conversation', {'membershipStatus': 'ACTIVE'})
        const pendingConversation = await sendGetRequest('http://localhost:8081/api/conversation', {'membershipStatus': 'PENDING'})
        const newConversation = [...activeConversation.groupList, ...activeConversation.oneToOneList, ...pendingConversation.groupList, ...pendingConversation.oneToOneList]
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
            console.log(`Subscribed to topic: ${topic}`);}
        });
    }
    function setWSCallback(stompClient, setMessages, conversationId, conversations, setConversations, messageMode) {
        stompClient.onConnect = (frame) => {
            // console.log('Connected');
            stompClient.subscribe('/user/queue/messages', async (message) => {
                const newMessage = JSON.parse(message.body);
                switch (newMessage.notificationType) {
                    case "NEW_CONVERSATION":
                        if (messageMode === "PENDING") {
                            console.log(newMessage);
                            console.log(messageMode);
                            setConversations((prevConversation) => [newMessage.newConversation, ...prevConversation]);
                        }
                        break;
                    case "RECEIVED_FRIEND_REQUEST":
                        getNotifications
                        break;
                    case "FRIEND_REQUEST_ACCEPTED":
                        getNotifications
                        break;
                    case "REMOVED_FROM_GROUP":
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
            <SideBar notifications={notifications} />
            <div className='chat'>
                <ChatList conversations={conversations} getConversations={getConversations} messageMode={messageMode}
                          setMessageMode={setMessageMode}/>
                <ChatBox messages={messages} setMessages={setMessages} targetConversationInfo={targetConversationInfo}
                         getConversations={getConversations} messageMode={messageMode} setMesageMode={setMessageMode}
                         blocked={!(targetConversationInfo.blocker == null)}/>
            </div>
        </div>
    )
}

function ChatList({conversations, getConversations, messageMode, setMessageMode}) {
    const navigate = useNavigate();
    //Chat preview data
    const [createConservationForm, setCreateConservationForm] = useState({
        name: '',
        firstMessage: '',
        show: false,
        group: false
    });


    async function openConversation(conversation) {
        navigate(`/Chat/${conversation.conversationId}`)
    }

    async function createConservation() {
        let data = null
        let newConversation = null
        let userInfo = null
        let firstMessage = {
            sentTime: new Date().toISOString(),
            content: createConservationForm.firstMessage,
            type: 'TEXT_MESSAGE',
        };
        switch (createConservationForm.group) {
            case true:
                console.log('creating Group Chat');
                data = await sendPostRequest('http://localhost:8081/api/conversation/create_group', {
                    groupName: createConservationForm.name,
                    fixBug: ''
                })
                firstMessage = {
                    ...firstMessage,
                    destinationId: data.conversation.id,
                    conversationId: data.conversation.id
                }
                navigate(`/Chat/${data.conversation.id}`)
                await sendMessage(firstMessage, 'group_chat')
                await getConversations()

                break;

            case false:
                console.log('creating Private Chat');
                userInfo = await sendGetRequest('http://localhost:8081/api/user/info/' + createConservationForm.name)
                newConversation = await sendPostRequest('http://localhost:8081/api/conversation/new', {
                    friendId: userInfo.userId,
                    lastActive: new Date().toISOString()
                })
                console.log({
                    friendId: userInfo.userId,
                    lastActive: new Date().toISOString()
                });
                firstMessage = {
                    ...firstMessage,
                    destinationId: newConversation.membership.id,
                    conversationId: newConversation.conversation.id
                }
                await sendMessage(firstMessage, 'one_to_one_chat')
                navigate(`/Chat/${newConversation.conversation.id}`)
                await getConversations()
                break;
        }
        setCreateConservationForm({...createConservationForm, creating: !createConservationForm.creating})
    }

    function onCreateConservationFormChanged(e) {
        const {name, value} = e.target
        setCreateConservationForm({...createConservationForm, [name]: value})
    }

    function switchMessageMode() {
        switch (messageMode) {
            case 'ACTIVE':
                setMessageMode('PENDING');
                break;
            case 'PENDING':
                setMessageMode('ACTIVE')
                break;
        }
    }

    useEffect(() => {
        getConversations();
    }, []);
    useEffect(() => {
        getConversations();
    }, [messageMode]);

    return (
        <div className="chatList">
            <div className="searchBar">
                <input
                    className="searchBar_TextInput"
                    placeholder="Search"
                    type="text"
                />
                <FontAwesomeIcon
                    className="chatBox_input_sendButton searchBar_Button"
                    icon={faMagnifyingGlass}
                />
            </div>
            <div>
                <button onClick={switchMessageMode}> {messageMode === "ACTIVE" ? <>Tin nhắn chính</> : <>Tin nhắn
                    chờ</>}</button>
            </div>
            {conversations.map(conversation => (
                <div
                    key={conversation.conversationId}
                    onClick={() => {
                        openConversation(conversation)
                    }}>
                    <ChatPreview conversation={conversation}/>
                </div>))}
            <FontAwesomeIcon
                className="chatList_createConversationButton"
                size='2x'
                onClick={() => {
                    setCreateConservationForm({...createConservationForm, creating: !createConservationForm.creating})
                }}
                icon={faCirclePlus}
            />
            <div className={`chatList_createConversationForm ${createConservationForm.creating ? 'show' : ''}`}>
                <h2 className="formTitle"><p style={{display: 'inline-block'}}>Create</p>
                    <button
                        style={{margin: '10px', fontSize: '0.75em', height: '30px'}}
                        onClick={() => {
                            setCreateConservationForm({...createConservationForm, group: !createConservationForm.group})
                        }}
                    >
                        {createConservationForm.group ? <>Group</> : <>Personal</>}
                    </button>
                    <p style={{display: 'inline-block'}}>Chat</p></h2>
                <div className="formGroup">
                    {createConservationForm.group ? <>
                        <label className="formLabel" htmlFor="groupName">Group Chat Name</label>
                        <input
                            id="groupName"
                            className="formInput"
                            type="text"
                            name='name'
                            onChange={onCreateConservationFormChanged}
                            value={createConservationForm.name}
                            placeholder="Enter group name"
                        />
                    </> : <>
                        <label className="formLabel" htmlFor="groupName">User Name</label>
                        <input
                            id="Username"
                            name='name'
                            onChange={onCreateConservationFormChanged}
                            className="formInput"
                            type="text"
                            value={createConservationForm.name}
                            placeholder="Enter user name"
                        />
                    </>

                    }

                </div>
                <div className="formGroup">
                    <label className="formLabel" htmlFor="message">Message</label>
                    <input
                        name='firstMessage'
                        value={createConservationForm.firstMessage}
                        id="message"
                        className="formInput"
                        onChange={onCreateConservationFormChanged}
                        type="text"
                        placeholder="Type your first message"
                    />
                </div>
                <div className="formButtonContainer">
                    <button
                        onClick={createConservation}
                        className="formButton"
                    >
                        <FontAwesomeIcon className="formButtonIcon" icon={faPaperPlane}/>
                        Create
                    </button>
                    <button
                        onClick={() => {
                            setCreateConservationForm({
                                ...createConservationForm,
                                creating: !createConservationForm.creating
                            })
                        }}
                        className="formButton cancelButton"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

function ChatPreview({conversation}) {
    return (
        <div className="chatPreview">
            <img className="chatPreview_avatar" src={!!conversation.friendAvt?conversation.friendAvt:avatarImage} alt=""/>
            <div className="chatPreview_Info">
                <p>{conversation.conversationType === "OneToOne" ? conversation.friendName : conversation.groupName}</p>
                <p>{new Date(conversation.conversationLastActive).toLocaleString('en-GB', {
                    weekday: 'short', // Day in short format (Mon, Tue, etc.)
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false, // Optional: 24-hour format
                })}</p>
            </div>
        </div>
    );
}

function ChatBox({
                     messages,
                     setMessages,
                     targetConversationInfo,
                     setMesageMode,
                     messageMode,
                     getConversations,
                     blocked
                 }) {
    const {conversationId} = useParams()
    const [newMessage, setNewMessage] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [isScrolledToBottom, setIsScrolledToBottom] = useState(true); // Track if the user is scrolled to the bottom
    const conversationEndRef = useRef(null);
    const chatContainerRef = useRef(null);
    const [groupMembers, setGroupMembers] = useState([]);

    // Scroll to the bottom of the chat
    const scrollToBottom = () => {
        if (conversationEndRef.current) {
            conversationEndRef.current.scrollIntoView({behavior: 'smooth'});
        }
    };

    async function getGroupMembers() {
        if (targetConversationInfo.conversationType === "Group") {
            const data = await sendGetRequest('http://localhost:8081/api/conversation/member_list', {conversationId: conversationId});
            setGroupMembers(data)
        }
    }

    // Handle scrolling behavior
    useEffect(() => {
        getGroupMembers();
        if (isScrolledToBottom) {
            scrollToBottom();
        }
    }, [messages]);

    const handleScroll = () => {
        const chatContainer = chatContainerRef.current;
        if (!chatContainer) return;

        // Check if user is near the bottom
        const isAtBottom =
            chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 50;
        setIsScrolledToBottom(isAtBottom);
    };

    function handleSendMessage() {
        if (newMessage.trim() === '') return;

        const newMsg = {
            conversationId: targetConversationInfo.conversationId,
            destinationId: targetConversationInfo.conversationType == 'OneToOne' ? targetConversationInfo.friendId : targetConversationInfo.conversationId,
            sentTime: new Date().toISOString(),
            content: newMessage,
            type: 'TEXT_MESSAGE',
        };

        // Optimistically update the message list
        setMessages([
            ...messages,
            {
                content: newMessage,
                conversationId: targetConversationInfo.conversationId,
                messageStatus: null,
                senderId: sessionStorage.getItem('userId'),
                sentTime: new Date().toISOString(),
                type: null,
            },
        ]);

        sendMessage(newMsg, targetConversationInfo.conversationType == 'OneToOne' ? 'one_to_one_chat' : 'group_chat');
        setNewMessage('');
        setIsScrolledToBottom(true);
        // Ensure scroll when sending a message
        if (messageMode === "PENDING") {
            setMesageMode("ACTIVE");
            getConversations()
        }

    }

    async function getOlderMessages() {
        const chatContainer = chatContainerRef.current;
        if (chatContainer.scrollTop === 0) {
            // We reached the top, load older messages
            const data = await sendGetRequest(
                'http://localhost:8081/api/message?conversationId=' +
                targetConversationInfo.conversationId +
                '&pivotId=' +
                messages[0].id
            );
            let newMessages = [...data.messages, ...messages];
            newMessages.sort((a, b) => new Date(a.sentTime) - new Date(b.sentTime)); // Ensure proper date comparison
            setMessages(newMessages);
        }
    }

    return (
        <div className="chatBox">
            <div className="chatBox_actionBar">
                <div className="chatBox_avatar">
                    <img className="chatPreview_avatar" src={!!targetConversationInfo.friendAvt?targetConversationInfo.friendAvt:avatarImage} alt=""/>
                </div>
                <div>
                    <h3>
                        {targetConversationInfo
                            ? targetConversationInfo.conversationType === 'Group'
                                ? targetConversationInfo.groupName
                                : targetConversationInfo.friendName
                            : ''}
                    </h3>
                </div>
                <FontAwesomeIcon
                    onClick={() => setIsOpen(!isOpen)}
                    className="chatBox_actionBar_Button"
                    size="2x"
                    icon={faCircleInfo}
                />
            </div>
            <div
                className="chatBox_conversation"
                ref={chatContainerRef}
                onScroll={() => {
                    handleScroll();
                    getOlderMessages();
                }}
            >
                {messages?.map((msg) =>
                    msg.senderId === sessionStorage.getItem('userId') ? (
                        <MessageBubble key={msg.id} message={msg}/>
                    ) : (
                        <div className="messageBubbleOtherContainer" key={msg.id}>
                            {targetConversationInfo.conversationType === 'Group' ? <>
                                <div></div>
                                <p className="senderName">{groupMembers.find(member => member.memberId === msg.senderId)?.memberName}</p>
                                <img className="messageBubble_avatar" src={!!groupMembers.find(member => member.memberId === msg.senderId)?.memberAvt?groupMembers.find(member => member.memberId === msg.senderId)?.memberAvt:avatarImage}/>
                            </> : <><img className="messageBubble_avatar" src={!!targetConversationInfo.friendAvt?targetConversationInfo.friendAvt:avatarImage} alt=""/></>}
                            <MessageBubble message={msg}/>
                        </div>
                    )
                )}
                <div ref={conversationEndRef}/>
            </div>
            <div className="chatBox_input">
                <label htmlFor="file-input" className="file-input-label">
                    <FontAwesomeIcon icon={faPaperclip} className="file-icon"/>
                    <input type="file" id="file-input" className="file-input"/>
                </label>
                {blocked ?
                    <p>Can Not Send Message To This User</p>
                    : <input
                        className="chatBox_input_text"
                        type="text"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    />}

                <FontAwesomeIcon
                    className="chatBox_input_sendButton"
                    size="2x"
                    icon={faPaperPlane}
                    onClick={handleSendMessage}
                />
            </div>

            {targetConversationInfo.conversationType === 'Group'
                ? <GroupManageBar isOpen={isOpen} setIsOpen={setIsOpen} conversation={targetConversationInfo}
                                  isAdmin={targetConversationInfo.adminId === sessionStorage.getItem('userId')}/>
                : <InfoBar isOpen={isOpen} conversation={targetConversationInfo} setIsOpen={setIsOpen}/>}
        </div>
    );
}

function GroupManageBar({isOpen, setIsOpen, conversation, isAdmin}) {

    const [memberToAdd, setMemberToAdd] = useState('')

    const [members, setMembers] = useState([]
    )

    function onMemberToAddChanged(e) {
        setMemberToAdd(e.target.value)
    }

    async function getGroupMembers() {
        const data = await sendGetRequest('http://localhost:8081/api/conversation/member_list', {conversationId: conversation.conversationId})
        setMembers(data)
    }

    async function addMember() {
        const member = await sendGetRequest('http://localhost:8081/api/user/info/' + memberToAdd)
        sendPostRequest('http://localhost:8081/api/conversation/add_member', {
            memberId: member.userId,
            conversationId: conversation.conversationId,
            groupName: conversation.groupName
        })
        window.location.reload();
    }

    function leaveGroup() {
        sendDeleteRequest('http://localhost:8081/api/conversation/leave_group', {
            memberId: sessionStorage.getItem('userId'),
            groupId: conversation.conversationId,
            membershipId: conversation.membershipId
        })
        window.location.reload();
    }

    useEffect(() => {
        getGroupMembers()
    }, [])

    return (<div className={isOpen ? "infoBar" : "infoBar close"}>
        <FontAwesomeIcon className='infoBar_backButton' size='2x' onClick={() => setIsOpen(!isOpen)}
                         icon={faArrowRight}/>
        <br/>
        <h3>Thành viên nhóm</h3>
        {members ? (
            members.map(member => <GroupMember key={member.id} member={member} groupId={conversation.conversationId}
                                               isAdmin={isAdmin}/>)
        ) : (
            <p>No members found</p>
        )}
        {isAdmin ? <>
            <input onChange={onMemberToAddChanged}
                   value={memberToAdd} type="text"/>
            <button onClick={addMember}>Add</button>
        </> : <></>}
        <button onClick={leaveGroup}>Leave Group</button>
    </div>)
}

function GroupMember({member, groupId, isAdmin}) {
    function deleteMember() {
        sendDeleteRequest('http://localhost:8081/api/conversation/delete_member', {memberId: member.memberId, groupId});
        window.location.reload();
    }

    return <div className='groupMember'>
        <img className="avatarFriendRequest" src={!!member.memberAvt?member.memberAvt:avatarImage} alt=""/>
        <p>{member.memberName}</p>
        {isAdmin ? <FontAwesomeIcon className='friendRequest_Button' onClick={deleteMember} size='2x' icon={faTrash}/> :
            <div></div>}
        <FontAwesomeIcon className='friendRequest_Button' size='2x' icon={faCircleInfo}/>
    </div>

}

function InfoBar({isOpen, setIsOpen, conversation}) {
    return (<div className={isOpen ? "infoBar" : "infoBar close"}>
        <button className='infoBar_backButton'><FontAwesomeIcon  size='2x' onClick={() => setIsOpen(!isOpen)}
                                 icon={faArrowRight}/></button>

        <img className="avatar" src={!!conversation.friendAvt?conversation.friendAvt:avatarImage} alt=""/>
        <div className='infoBar_info'>
            <p><b>Tên</b></p>
            <p>{conversation.friendName}</p>
            <p><b>Id</b></p>
            <p>{conversation.friendId}</p>
        </div>
        <div className='infoBar_actionContainer'>
            <button className='infoBar_actionButton'><FontAwesomeIcon size='2x' icon={faUser}/></button>
            <button className='infoBar_actionButton'><FontAwesomeIcon size='2x' icon={faHandshakeAltSlash}/></button>
            <button className='infoBar_actionButton'><FontAwesomeIcon size='2x' icon={faBan}/></button>
        </div>
    </div>)
}

function MessageBubble({message}) {
    const isSenderYou = message.senderId === sessionStorage.getItem('userId');
    return (
        <div className={`messageBubble ${isSenderYou ? 'you' : 'other'}`}>
            <div className="messageBubble_content">
                <p className="messageBubble_text">{message.content}</p>
                <span className="messageBubble_time">{new Date(message.sentTime).toLocaleString('en-GB', {
                    weekday: 'short', // Day in short format (Mon, Tue, etc.)
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false, // Optional: 24-hour format
                })}</span>
            </div>
        </div>
    );
}

function TypingIndicator() {
    return (
        <div className="typingIndicator">
            <span/>
            <span/>
            <span/>
        </div>
    );
}

export default Chat
