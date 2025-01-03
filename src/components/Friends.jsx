import '/src/styles/Friends.css'
import avatarImage from '../assets/avatar.png';
import React, {useState, useEffect, useContext} from 'react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
    faCheck,
    faXmark,
    faUnlock,
    faMagnifyingGlass,
    faMessage,
    faBan,
    faHandshakeAltSlash,
    faLessThan,
    faUserPlus
} from '@fortawesome/free-solid-svg-icons';
import {sendGetRequest, sendPostRequest, sendPatchRequest, sendDeleteRequest} from '../utils/HTTP.js';
import SideBar from "./SideBar.jsx";
import {useNavigate} from "react-router-dom";
import {connectStompClient, disconnectStompClient} from "../utils/WebSocket.jsx";

function Friends() {
    const navigate = useNavigate();
    const [blockedUsers, setBlockedUsers] = useState([])
    const [friendRequests, setFriendRequest] = useState([]);
    const [friendList, setFriendList] = useState([]);
    const [friendRequestNBlockList, setFriendRequestNBlockList] = useState(false)
    const [userInfo, setUserInfo] = useState(null)
    const [userNameToSearch, setUserNameToSearch] = useState('')
    const [conversations, setConversations] = useState([])
    const [notifications, setNotifications] = useState([]);

    async function getNotifications() {
        const data = await sendGetRequest('http://localhost:8081/api/notification');
        setNotifications(data.notificationList);
    }

    function setWSCallback(stompClient) {
        stompClient.onConnect = (frame) => {
            console.log('Connected');
            stompClient.subscribe('/user/queue/messages', async (message) => {
                const newMessage = JSON.parse(message.body);
                console.log(newMessage);
                switch (newMessage.notificationType) {
                    case "RECEIVED_FRIEND_REQUEST":
                        getFriendRequest();
                        getNotifications();
                        break;
                    case "FRIEND_REQUEST_ACCEPTED":
                        getFriendList();
                        getNotifications()
                        break;
                    case "REMOVED_FROM_GROUP":
                        break;
                }
            });
        };

        if (!stompClient.connected) {
            console.error('Cannot set up listener: STOMP client not connected.');
        }
    }

    useEffect(() => {
        getFriendRequest();
        getFriendList();
        getBlockList();
        getConversations()
        getNotifications()
        const stompClient= connectStompClient()
        setWSCallback(stompClient)
        return () => {
            disconnectStompClient();
        };
    }, [])


    async function openConversation(friendId) {
        const targetConversation = conversations.find((conversation) => conversation.friendId === friendId)
        if (targetConversation) {
            navigate(`/Chat/${targetConversation.conversationId}`);
        } else {
            const data = await sendPostRequest('http://localhost:8081/api/conversation/new', {
                friendId: friendId,
                lastActive: new Date().toISOString()
            })
            navigate(`/Chat/${data.membership.conversationId}`);
        }
    }

    async function getConversations() {
        const activeConversations = await sendGetRequest('http://localhost:8081/api/conversation', {'membershipStatus': 'ACTIVE'})
        const pendingConversations = await sendGetRequest('http://localhost:8081/api/conversation', {'membershipStatus': 'PENDING'})
        setConversations([...activeConversations.oneToOneList, ...pendingConversations.oneToOneList]);
    }

    async function getFriendRequest() {
        const data = await sendGetRequest('http://localhost:8081/api/user/friend-request-list');
        setFriendRequest(data);
    }

    async function getFriendList() {
        const data = await sendGetRequest('http://localhost:8081/api/user/friend-list');
        setFriendList(data);
    }

    async function getUserInfo(Name) {
        const data = await sendGetRequest('http://localhost:8081/api/user/info/' + Name);
        setUserInfo(data);
        console.log(data)
    }

    async function getBlockList() {
        const data = await sendGetRequest('http://localhost:8081/api/user/block-list');
        setBlockedUsers(data);
    }

    function onUserNameToSearchChanged(e) {
        setUserNameToSearch(e.target.value);
        if (e.target.value === '') setUserInfo(null)
    }

    async function sendFriendRequest() {
        await sendPostRequest('http://localhost:8081/api/user/friend-request', {
            receiverId: userInfo.userId,
            fixBug: ''
        })
        await getFriendRequest();
        getUserInfo(userNameToSearch)
    }

    async function acceptFriendRequest(senderId) {
        await sendPatchRequest('http://localhost:8081/api/user/friend-request', {
            senderId: senderId,
            response: 'ACCEPT'
        });
        await getFriendList()
        await getFriendRequest();
    }

    async function rejectFriendRequest(senderId) {
        await sendPatchRequest('http://localhost:8081/api/user/friend-request', {
            senderId,
            response: 'REJECT'
        });
        await getFriendList()
        await getFriendRequest();
    }

    async function blockUser(userId){
        await sendPostRequest('http://localhost:8081/api/user/block', {destinationUserId: userId, fixBug: ''})
        await getBlockList()
    }

    async function unblockUser(blockId, destinationUserId){
        console.log({blockId: blockId, destinationUserId: destinationUserId })
        await sendDeleteRequest('http://localhost:8081/api/user/unblock',{blockId: blockId, destinationUserId: destinationUserId })
        await getBlockList()
    }
    return (
        <div className="chatAppContainer">
            <SideBar notifications={notifications} style={{zIndex: 0}}/>
            <div className="friendContainer">
                <div>
                    <div className='friendList'>
                        <h1>Danh Sách Bạn Bè</h1>
                        {friendList.map((friend) => <Friend key={friend.friendId} user={friend}
                                                            getFriendList={getFriendList}
                                                            openConversation={openConversation}
                                                            blockUser={blockUser}
                        />)}
                    </div>
                </div>
                <div className='findUserInfoNFriendRequest'>
                    {/* <FontAwesomeIcon className="friendList_searchButton" icon={faMagnifyingGlass}/> */}
                    <input className="friendSearchBar"
                           value={userNameToSearch}
                           onChange={onUserNameToSearchChanged}
                           onKeyDown={(e) => e.key === 'Enter' && getUserInfo(userNameToSearch)}
                           type="text"/>
                    <FontAwesomeIcon
                        className="chatBox_input_sendButton searchBar_Button"
                        style={{top: '28px'}}
                        icon={faMagnifyingGlass}
                        onClick={() => getUserInfo(userNameToSearch)}/>
                    {userInfo ?
                        <div className='findUserInfo'>
                            <img className="findUserInfo_avatar" src={!!userInfo.userAvt?userInfo.userAvt:avatarImage} alt=""/>
                            <div className='findUserInfo_info'>
                                <p><b>Tên</b></p>
                                <p>{userInfo.name}</p>
                                <p><b>Username</b></p>
                                <p>{userInfo.userId}</p>
                                <div className='infoBar_actionContainer'>
                                    {userInfo.relationship === 'FRIEND' &&
                                        <button className='infoBar_actionButton'>
                                            <FontAwesomeIcon size='2x' icon={faHandshakeAltSlash}/>
                                        </button>}
                                    {userInfo.relationship === 'NONE' &&
                                        <button className='infoBar_actionButton' onClick={sendFriendRequest}>
                                            <FontAwesomeIcon size='2x' icon={faUserPlus}/>
                                        </button>}
                                    {userInfo.relationship === 'REQUEST_SENT' &&
                                        <button disabled className='infoBar_actionButton' onClick={sendFriendRequest}>
                                            <FontAwesomeIcon size='2x' icon={faUserPlus}/>
                                        </button>}
                                    {userInfo.relationship === 'REQUEST_RECEIVED' && <>
                                        <button className='infoBar_actionButton' onClick={sendFriendRequest}>

                                            <FontAwesomeIcon
                                                onClick={() => acceptFriendRequest(userInfo.userId)}
                                                className="friendRequest_Button"
                                                size="2x"
                                                icon={faCheck}
                                            />
                                        </button>
                                        <button className='infoBar_actionButton' onClick={sendFriendRequest}>
                                            <FontAwesomeIcon
                                                onClick={() => rejectFriendRequest(userInfo.userId)}
                                                className="friendRequest_Button"
                                                size="2x"
                                                icon={faXmark}
                                            />
                                        </button>
                                    </>
                                    }
                                    <button onClick={()=>openConversation(userInfo.userId)} className='infoBar_actionButton'>
                                        <FontAwesomeIcon size='2x' icon={faMessage}/>
                                    </button>

                                    <button
                                        disabled={!!blockedUsers.find((user) => user.destinationUserId === userInfo.userId)}
                                        onClick={() => blockUser(userInfo.userId)}
                                        className="infoBar_actionButton"
                                    >
                                        <FontAwesomeIcon size="2x" icon={faBan}/>
                                    </button>

                                </div>
                            </div>
                        </div> : <h3>Gõ Tên Để Thực Hiện Tìm Kiếm Thông Tin Người Dùng </h3>}
                    <div>
                        <h1>Lời Mời Kết Bạn</h1>
                        <div className="friendRequestList">
                            {friendRequests.map(request => <FriendRequest key={request.friendId} request={request}
                                                                          getFriendRequest={getFriendRequest}
                                                                          getFriendList={getFriendList}
                                                                          acceptFriendRequest={acceptFriendRequest}
                                                                          rejectFriendRequest={rejectFriendRequest}
                            />)}
                        </div>
                    </div>

                </div>

                <FontAwesomeIcon onClick={() => {
                    setFriendRequestNBlockList(!friendRequestNBlockList)
                }} className={friendRequestNBlockList ? 'banList_ToggleButton open' : 'banList_ToggleButton'} size='2x'
                                 icon={faLessThan}/>


                <div className={friendRequestNBlockList ? "friendRequestNBanList" : "friendRequestNBanList close"}>
                    <div>
                        <h1>Chặn</h1>
                        <div className="friendRequestList">
                            {blockedUsers.map(user => <BlockedUser user={user} unblockUser={unblockUser}/>)}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}

function FriendRequest({request, getFriendList, getFriendRequest, acceptFriendRequest, rejectFriendRequest}) {

    return (
        <div className="friendRequest">
            <img className="avatarFriendRequest" src={!!request.senderAvt?request.senderAvt:avatarImage} alt="Friend Request Avatar"/>
            <p>{request.senderName}</p>
            <FontAwesomeIcon
                onClick={() => rejectFriendRequest(request.senderId)}
                className="friendRequest_Button"
                size="2x"
                icon={faXmark}
            />
            <FontAwesomeIcon
                onClick={() => acceptFriendRequest(request.senderId)}
                className="friendRequest_Button"
                size="2x"
                icon={faCheck}
            />
        </div>
    );
}

function BlockedUser({user, unblockUser}) {

    return <div className='blockedUser'>
        <img className="avatarFriendRequest" src={avatarImage} alt=""/>
        <p>{user.destinationUserName}</p>
        <FontAwesomeIcon onClick={()=>{unblockUser(user.blockId, user.destinationUserId)}} className='friendRequest_Button' size='2x' icon={faUnlock}/>
    </div>
}

function Friend({user, openConversation, getFriendList, blockUser}) {
    async function unfriend(relationshipId, friendId) {
        await sendDeleteRequest('http://localhost:8081/api/user/friend', {relationshipId, friendId})
        await getFriendList()
    }

    return <div className='friend'>
        <img className="avatarFriendRequest" src={!!user.friendAvt?user.friendAvt:avatarImage} alt=""/>
        <p>{user.friendName}</p>
        <FontAwesomeIcon onClick={() => openConversation(user.friendId)} className='friendRequest_Button'
                         size='2x' icon={faMessage}/>
        <FontAwesomeIcon
            className='friendRequest_Button'
            onClick={() => unfriend(user.relationshipId, user.friendId)}
            size='2x' icon={faHandshakeAltSlash}/>
        <FontAwesomeIcon
            onClick={()=>blockUser(user.friendId)}
            className='friendRequest_Button'
            size='2x'
            icon={faBan}/>
    </div>

}

export default Friends