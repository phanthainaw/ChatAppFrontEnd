import {useNavigate} from "react-router-dom";
import React, {useEffect, useState} from "react";
import {sendGetRequest, sendPostRequest} from "../utils/HTTP.js";
import {sendMessage} from "../utils/WebSocket.jsx";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faCirclePlus, faMagnifyingGlass, faPaperPlane} from "@fortawesome/free-solid-svg-icons";
import avatarImage from "../assets/avatar.png";

export default function ChatList({conversations, getConversations, messageMode, setMessageMode}) {
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
            messageType: 'TEXT_MESSAGE',
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
                    conversationId: data.conversation.id,
                    membershipStatus: 'ACTIVE',
                    conversationType: data.conversation.type

                }
                navigate(`/Chat/${data.conversation.id}`)
                console.log(firstMessage)
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
                console.log(newConversation);
                firstMessage = {
                    ...firstMessage,
                    destinationId: userInfo.userId,
                    conversationId: newConversation.conversation.id,
                    membershipStatus: 'ACTIVE',
                    conversationType: newConversation.conversation.type

                }
                console.log(firstMessage);
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