import {Client} from '@stomp/stompjs';
import {sendGetRequest} from './HTTP';
import {MessageContext} from '../components/MessageContext';
import {useParams} from 'react-router-dom';

const stompClient = new Client({
    brokerURL: `ws://localhost:8081/ws`,
    connectHeaders: {
        Authorization: `Bearer ${sessionStorage.getItem('token')}`,
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

// Start STOMP Client
export function connectStompClient() {
    if (!stompClient.active) {
        stompClient.activate();
        // console.log('STOMP client activated.');
        return stompClient;
    } else {
        // console.log('STOMP client already active.');
    }
}

export function sendMessage(newMessage, publishPath) {
    stompClient.publish({
        destination: "/app/" + publishPath,
        body: JSON.stringify(newMessage)
    });

}

// Disconnect STOMP Client (Optional)
export function disconnectStompClient() {
    if (stompClient.active) {
        stompClient.deactivate();
        // console.log('STOMP client deactivated.');
    } else {
        // console.log('STOMP client is not active.');
    }
}
