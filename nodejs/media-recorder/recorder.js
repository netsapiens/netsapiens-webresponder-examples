const fs = require('fs');
const WaveFile = require('wavefile').WaveFile;

class MediaRecorder {
    constructor(connection) {
        this.connection = connection;
        this.stream_id = null;
        this.buffers = {};
        this.inactivityTimeout = null;
        this.isClosed = false;
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.connection.on('message', this.processMessage.bind(this));
        this.connection.on('close', this.close.bind(this));
        this.connection.on('error', this.handleError.bind(this));
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
                    this.recordMedia(data);
                    break;
                case 'stop':
                    console.log(data);
                    this.close();
                    break;
                default:
                    console.log('Unknown event type:', data.event);
            }
        }
    }

    handleConnected(data) {
        console.log('Connected event received:', data);
        this.resetInactivityTimer();
    }

    handleStart(data) {
        console.log('Start event received:', data);
        this.stream_id =  (data.start && data.start.stream_id) || 'defaultSid';
        this.resetInactivityTimer();
    }

    resetInactivityTimer() {
        clearTimeout(this.inactivityTimeout);
        this.inactivityTimeout = setTimeout(() => {
            console.log(`Reached inactivity timeout: Closing ${this.stream_id}`);
            this.close();
          }
          , 30000);
    }

    recordMedia(data) {
        const trackType = data.media.track || 'unknown';
        if (!this.buffers[trackType]) {
            this.buffers[trackType] = [];
        }

        const payload = Buffer.from(data.media.payload, 'base64');
        this.buffers[trackType].push(payload);
        this.resetInactivityTimer();
    }

    close() {
        if (this.isClosed) {
            return;
        }
        this.isClosed = true;
        clearTimeout(this.inactivityTimeout);
        console.log('Closing connection and saving files.');

        Object.keys(this.buffers).forEach(trackType => {
            const buffer = Buffer.concat(this.buffers[trackType]);
            const wavFile = new WaveFile();
            wavFile.fromScratch(1, 8000, '8m', buffer);
            wavFile.fromMuLaw();

            const filename = `${this.stream_id}-${trackType}.wav`;
            fs.writeFile(filename, wavFile.toBuffer(), err => {
                if (err) {
                    console.error(`Error writing WAV file for ${trackType}:`, err);
                    return;
                }
                console.log(`WAV file saved as ${filename}`);
            });
        });

    }

    handleError(error) {
      console.error('Connection error:', error);
    }
}

module.exports = MediaRecorder;
