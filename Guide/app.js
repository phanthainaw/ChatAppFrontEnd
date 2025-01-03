const hostWithPort = window.location.host
console.log(`Bearer ${sessionStorage.getItem('token')}`);


const stompClient = new StompJs.Client({    
    brokerURL: `ws://localhost:8081/ws`,
    connectHeaders: {
        Authorization: `Bearer ${sessionStorage.getItem('token')}` // Add JWT from sessionStorage
        // Authorization: `Bearer `
    }
});

async function getConversations() {
    const response = await fetch('http://localhost:8081/api/conversation', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionStorage.getItem('token')}`, // Add the JWT
            'membershipStatus': 'ACTIVE'
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch conversations');
    }

    return await response.json(); // This will return an object with oneToOneList and groupList
}

async function subscribeToGroupTopics() {
    try {
        // Step 1: Fetch conversation list
        const conversationResponse = await getConversations();
        const groupConversations = conversationResponse.groupList;
        console.log(groupConversations);
        // Step 2: Subscribe to each group topic
        groupConversations.forEach(conversation => {
            const topic = `/topic/${conversation.conversationId}`; // Example topic format
            stompClient.subscribe(topic, (message) => {
                const messageContent = JSON.parse(message.body);
                // console.log(messageContent);
                console.log(`Received message for group ${conversation.groupName}:`, messageContent);
            });
            console.log(`Subscribed to topic: ${topic}`);
        });
    } catch (error) {
        console.error('Error subscribing to group topics:', error);
    }
}

stompClient.onConnect = (frame) => {
    setConnected(true);
    console.log('Connected: ' + frame);
    stompClient.subscribe('/user/queue/messages', (greeting) => {
        console.log("got msg", JSON.parse(greeting.body));
        appendNewMessage(JSON.parse(greeting.body).message.content);
    });
   
    stompClient.subscribe('/topic/'+ sessionStorage.getItem('id') , (notification) => {
        console.log("got notification", JSON.parse(notification.body));
        // appendNewMessage(JSON.parse(notification.body).content);
    });

    setTimeout(async () => {
        // Step 3: Subscribe to group topics
        let response = await subscribeToGroupTopics();
        // console.log(JSON.parse(response));
    }, 1000);





    console.log(sessionStorage.getItem('id'))

    stompClient.subscribe('/user/queue/notification', (notification) => {
        console.log("got msg", JSON.parse(notification.body));
        // appendNewMessage(JSON.parse(notification.body).content);
    });


    // stompClient.subscribe('/topic/'+ username, (greeting) => {
    //     var noti = JSON.parse(greeting.body);
    //     console.log("got notification", JSON.parse(greeting.body));
    //     // appendNewMessage(JSON.parse(greeting.body).content);
    // });

  
};



async function sendOneToOneMessage() {
 
    const createConversation = async (friendId) => {
        const lastActive = new Date().toISOString(); // Current time
        const requestBody = {
            friendId,
            lastActive
        };

        try {
            const response = await fetch("http://localhost:8081/api/conversation/new", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${sessionStorage.getItem('token')}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error("Failed to create conversation.");
            }

            const data = await response.json();
            return data.conversation.id; // Assuming conversationId is part of the response
        } catch (error) {
            console.error("Error creating conversation:", error);
            throw error;
        }
    };
    
    // let conversationId = $("#conversationId").val();
    // if (!conversationId || conversationId.trim() === "") {
    //     try {
    //         conversationId = await createConversation($("#userId").val());
    //         console.log("New conversation created with ID:", finalConversationId);
    //     } catch (error) {
    //         alert("Failed to create a new conversation. Please try again.");
    //         console.log(error);
    //         return;
    //     }
    // }

    const sentTime = new Date().toISOString();
    
    const chatMessage = {
        'conversationId': $("#conversationId").val(),
        'destinationId': $("#userId").val(),
        'sentTime': sentTime,
        'content': $("#messageContent").val(),
        'membershipStatus' : $("#membershipStatus").val(),
        'type': $("#type").val()
    };
    console.log(chatMessage);
    stompClient.publish({
        destination: "/app/one_to_one_chat",
        body: JSON.stringify(chatMessage)
    });
}

async function sendGroupMessage() {
    console.log("click");
    const sentTime = new Date().toISOString();
    
    const chatMessage = {
        'conversationId': $("#conversationId").val(),
        'destinationId': $("#conversationId").val(),
        'sentTime': sentTime,
        'content': $("#messageContent").val(),
        'membershipStatus' : $("#membershipStatus").val(),
        'type': $("#type").val()
    };
    console.log(chatMessage);
    stompClient.publish({
        destination: "/app/group_chat",
        body: JSON.stringify(chatMessage)
    });
}

stompClient.onWebSocketError = (error) => {
    console.error('Error with websocket', error);
};

stompClient.onStompError = (frame) => {
    console.error('Broker reported error: ' + frame.headers['message']);
    console.error('Additional details: ' + frame.body);
};

function setConnected(connected) {
    $("#connect").prop("disabled", connected);
    $("#disconnect").prop("disabled", !connected);
    if (connected) {
        $("#conversation").show();
    }
    else {
        $("#conversation").hide();
    }
    $("#greetings").html("");
}

function connect() {
    stompClient.activate();
}

function disconnect() {
    stompClient.deactivate();
    setConnected(false);
    console.log("Disconnected");
}

function sendName() {
    stompClient.publish({
        destination: "/app/hello",
        body: JSON.stringify({ 'name': $("#messageContent").val() })
    });
}

function appendNewMessage(message) {
    $("#greetings").append("<tr><td>" + message + "</td></tr>");
}

$(function () {
    $("form").on('submit', (e) => e.preventDefault());
    $("#connect").click(() => connect());
    $("#disconnect").click(() => disconnect());
    $("#send_11").click(() => sendOneToOneMessage());
    $("#send_group").click(() => sendGroupMessage());

});

