import Fastify from 'fastify';
import dotenv from 'dotenv';
import fastifyFormBody from '@fastify/formbody';
import fastifyWs from '@fastify/websocket';
import StreamManager from './services/stream.js';
import MusicManager from './services/music.js';
import NetSapiensAPI from './services/netsapiens-api.js';


dotenv.config();
const {
    PORT = 5050,
    NETSAPIENS_API_URL,
    NETSAPIENS_BEARER_TOKEN,
    NETSAPIENS_DOMAIN = '~',
    NETSAPIENS_USER = '~',
    TRANSFER_DESTINATION,
    TRANSFER_DELAY_SECONDS = '8'
} = process.env;

const transferDelayMs = parseInt(TRANSFER_DELAY_SECONDS) * 1000;

// Initialize NetSapiens API client
const nsAPI = new NetSapiensAPI({
    baseUrl: NETSAPIENS_API_URL,
    bearerToken: NETSAPIENS_BEARER_TOKEN,
    domain: NETSAPIENS_DOMAIN,
    user: NETSAPIENS_USER
});


const fastify = Fastify({
    logger: false // We'll use console.log for more control
});

// Global error handler
fastify.setErrorHandler((error, request, reply) => {
    console.error('=== Fastify Error Handler ===');
    console.error('URL:', request.url);
    console.error('Method:', request.method);
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    reply.code(error.statusCode || 500).send({
        error: error.message,
        statusCode: error.statusCode || 500
    });
});

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
    try {
        console.log('=== /call endpoint hit ===');
        console.log('Headers:', req.headers);
        console.log('Body:', req.body);
        console.log('Query:', req.query);

        // Extract call ID from query params (NetSapiens sends them as query string)
        const params = req.body || req.query;
        const origCallID = params.OrigCallID || '';

        console.log('Call initiated - OrigCallID:', origCallID);

        const response = `
        <Response>
            <Connect>
                <Stream url="wss://${req.headers.host}/stream">
                    <Parameter name="origCallID" value="${origCallID}" />
                </Stream>
            </Connect>
        </Response>`;

        console.log('Sending XML response:', response);
        reply.type('text/xml').send(response);
    } catch (error) {
        console.error('Error in /call endpoint:', error);
        console.error('Stack trace:', error.stack);
        reply.code(500).send({ error: error.message });
    }
});

fastify.register(async function (fastify) {
    fastify.get('/stream', { websocket: true }, (connection, req) => {
        try {
            console.log(`Got stream start`);
            const stream = new StreamManager(connection);
            const music = new MusicManager();

            // Handle incoming WebSocket messages
            connection.on('message', (msg) => stream.handleMessage(msg));

            // Handle stream started event - schedule the transfer after media flows
            stream.on('started', async (data) => {
                console.log('Stream established, scheduling call transfer...');

                if (!data.origCallID) {
                    console.error('No OrigCallID available for transfer');
                    return;
                }

                if (!TRANSFER_DESTINATION) {
                    console.error('TRANSFER_DESTINATION not configured in environment');
                    return;
                }

                // Wait for configured delay to let media flow stabilize before transferring
                console.log(`Transfer will occur in ${TRANSFER_DELAY_SECONDS} seconds...`);
                setTimeout(async () => {
                    try {
                        console.log('Initiating call transfer now...');
                        await nsAPI.transferCall(data.origCallID, TRANSFER_DESTINATION);
                        console.log(`Successfully transferred call ${data.origCallID} to ${TRANSFER_DESTINATION}`);
                    } catch (error) {
                        console.error('Transfer failed:', error.message);
                    }
                }, transferDelayMs);
            });

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


// Test NetSapiens API authentication before starting the server
async function startServer() {
    try {
        // Validate NetSapiens API configuration
        if (!NETSAPIENS_API_URL || !NETSAPIENS_BEARER_TOKEN) {
            console.warn('⚠ NetSapiens API not configured. Call transfer will be disabled.');
            console.warn('  Set NETSAPIENS_API_URL and NETSAPIENS_BEARER_TOKEN in .env to enable transfers.');
        } else {
            // Test authentication
            await nsAPI.testAuthentication();

            if (!TRANSFER_DESTINATION) {
                console.warn('⚠ TRANSFER_DESTINATION not set in .env. Configure it to enable automatic transfers.');
            }
        }

        // Start the Fastify server
        await fastify.listen({ port: PORT });
        console.log(`Server is listening on port ${PORT}`);
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

startServer();
