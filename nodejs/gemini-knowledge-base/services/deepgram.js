import 'colors';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { Buffer } from 'node:buffer';
import EventEmitter from 'events';

import dotenv from 'dotenv';
dotenv.config();

const { DEEPGRAM_API_KEY } = process.env;

const TRANSCRIPTION_EVENT = 'transcription';
const UTTERANCE_EVENT = 'utterance';

class DeepgramSTT extends EventEmitter {
  constructor() {
    super();
    this.deepgram = createClient(DEEPGRAM_API_KEY);
    this.speechFinal = false;
    this.finalResult = '';
    this.setupDeepgramConnection();
  }

  setupDeepgramConnection() {
    this.connection = this.deepgram.listen.live({
      encoding: 'mulaw',
      sample_rate: 8000,
      model: 'nova-2',
      punctuate: true,
      interim_results: true,
      endpointing: 50,
    });

    this.connection.on(LiveTranscriptionEvents.Open, () => this.handleOpen());
    this.connection.on(LiveTranscriptionEvents.Transcript, (event) => this.handleTranscript(event));
    this.connection.on(LiveTranscriptionEvents.Error, (error) => this.handleError(error));
    this.connection.on(LiveTranscriptionEvents.Warning, (warning) => this.handleWarning(warning));
    this.connection.on(LiveTranscriptionEvents.Metadata, (metadata) => this.handleMetadata(metadata));
    this.connection.on(LiveTranscriptionEvents.Close, () => this.handleClose());
  }

  handleOpen() {
    console.log('STT -> Deepgram connection opened'.green);
  }

  handleTranscript(transcriptionEvent) {
    const alternatives = transcriptionEvent.channel?.alternatives;
    const text = alternatives ? alternatives[0]?.transcript : '';

    if (transcriptionEvent.type === 'UtteranceEnd') {
      this.handleUtteranceEnd();
      return;
    }

    if (transcriptionEvent.is_final && text.trim().length > 0) {
      this.finalResult += ` ${text}`;
      if (transcriptionEvent.speech_final) {
        this.speechFinal = true;
        this.emit(TRANSCRIPTION_EVENT, this.finalResult.trim());
        this.resetFinalResult();
      } else {
        this.speechFinal = false;
      }
    } else if (text.trim().length > 0) {
      this.emit(UTTERANCE_EVENT, text.trim());
    }
  }

  handleUtteranceEnd() {
    if (!this.speechFinal) {
      console.log(`UtteranceEnd received before speechFinal, emitting the collected text: ${this.finalResult}`.yellow);
      this.emit(TRANSCRIPTION_EVENT, this.finalResult.trim());
    } else {
      console.log('STT -> Speech was already final when UtteranceEnd received'.yellow);
    }
  }

  handleError(error) {
    console.error('STT -> Deepgram error occurred:', error.red);
    this.emit('error', error);
  }

  handleWarning(warning) {
    console.warn('STT -> Deepgram warning received:', warning.yellow);
  }

  handleMetadata(metadata) {
    console.info('STT -> Deepgram metadata received:', metadata);
  }

  handleClose() {
    console.log('STT -> Deepgram connection closed'.yellow);
    this.resetFinalResult();
  }

  resetFinalResult() {
    this.finalResult = '';
    this.speechFinal = false;
  }

  /**
   * Sends the payload to Deepgram for transcription.
   * @param {String} payload A base64 encoded MULAW/8000 audio stream
   */
  sendMedia(payload) {
    if (this.connection.getReadyState() === 1) {
      this.connection.send(Buffer.from(payload, 'base64'));
    } else {
      console.warn('STT -> Connection is not open, unable to send data'.red);
    }
  }

  closeConnection() {
    if (this.connection.readyState === WebSocket.OPEN) this.connection.close();
  }
}

export default DeepgramSTT;
