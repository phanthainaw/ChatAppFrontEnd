const stompClient = new StompJs.Client({    
  brokerURL: `ws://localhost:8081/ws`,
  connectHeaders: {
    Authorization: `Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VybmFtZTEiLCJpYXQiOjE3MzUwMTQzNTgsImV4cCI6MTczNTEwMDc1OH0.ovcJ_oRUMtXglzaKOgCP_YldJGDRru7HDh7ucdOzAuU`,
  },
  reconnectDelay: 5000, // Attempt reconnection every 5 seconds
  heartbeatIncoming: 4000, // Heartbeat settings (optional)
  heartbeatOutgoing: 4000,
});

// Error Handling
stompClient.onWebSocketError = (error) => {
  console.error('WebSocket Error:', error);
};

stompClient.onStompError = (frame) => {
  console.error('Broker reported error: ' + frame.headers['message']);
  console.error('Additional details: ' + frame.body);
};

// On Connect
stompClient.onConnect = (frame) => {
  console.log('Connected:', frame);

  // Subscribe to user notifications
  stompClient.subscribe('/user/queue/notification', (notification) => {
    console.log('Notification received:', JSON.parse(notification.body));
  });

  // Additional group topic subscriptions (example)
  setTimeout(async () => {
    try {
      let response = await subscribeToGroupTopics();
      console.log('Group topics subscribed:', response);
    } catch (error) {
      console.error('Error subscribing to group topics:', error);
    }
  }, 1000);
};

// Message Listener Setup
console.log('???')
stompClient.activate()