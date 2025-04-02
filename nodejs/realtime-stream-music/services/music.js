import { EventEmitter } from 'events';
import fs from 'fs';

const DEFAULT_FILE_PATH = 'music.wav';
const CHUNK_SIZE = 320; // Number of bytes per chunk
const CHUNK_DELAY_MS = 20; // Delay between chunk emissions
const MIN_BUFFER_CHUNKS = 400;
const MAX_BUFFER_CHUNKS = 1200;

class MusicManager extends EventEmitter {
    constructor(filePath = DEFAULT_FILE_PATH) {
        super();
        this.filePath = filePath;
        this.isPlaying = false;
        this.chunkBuffer = [];
        this.readStream = null;
        this.dataStartOffset = 0;

        // Start playback immediately
        this.startMOH();
    }

    /**
     * Starts the music on hold (MOH) playback if not already playing.
     */
    async startMOH() {
        if (this.isPlaying) return;
        this.isPlaying = true;

        try {
            this.dataStartOffset = await this.findDataChunkOffset(this.filePath);
        } catch (err) {
            console.error('Error finding data chunk offset:', err);
            this.isPlaying = false;
            return;
        }

        this.initializeStream();
        this.scheduleNextChunk();
    }

    /**
     * Reads the WAV file headers to find where the 'data' chunk begins.
     */
    async findDataChunkOffset(filePath) {
        return new Promise((resolve, reject) => {
            fs.open(filePath, 'r', (err, fd) => {
                if (err) return reject(err);

                // We’ll read in chunks. The header should be found early on.
                const headerBuffer = Buffer.alloc(1024);
                fs.read(fd, headerBuffer, 0, 1024, 0, (err, bytesRead) => {
                    if (err) {
                        fs.close(fd, () => {});
                        return reject(err);
                    }

                    if (bytesRead < 44) {
                        fs.close(fd, () => {});
                        return reject(new Error('File too small to be a valid WAV.'));
                    }

                    // Check RIFF/WAVE headers
                    if (headerBuffer.toString('ascii', 0, 4) !== 'RIFF' ||
                        headerBuffer.toString('ascii', 8, 12) !== 'WAVE') {
                        fs.close(fd, () => {});
                        return reject(new Error('Not a valid WAV file.'));
                    }

                    // Now, iterate through the sub-chunks until we find 'data'
                    let offset = 12; // After RIFF/WAVE headers
                    while (offset < bytesRead) {
                        const chunkId = headerBuffer.toString('ascii', offset, offset + 4);
                        const chunkSize = headerBuffer.readUInt32LE(offset + 4);

                        if (chunkId === 'data') {
                            // data starts after the 8-byte chunk header
                            const dataOffset = offset + 8;
                            fs.close(fd, () => {});
                            return resolve(dataOffset);
                        }

                        // Move to the next chunk: 4-byte id + 4-byte size + chunkSize bytes
                        offset += 8 + chunkSize;

                        // If we haven't found 'data' and reached the end of our buffer read,
                        // we may need to read more. But for simplicity, we assume header fits
                        // in 1024 bytes. If not, a more robust approach would handle larger headers.
                        if (offset >= bytesRead) {
                            fs.close(fd, () => {});
                            return reject(new Error('Could not find data chunk in the first 1024 bytes.'));
                        }
                    }

                    fs.close(fd, () => {});
                    return reject(new Error('data chunk not found.'));
                });
            });
        });
    }

    /**
     * Initializes the file read stream. Sets up event handlers for data,
     * end, and error. If the file ends, playback restarts automatically.
     */
    initializeStream() {
        // Cleanup previous stream if any
        this.cleanupReadStream();

        // Attempt to create a new read stream from the data offset
        try {
            this.readStream = fs.createReadStream(this.filePath, {
                start: this.dataStartOffset,
                highWaterMark: CHUNK_SIZE
            });
        } catch (err) {
            console.error('Error creating read stream:', err);
            this.stopMOH();
            return;
        }

        this.readStream.on('data', (chunk) => this.handleData(chunk));
        this.readStream.on('end', () => this.handleEnd());
        this.readStream.on('error', (err) => this.handleError(err));
    }

    /**
     * Handles incoming data chunks from the read stream.
     * Buffers them, and pauses reading if the buffer is full.
     */
    handleData(chunk) {
        this.chunkBuffer.push(chunk);

        // If buffer exceeds maximum, pause reading until we consume enough
        if (this.chunkBuffer.length >= MAX_BUFFER_CHUNKS) {
            this.pauseReading();
        }
    }

    /**
     * Handles the 'end' event of the read stream. 
     * If still playing, re-initialize the stream to loop the MOH file.
     */
    handleEnd() {
        console.log('MOH file finished reading, restarting...');
        if (this.isPlaying) {
            // Restart from the beginning of data chunk
            this.initializeStream();
        }
    }

    /**
     * Handles errors that occur while reading the file. Stops playback.
     */
    handleError(err) {
        console.error('Error reading MOH file:', err);
        this.stopMOH();
    }

    /**
     * Schedules the emission of the next chunk after a delay.
     * Uses setTimeout to simulate chunk-by-chunk playback.
     */
    scheduleNextChunk() {
        if (!this.isPlaying) return;

        setTimeout(() => {
            this.playNextChunk();
        }, CHUNK_DELAY_MS);
    }

    /**
     * Plays the next chunk in the buffer if available. If the buffer is empty,
     * waits and tries again. If buffer is low, attempts to resume reading.
     */
    playNextChunk() {
        if (!this.isPlaying) return;

        if (this.chunkBuffer.length === 0) {
            // No data yet, try again after a delay
            return this.scheduleNextChunk();
        }

        const chunk = this.chunkBuffer.shift();
        // Emit the chunk as a base64 string
        this.emit('media', chunk.toString('base64'));

        // If we've drained the buffer enough, resume reading
        if (this.chunkBuffer.length < MIN_BUFFER_CHUNKS && this.readStream && this.readStream.isPaused()) {
            this.resumeReading();
        }

        // Schedule next chunk
        this.scheduleNextChunk();
    }

    /**
     * Pauses reading from the file to prevent excessive buffering.
     */
    pauseReading() {
        if (this.readStream && !this.readStream.isPaused()) {
            console.log('Buffer full, pausing read stream.');
            this.readStream.pause();
        }
    }

    /**
     * Resumes reading from the file if it was previously paused.
     */
    resumeReading() {
        if (this.readStream && this.readStream.isPaused()) {
            console.log('Buffer low, resuming read stream.');
            this.readStream.resume();
        }
    }

    /**
     * Stops the music on hold playback. Cleans up the read stream and buffer.
     */
    stopMOH() {
        this.isPlaying = false;
        this.cleanupReadStream();
        this.chunkBuffer = [];
    }

    /**
     * Destroys and nullifies the current read stream if it exists.
     */
    cleanupReadStream() {
        if (this.readStream) {
            this.readStream.destroy();
            this.readStream = null;
        }
    }
}

export default MusicManager;
