import Fastify from 'fastify';
import dotenv from 'dotenv';
import fastifyFormBody from '@fastify/formbody';
import fastifyWs from '@fastify/websocket';
import StreamManager from './services/stream.js';
import OpenAIManager from './services/openai.js';
import LocalFeedbackStorage from './services/feedback.js';
const feedbackStorage = new LocalFeedbackStorage('./feedback.xlsx');

dotenv.config();
const { PORT = 5050 } = process.env;


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
        const stream = new StreamManager(connection);
        const openai = new OpenAIManager();

        connection.on('message', (msg) => stream.handleMessage(msg));
        connection.on('close', () => {
            openai.closeConnection();
            console.log('Client disconnected.');
        });

        stream.on('media', (media) => openai.sendMedia(media));
        openai.on('media', (media) => stream.sendMedia(media));
        openai.on('input_speech_started', () => stream.interrupt());
        openai.on('function_call', (item) => {
            switch (item.name) {
                case 'collectAndSaveFeedback':
                    const result = feedbackStorage.collectAndSaveFeedback(JSON.parse(item.arguments));
                    openai.sendFunctionResult(item.call_id, result);
                default:
                    openai.sendFunctionResult(item.call_id, "Unknown tool");
            }
        });
    });
});


fastify.listen({ port: PORT }, (err) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Server is listening on port ${PORT}`);
});