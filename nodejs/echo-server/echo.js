class EchoHandler {
    constructor(connection) {
      this.connection = connection;
      this.stream_id = null;
      this.isClosed = false;
      connection.on('message', this.processMessage.bind(this));
      connection.on('close', this.close.bind(this));
    }
  
    processMessage(message) {
      if (message.type === 'utf8') {
        console.log(message.utf8Data);
        const data = JSON.parse(message.utf8Data);
        switch (data.event) {
          case 'connected':
            this.handleConnected(data);
            break;
          case 'start':
            this.handleStart(data);
            break;
          case 'media':
            this.echoMedia(data);
            break;
          case 'stop':
            this.close();
            break;
          default:
            console.log('Unknown event type:', data.event);
        }
      }
    }
  
    handleConnected(data) {
      console.log('Connected event received:', data);
    }
  
    handleStart(data) {
      console.log('Start event received:', data);
      this.stream_id =  (data.start && data.start.stream_id) || 'defaultSid';
    }
  
    echoMedia(data) {
      this.sendMessage(data);
    }

    sendMessage(message) {
      const messageJSON = JSON.stringify(message);
      this.connection.sendUTF(messageJSON);
    }
  
    close() {
      if (this.isClosed) {
        return;
      }
      this.isClosed = true;
      console.log('Server: Closed');
    }
  }
  
  module.exports = EchoHandler;
  
