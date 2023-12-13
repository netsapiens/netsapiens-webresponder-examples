# Chatbot Assistant

This sample provides a voice-based chatbot assistant that showcases the WebResponder "Gather" and "Say" verbs, in addition to OpenAI integration.
This README will guide you through the setup process.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Script](#running-the-script)

## Prerequisites

- PHP >= 7.4 (with `session` extension enabled)

## Installation

1. **Clone the Repository**

git clone https://github.com/netsapiens/netsapiens-webresponder-examples.git
cd netsapiens-webresponder-examples

2. **Configuration**

2.1 **Config File Creation**

Copy the sample configuration file provided and create your own:

```
cp php/chatbot/sample_config.php /etc/netsapiens/chatbot_config.php

```

2.2 **Edit the Config File**

Open the file `/etc/netsapiens/chatbot_config.php` in your favorite editor and update it with the necessary details:


```php
<?php
return [
    'OPENAI_API_KEY' => 'YOUR_OPENAI_API_KEY_HERE',
    // ... any other configuration values you might have
];
```

3. **Running**

After the setup, you can run the script with your webserver or integrate it into your existing PHP project.

