import Fastify from 'fastify';
import dotenv from 'dotenv';
import fastifyFormBody from '@fastify/formbody';
import fastifyWs from '@fastify/websocket';

import StreamManager from './services/stream.js';
import GeminiAI from './services/gemini.js';
import DeepgramSTT from './services/deepgram.js';
import ElevenLabs from './services/elevenlabs.js';

dotenv.config();
const { PORT = 5050 } = process.env;
const { GOOGLE_API_KEY } = process.env;


const geminiDocs = new GeminiAI(GOOGLE_API_KEY);
await geminiDocs.resetFiles();
const docs = await geminiDocs.uploadDocsFolder();
const cache = await geminiDocs.createCacheContext(docs);

const fastify = Fastify();
fastify.register(fastifyFormBody);
fastify.register(fastifyWs);

fastify.get('/', async (req, reply) => {
    reply.send({ message: 'OK' });
});

fastify.all('/call', async (req, reply) => {
    const response = `
        <Response>
            <Play>https://eng10-mci.netsapiens.com/Thank-you-and-goodbye.wav</Play>
            <Connect>
                <Stream url="wss://${req.headers.host}/stream"/>
            </Connect>
        </Response>`;
    reply.type('text/xml').send(response);
});

fastify.register(async function (fastify) {
    fastify.get('/stream', { websocket: true }, (connection, req) => {
        try {
        const stream = new StreamManager(connection);
        const stt = new DeepgramSTT(); 
        const llm = new GeminiAI(GOOGLE_API_KEY, cache);
        const tts = new ElevenLabs();

        connection.on('message', (msg) => stream.handleMessage(msg));
        connection.on('close', () => {
            stt.closeConnection();
            tts.closeConnection();
            console.log('Client disconnected.');
        });

        stream.on('media', (media) => stt.sendMedia(media));

        stt.on('transcription', async (transcript) => {
            console.log('Transcription event', transcript);
            let response = await llm.generateContent(transcript);
            tts.speak(response);
        });

        tts.on('media', (media) => stream.sendMedia(media));

    } catch (error) {
        console.error("Error:", error);
    }
    });
});


fastify.listen({ port: PORT }, (err) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Server is listening on port ${PORT}`);
});