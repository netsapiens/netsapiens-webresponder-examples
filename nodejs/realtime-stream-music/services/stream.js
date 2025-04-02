import { EventEmitter } from 'events';
import WebSocket from 'ws';

class StreamManager extends EventEmitter {
    constructor(connection) {
        super();
        this.connection = connection;
        this.stream_id = null;
        this.inactivityTimeout = setTimeout(() => {
            console.log(`Reached random closing timer`);
            this.close();
        } , 30000);
    }

    handleMessage(message) {
        try {
            const data = JSON.parse(message);
            switch (data.event) {
                case 'media':
                    this.emit('media', data.media.payload);
                    break;
                case 'start':
                    this.stream_id = data.start.stream_id;
                    console.log('Stream started:', this.stream_id);
                    break;
                default:
                    console.log('Unhandled Stream event:', data.event);
            }
        } catch (err) {
            console.error('Error handling event:', err);
        }
    }

    sendMedia(media) {
        const mediaEvent = {
            event: 'media',
            stream_id: this.stream_id,
            media: { payload: media }
        };
        this.sendEvent(mediaEvent);
    }

    interrupt() {
        const clearEvent = {
            event: 'clear',
            stream_id: this.stream_id
        };
        this.sendEvent(clearEvent);
    }


    close() {
        const clearEvent = {
            event: 'stop',
        };
        this.sendEvent(clearEvent);
    }

    sendEvent(event) {
        if (this.connection.readyState === WebSocket.OPEN) {
            this.connection.send(JSON.stringify(event));
        }
    }
}

export default StreamManager;
