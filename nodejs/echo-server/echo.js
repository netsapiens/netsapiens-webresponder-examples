class EchoHandler {
    constructor(connection) {
      this.connection = connection;
      this.streamSid = null;
  
      connection.on('message', this.processMessage.bind(this));
      connection.on('close', this.close.bind(this));
    }
  
    processMessage(message) {
      if (message.type === 'utf8') {
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
          case 'mark':
            this.handleMark(data);
            break;
          case 'close':
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
      this.streamSid = data.streamSid;
    }
  
    echoMedia(data) {
      this.sendMessage(data);
    }
  
    handleMark(data) {
      console.log('Mark event received:', data);
    }
  
    sendMessage(message) {
      const messageJSON = JSON.stringify(message);
      this.connection.sendUTF(messageJSON);
    }
  
    close() {
      console.log('Server: Closed');
    }
  }
  
  module.exports = EchoHandler;
  