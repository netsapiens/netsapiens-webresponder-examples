const OpenAIApi = require('openai');
const config = require('../config.json');
const openai = new OpenAIApi({ apiKey: config.OPENAI_API_KEY });

async function queryGpt(message, messages) {
    if (!message) {
        throw new Error("Invalid message provided.");
    }

    console.log("User messages:", messages);
    console.log(`Sending to GPT: ${message}`);
    console.time("GPT Response Time");

    const stream = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: messages,
        stream: true,
    });

    let botResponse = '';
    for await (const part of stream) {
        if (part.choices[0].delta && part.choices[0].delta.content) {
            botResponse += part.choices[0].delta.content;
        }
    }

    console.timeEnd("GPT Response Time");

    return botResponse;
}

module.exports = {
    queryGpt
};
