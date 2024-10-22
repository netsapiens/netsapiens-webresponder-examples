import WebSocket from 'ws';
import { EventEmitter } from 'events';
import dotenv from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

dotenv.config();

const { OPENAI_API_KEY, VOICE, MODEL } = process.env;

let SYSTEM_MESSAGE = process.env.SYSTEM_MESSAGE || '';
const SYSTEM_MESSAGE_PATH = path.resolve(process.cwd(), 'system_message.md');
if (existsSync(SYSTEM_MESSAGE_PATH)) {
    try {
        SYSTEM_MESSAGE = readFileSync(SYSTEM_MESSAGE_PATH, 'utf-8');
        console.log('Loaded system message from system_message.md');
    } catch (err) {
        console.error('Error reading system_message.md:', err);
    }
}


class OpenAIManager extends EventEmitter {
    constructor() {
        super();
        this.connection = this.setupOpenAIRealtime();
    }

    setupOpenAIRealtime() {
        const url = `wss://api.openai.com/v1/realtime?model=${MODEL}`;
        const connection = new WebSocket(url, {
            headers: {
                Authorization: `Bearer ${OPENAI_API_KEY}`,
                'OpenAI-Beta': 'realtime=v1'
            }
        });

        connection.on('open', () => {
            console.log('Connected to OpenAI.');
            this.sendSessionUpdate();
        });

        connection.on('message', (data) => this.handleMessage(data));
        connection.on('error', (error) => console.error('OpenAI WebSocket error:', error));
        connection.on('close', () => console.log('Disconnected from OpenAI.'));

        return connection;
    }

    sendSessionUpdate() {
        const sessionUpdate = {
            type: 'session.update',
            session: {
                turn_detection: { type: 'server_vad' },
                input_audio_format: 'g711_ulaw',
                output_audio_format: 'g711_ulaw',
                voice: VOICE,
                instructions: SYSTEM_MESSAGE,
                modalities: ['text', 'audio'],
                tools: [
                    {
                      type: 'function',
                      name: "collectAndSaveFeedback",
                      description: "Collects feedback for a session.",
                      parameters: {
                        type: "object",
                        properties: {
                          sessionTitle: {
                            type: "string",
                            description: "The title of the session to provide feedback for.",
                          },
                          rating: {
                            type: "integer",
                            description: "The rating for the session on a scale from 1 to 5.",
                            minimum: 1,
                            maximum: 5,
                          },
                          comments: {
                            type: "string",
                            description: "Additional comments about the session.",
                          },
                        },
                        required: ["sessionTitle", "rating", "comments"],
                      },
                    },
                ],
                tool_choice: 'auto',
                temperature: 0.8
            }
        };
        this.sendEvent(sessionUpdate);
    }

    handleMessage(data) {
        try {
            const response = JSON.parse(data);
            switch (response.type) {
                case 'response.audio.delta':
                    this.emit('media', response.delta);
                    break;
                case 'input_audio_buffer.speech_started':
                    this.emit('input_speech_started');
                    break;
                case 'response.output_item.done':
                    const { item } = response;
                    if (item.type === 'function_call') {
                        this.emit('function_call', item);
                    }
                    break;
                case 'error':
                    console.error("OpenAI Error: ", response);
                    break;
                default:
                    console.log('Unhandled OpenAI event:', response.type);
            }
        } catch (error) {
            console.error('Error handling OpenAI message:', error);
        }
    }

    sendFunctionResult(call_id, output) {
        console.log(`Sending Result: ${output}`);
        this.sendEvent({
            type: 'conversation.item.create',
            item: {
            type: 'function_call_output',
            call_id: call_id,
            output: JSON.stringify(output)
            }
        });
        this.sendEvent({ type: 'response.create', });
    }

    sendMedia(media) {
        const mediaEvent = {
            type: 'input_audio_buffer.append',
            audio: media
        };
        this.sendEvent(mediaEvent);
    }

    sendEvent(message) {
        if (this.connection.readyState === WebSocket.OPEN) {
            this.connection.send(JSON.stringify(message));
        }
    }

    closeConnection() {
        if (this.connection.readyState === WebSocket.OPEN) this.connection.close();
    }
}

export default OpenAIManager;
