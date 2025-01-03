import { Client } from '@stomp/stompjs';

let stompClient = null; // Singleton instance

export function connectStompClient() {
    if (stompClient && stompClient.active) {
        console.log('STOMP client already active.');
        return stompClient;
    }

    stompClient = new Client({
        brokerURL: `ws://localhost:8081/ws`,
        connectHeaders: {
            Authorization: `Bearer ${sessionStorage.getItem('token')}`,
        },
        reconnectDelay: 5000, // Attempt reconnection every 5 seconds
        heartbeatIncoming: 4000, // Heartbeat settings
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

    stompClient.activate();
    console.log('STOMP client activated.');
    return stompClient;
}

export function sendMessage(newMessage, publishPath) {
    if (!stompClient || !stompClient.active) {
        console.error('STOMP client is not active. Unable to send message.');
        return;
    }

    stompClient.publish({
        destination: `/app/${publishPath}`,
        body: JSON.stringify(newMessage),
    });
}

export function disconnectStompClient() {
    if (stompClient && stompClient.active) {
        stompClient.deactivate();
        console.log('STOMP client deactivated.');
    } else {
        console.log('STOMP client is not active.');
    }
}
