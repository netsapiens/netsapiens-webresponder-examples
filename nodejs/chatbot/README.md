# Chatbot Assistant

This sample provides a voice-based chatbot assistant that showcases the WebResponder "Gather" and "Say" verbs, in addition to OpenAI integration.
This README will guide you through the setup process.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Script](#running-the-script)

## Prerequisites

- NodeJS 18+

## Installation

1. **Clone the Repository**

git clone https://github.com/netsapiens/netsapiens-webresponder-examples.git
cd netsapiens-webresponder-examples/nodejs/chatbot

2. **Configuration**

2.1 **Config File Creation**

Copy the sample configuration file provided and create your own:

```
cp sample_config.json config.json

```

2.2 **Edit the Config File**

Open the file `config.json` in your favorite editor and update it with the necessary details:


```js
{
    "OPENAI_API_KEY": "YOUR_OPENAI_API_KEY",
    "SYSTEM_PROMPT": "YOUR_SYSTEM_PROMPT",
    "PORT": 8052,
    "MAX_MESSAGE_COUNT": 5,
    "SESSION_SECRET": "my_session_secret"
}
```

3. **Running**

After the setup, you can run the script with `npm start` or a supervisor tool like `pm2`