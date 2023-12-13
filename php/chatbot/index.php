<?php

require_once '../vendor/autoload.php';
require_once '../vendor/webresponder/webresponder.php';

use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;

// Start the session
session_start();

// Constants
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MAX_MESSAGE_COUNT = 5;

// Load configuration
$config = require_once '/etc/netsapiens/chatbot_config.php';
$openai_api_key = $config['OPENAI_API_KEY'];


/**
 * Manage and retrieve session messages.
 *
 * @return array
 */
function get_session_messages(): array {
    // Initialize session if not already initialized
    if (!isset($_SESSION['messages'])) {
        $_SESSION['messages'] = [
            [
                'role' => 'system',
                'content' => 'You are a friendly assistant at the UGM event. Help a participant with their inquiries with enthusiasm and positivity. Prefer short answers. No emojis.'
            ]
        ];
    }
    return $_SESSION['messages'];
}


/**
 * Query the GPT model with the given message.
 *
 * @param string $message
 * @return string
 */
function query_gpt(string $message, string $api_key): string {

    $messages = get_session_messages();
    $messages[] = ['role' => 'user', 'content' => $message];

    // Ensure messages count doesn't exceed the maximum
    while (count($messages) > MAX_MESSAGE_COUNT) {
        array_splice($messages, 1, 2);  // Retain system message and truncate oldest pairs.
    }

    try {
        // HTTP client
        $client = new Client();

        $response = $client->post(OPENAI_URL, [
            'headers' => [
                'Authorization' => 'Bearer ' . $api_key,
                'Content-Type' => 'application/json',
            ],
            'json' => [
                'model' => 'gpt-3.5-turbo',
                'messages' => $messages
            ]
        ]);

        $data = json_decode($response->getBody(), true);
        $bot_response = $data['choices'][0]['message']['content'];

        $messages[] = ['role' => 'assistant', 'content' => $bot_response];
        $_SESSION['messages'] = $messages;

        return $bot_response;
    } catch (RequestException $e) {
        // Ideally in production we would log the error here too
        return "Sorry, I am facing some issues right now. Please try again later.";
    }
}

if (in_array($_SERVER['REQUEST_METHOD'], ['GET', 'POST'])) {

    if (isset($_REQUEST['SpeechResult'])) {
        // We have a transciption, so query the GPT model
        $say = query_gpt($_REQUEST['SpeechResult'], $openai_api_key);
    } else {
        // Check if we are in the middle of a conversation based on the session
        $say = empty($_SESSION['messages'])
            ? 'Hello! how can I help you today?'                          // Starting a new conversation
            : "Sorry, I couldn't catch that. Could you please repeat?";   // In the middle of a conversation
    }

    // Build a WebResponder response
    $voiceResponse = new WebResponder();
    $gather = $voiceResponse->gather([
        'input' => 'speech',
        'action' => $_SERVER['SCRIPT_NAME'],
        'method' => 'GET',
    ]);
    $gather->say($say);

    header('Content-Type: text/xml');
    echo $voiceResponse->asXML();
}