/**
 * Chatbot WebResponder app
 * 
 * Provides a conversational interface using GPT and Netsapiens WebResponder.
 * Showcases the use of WebResponder's <gather> and <say> elements for interactive voice experiences.
 */

// express imports
const express = require('express');
const session = require('express-session');

// Application-specific module imports
const WebResponder = require('./modules/webresponder');
const config = require('./config.json');
const { getRandomThinkingUtterance } = require('./modules/thinking');
const { queryGpt } = require('./modules/gpt');
const promisesManager = require('./modules/promises');
const { getSessionMessages, addMessageToSession } = require('./modules/session');
const CONSTANTS = require('./modules/constants');

const app = express();
const port = config.PORT;

// Configure session middleware
app.use(session({
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
}));

// Support form-encoded POST bodies (for speech results)
app.use(express.urlencoded({ extended: true }));

// Main route for handling user interaction and generating WebResponder responses
app.all('/', async (req, res) => {
    try {
        const sessionId = req.sessionID;
        // WebResponder response builder
        const response = new WebResponder();
        const pendingPromise = promisesManager.get(sessionId);

        if (pendingPromise) {
            const assistantResponse = await pendingPromise;
            addMessageToSession(req, 'assistant', assistantResponse);
            promisesManager.remove(sessionId);
            // WebResponder Gather with a nested Say element
            response.gather({ input: "speech" }).say(assistantResponse); 
        } else {
            const userSpeech = req.method === 'POST' ? req.body.SpeechResult : req.query.SpeechResult;
            if (userSpeech) {
                // Uses WebResponder Say for faster user feedback
                // We don't want to capture user speech while waiting for GPT
                response.say(getRandomThinkingUtterance()); 
                addMessageToSession(req, 'user', userSpeech);
                // Schedule the GTP query to run asynchronously
                promisesManager.set(sessionId, queryGpt(userSpeech, getSessionMessages(req)));
            } else {
                // We don't have SpeechResult, so we're either starting a new session or the transcription failed
                const defaultPrompt = req.session.messages
                    ? CONSTANTS.REPROMPT_MESSAGE
                    : CONSTANTS.DEFAULT_GREETING;
                response.gather({ input: "speech" }).say(defaultPrompt);
            }
        }
        // Return the WebResponder response as XML
        const responseXML = CONSTANTS.XML_HEADER + response.toString();
        console.log(responseXML);
        res.set('Content-Type', 'text/xml');
        res.send(responseXML);
    } catch (error) {
        console.error("Error handling request:", error);
        res.status(500).send(CONSTANTS.INTERNAL_SERVER_ERROR);
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});