import Fastify from 'fastify';
import dotenv from 'dotenv';
import fastifyFormBody from '@fastify/formbody';
import fastifyWs from '@fastify/websocket';
import StreamManager from './services/stream.js';
import MusicManager from './services/music.js';

  
dotenv.config();
const { PORT = 5050 } = process.env;


const fastify = Fastify();
fastify.register(fastifyFormBody);
fastify.register(fastifyWs);

fastify.get('/', async (req, reply) => {
    reply.send({ message: 'OK' });
});

fastify.all('/action', async (req, reply) => {
    const response = `
        <Response action="/action">
            <Forward>1000</Forward>
        </Response>`;
    reply.type('text/xml').send(response);
});

fastify.all('/hangup', async (req, reply) => {
    const response = `
        <Response>
            <Hangup/>
        </Response>`;
    reply.type('text/xml').send(response);
});

fastify.all('/call', async (req, reply) => {
    const response = `
        <Response>
            <Connect>
                <Stream url="wss://${req.headers.host}/stream"/>
            </Connect>
        </Response>`;
    reply.type('text/xml').send(response);
});

fastify.register(async function (fastify) {
    fastify.get('/stream', { websocket: true }, (connection, req) => {
        try {
            console.log(`Got stream start`);
            const stream = new StreamManager(connection);
            const music = new MusicManager();

            connection.on('message', (msg) => stream.handleMessage(msg));
            connection.on('close', () => {
                music.stopMOH();
                console.log('Client disconnected.');
            });
            music.on('media', (media) => stream.sendMedia(media));
        } catch (e) {
            console.log(`Error: ${e}`);
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
