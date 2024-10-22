import WebSocket from 'ws';
import { EventEmitter } from 'events';
import dotenv from 'dotenv';

dotenv.config();

const { ELEVEN_LABS_API_KEY, VOICE_ID, ELEVEN_LABS_MODEL_ID } = process.env;

class ElevenLabs extends EventEmitter {
    constructor() {
        super();
        this.connection = this.setupElevenLabsRealtime();
    }

    setupElevenLabsRealtime() {
        const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream-input?model_id=${ELEVEN_LABS_MODEL_ID}&output_format=ulaw_8000`;
        const connection = new WebSocket(wsUrl);

        connection.on('open', () => {
            console.log('Connected to Eleven Labs.');
            this.sendInitialSettings();
        });

        connection.on('message', (data) => this.handleMessage(data));
        connection.on('error', (error) => console.error('Eleven Labs WebSocket error:', error));
        connection.on('close', (event) => console.log('Disconnected from Eleven Labs.', event));

        return connection;
    }

    sendInitialSettings() {
        const initialSettings = {
            text: " ", // Initial "beginning of stream" message
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.8,
            },
            generation_config: {
                chunk_length_schedule: [50],
            },
            xi_api_key: ELEVEN_LABS_API_KEY,
        };
        this.sendEvent(initialSettings);
    }

    speak(text) {
        const textMessage = {
            text: `${text} `,
            flush: true,
        };
        this.sendEvent(textMessage);
    }

    handleMessage(data) {
        try {
            const response = JSON.parse(data);
            if (response.audio) {
                this.emit('media', response.audio);
            }
            if (response.isFinal) {
                console.log('Audio generation complete.');
                this.emit('complete');
            }
        } catch (error) {
            console.error('Error handling Eleven Labs message:', error);
        }
    }

    sendEvent(message) {
        if (this.connection.readyState === WebSocket.OPEN) {
            this.connection.send(JSON.stringify(message));
        }
    }

    closeConnection() {
        if (this.connection.readyState === WebSocket.OPEN) {
            const endOfStream = { text: "" };
            this.sendEvent(endOfStream);
            this.connection.close();
            console.log('ElevenLabs Connection closed.');
        }
    }
}

export default ElevenLabs;
