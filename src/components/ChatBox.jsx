import {useParams} from "react-router-dom";
import React, {useEffect, useRef, useState} from "react";
import {sendDeleteRequest, sendGetRequest, sendPostRequest} from "../utils/HTTP.js";
import {sendMessage} from "../utils/WebSocket.jsx";
import avatarImage from "../assets/avatar.png";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
    faArrowRight, faBan,
    faCakeCandles,
    faCircleInfo, faHandshakeAltSlash,
    faPaperclip,
    faPaperPlane,
    faTrash, faUser
} from "@fortawesome/free-solid-svg-icons";

export default function ChatBox({
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
    const [generating, setGenerating] = useState(false);
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
        if (isScrolledToBottom) {
            scrollToBottom();
        }
    }, [messages]);
    useEffect(() => {
        if(targetConversationInfo.conversationType === "Group") getGroupMembers()
        },[targetConversationInfo])

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
            messageType: 'TEXT_MESSAGE',
            conversationType: targetConversationInfo.conversationType,
            membershipStatus: targetConversationInfo.membershipStatus,
        };

        // Optimistically update the message list
        setMessages([
            ...messages,
            {
                content: newMessage,
                conversationId: targetConversationInfo.conversationId,
                messageType: 'TEXT_MESSAGE',
                senderId: sessionStorage.getItem('userId'),
                sentTime: new Date().toISOString(),
            },
        ]);
        console.log(newMsg);
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

    async function generateWish(){
        setGenerating(true);
        const response = await sendPostRequest('http://127.0.0.1:5000/generate', {"prompt": newMessage.trim()});
        setGenerating(false);
        setNewMessage(response.generated_texts);
        console.log(response);
    }

    async function handleFileUpload(event) {
        const file = event.target.files[0]; // Get the selected file

        if (file) {
            const formData = new FormData(); // Create FormData instance
            formData.append('file', file); // Append the file to the form data
            try {
                const response = await fetch('http://localhost:8081/api/message/files', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${sessionStorage.getItem('token')}`, // Add the JWT
                        'conversationId': targetConversationInfo.conversationId,
                        'destinationId': targetConversationInfo.conversationType == 'OneToOne' ? targetConversationInfo.friendId : targetConversationInfo.conversationId,
                        'sentTime': new Date().toISOString(),
                        'membershipStatus' : targetConversationInfo.membershipStatus,
                        'messageType': 'FILE_MESSAGE',
                        'conversationType': targetConversationInfo.conversationType,
                    },
                    body: formData,
                });
                if (response.ok) {
                    const result = await response.json();
                    setMessages([
                        ...messages,
                        result.message
                    ]);
                } else {
                    console.error('Error uploading file:', response.statusText);
                }
            } catch (error) {
                console.error('Error:', error);
            }
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
                {messages?.map((msg) => {
                    const isSender = msg.senderId === sessionStorage.getItem('userId');
                    const member = groupMembers.find(member => member.memberId === msg.senderId);
                    const avatarSrc = member?.memberAvt || avatarImage;
                    const senderName = member?.memberName;
                    const fileMessageSrc = msg.type === "FILE_MESSAGE" ? msg.content : "";

                    return isSender ? (
                        msg.type === "FILE_MESSAGE" ?
                            (<img style={{maxWidth: '400px', alignSelf:"flex-end", marginLeft:"auto"}} key={msg.id} src={fileMessageSrc}
                                  alt="File attachment"/>) :
                            (<MessageBubble key={msg.id} message={msg}/>)
                    ) : (
                        msg.type === "FILE_MESSAGE" ? (
                            <div className="messageBubbleOtherContainer" key={msg.id}>
                                {targetConversationInfo.conversationType === 'Group' && senderName && (
                                    <>
                                        <div></div>
                                        <p className="senderName">{senderName}</p>
                                    </>
                                )}
                                <img className="messageBubble_avatar" src={avatarSrc} alt="Avatar"/>
                                <img style={{maxWidth: '400px'}} key={msg.id} src={fileMessageSrc}
                                     alt="File attachment"/>
                            </div>

                        ) : (
                            <div className="messageBubbleOtherContainer" key={msg.id}>
                                {targetConversationInfo.conversationType === 'Group' && senderName && (
                                    <>
                                        <div></div>
                                        <p className="senderName">{senderName}</p>
                                    </>
                                )}
                                <img className="messageBubble_avatar" src={avatarSrc} alt="Avatar"/>
                                <MessageBubble message={msg}/>
                            </div>
                        )
                    );
                })}

                <div ref={conversationEndRef}/>
            </div>
            <div className="chatBox_input">
                <FontAwesomeIcon onClick={generateWish} size="2x" icon={faCakeCandles} ></FontAwesomeIcon>
                <label htmlFor="file-input" className="file-input-label">
                    <FontAwesomeIcon icon={faPaperclip} className="file-icon"/>
                    <input type="file" onChange={handleFileUpload} id="file-input" className="file-input"/>
                </label>
                {blocked ?
                    <p>Can Not Send Message To This User</p>
                    : generating ? <div className="loader"></div> : <input
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
                                  isAdmin={targetConversationInfo.adminId === sessionStorage.getItem('userId')}
                                  groupMembers={groupMembers}
                                  getGroupMembers={getGroupMembers}
                />
                : <InfoBar isOpen={isOpen} conversation={targetConversationInfo} setIsOpen={setIsOpen}/>}
        </div>
    );
}

function GroupManageBar({isOpen, setIsOpen, conversation, isAdmin, groupMembers,getGroupMembers}) {

    const [memberToAdd, setMemberToAdd] = useState('')

    function onMemberToAddChanged(e) {
        setMemberToAdd(e.target.value)
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
        {groupMembers ? (
            groupMembers.map(member => <GroupMember key={member.id} member={member} groupId={conversation.conversationId}
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
function MessageImage({message}) {
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
