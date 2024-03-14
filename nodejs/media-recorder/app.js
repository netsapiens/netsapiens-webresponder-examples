const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const WebSocketServer = require('websocket').server;
const MediaRecorder = require('./recorder');

const app = express();
const server = http.createServer(app);

// Configuration from environment variables or defaults
const HTTP_SERVER_PORT = process.env.HTTP_SERVER_PORT || 8080;

// Handles MediaStream
const mediaws = new WebSocketServer({
  httpServer: server,
  autoAcceptConnections: false,
});

// Logging middleware for Express
app.use((req, res, next) => {
    console.log(`${new Date()} - ${req.method} - ${req.url}`);
    next();
});

app.all('/record', (req, res) => {
    // Construct the base URL from the request
    const host = req.get('host');
    const baseUrl = `wss://${host}/streams`;
  
  const xmlContent = `<?xml version="1.0" encoding="UTF-8" ?>
<Start>
  <Stream url="${baseUrl}"/>
</Start>`;
  
    res.writeHead(200, {
      'Content-Type': 'text/xml',
      'Content-Length': Buffer.byteLength(xmlContent),
    });
  
    res.end(xmlContent);
  });
  

// Setup MediaStream handling
mediaws.on('request', (request) => {
  const connection = request.accept(null, request.origin);
  new MediaRecorder(connection);
});

server.listen(HTTP_SERVER_PORT, () => {
  console.log(`Server listening on: http://localhost:${HTTP_SERVER_PORT}`);
});
