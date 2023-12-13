const config = require('../config');

function initSession(req) {
    if (!req.session.messages) {
        const SYSTEM_PROMPT = config.SYSTEM_PROMPT;
        const todayDate = new Date().toISOString().split('T')[0];
        const promptWithDate = `${SYSTEM_PROMPT} Today's date is ${todayDate}.`;

        req.session.messages = [{
            role: 'system',
            content: promptWithDate,
        }];
    }

    while (req.session.messages.length > config.MAX_MESSAGE_COUNT) {
        req.session.messages.splice(1, 2);
    }
}

function getSessionMessages(req) {
    initSession(req);
    return req.session.messages;
}

function addMessageToSession(req, role, content) {
    initSession(req);
    req.session.messages.push({ role, content });
}

module.exports = {
    getSessionMessages,
    addMessageToSession
};
