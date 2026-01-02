/**
 * Audio Recorder - Intercepts Web Audio API destination to enable recording
 *
 * This module monkey-patches AudioNode.prototype.connect to route audio
 * through a master gain node that feeds both speakers and a MediaStreamDestination
 * for recording.
 */

import lamejs from "@breezystack/lamejs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ConnectFn = (destination: any, output?: number, input?: number) => any;

/**
 * Encode an AudioBuffer to MP3 format using lamejs
 */
function audioBufferToMp3(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const kbps = 128;

  // Create encoder (stereo or mono)
  const mp3encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, kbps);
  const mp3Data: ArrayBuffer[] = [];

  // Get channel data
  const left = buffer.getChannelData(0);
  const right = numChannels > 1 ? buffer.getChannelData(1) : left;

  // Convert Float32Array (-1 to 1) to Int16Array (-32768 to 32767)
  const leftInt16 = new Int16Array(left.length);
  const rightInt16 = new Int16Array(right.length);

  for (let i = 0; i < left.length; i++) {
    leftInt16[i] = Math.max(-32768, Math.min(32767, Math.floor(left[i] * 32767)));
    rightInt16[i] = Math.max(-32768, Math.min(32767, Math.floor(right[i] * 32767)));
  }

  // Encode in chunks
  const sampleBlockSize = 1152;
  for (let i = 0; i < leftInt16.length; i += sampleBlockSize) {
    const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
    const rightChunk = rightInt16.subarray(i, i + sampleBlockSize);

    const mp3buf = numChannels === 1
      ? mp3encoder.encodeBuffer(leftChunk)
      : mp3encoder.encodeBuffer(leftChunk, rightChunk);

    if (mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf).buffer);
    }
  }

  // Flush remaining data
  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) {
    mp3Data.push(new Uint8Array(mp3buf).buffer);
  }

  return new Blob(mp3Data, { type: "audio/mp3" });
}

class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordingDestination: MediaStreamAudioDestinationNode | null = null;
  private masterGain: GainNode | null = null;
  private chunks: Blob[] = [];
  private isPatched = false;
  private audioContext: AudioContext | null = null;
  private originalConnect: ConnectFn | null = null;

  /**
   * Patch AudioNode.prototype.connect to intercept connections to destination.
   * Must be called BEFORE any AudioContext is created.
   */
  patchAudioContext() {
    if (this.isPatched || typeof window === "undefined") return;

    // Store original connect method
    const originalConnect = AudioNode.prototype.connect as ConnectFn;
    this.originalConnect = originalConnect;
    const recorder = this;

    // Override connect to intercept destination connections
    AudioNode.prototype.connect = function (
      this: AudioNode,
      destination: AudioNode | AudioParam,
      outputIndex?: number,
      inputIndex?: number
    ) {
      // Auto-initialize recorder on first connection to destination
      if (destination instanceof AudioDestinationNode) {
        const ctx = (destination as AudioDestinationNode).context as AudioContext;
        if (!recorder.masterGain && ctx) {
          recorder.init(ctx);
        }
        if (recorder.masterGain) {
          return originalConnect.call(this, recorder.masterGain, outputIndex, inputIndex);
        }
      }

      // Normal connection
      return originalConnect.call(this, destination, outputIndex, inputIndex);
    } as AudioNode["connect"];

    this.isPatched = true;
  }

  /**
   * Initialize the recording chain for a given AudioContext.
   * Call this after the AudioContext is created but before audio starts playing.
   */
  init(audioContext: AudioContext) {
    if (this.audioContext === audioContext) return; // Already initialized

    this.audioContext = audioContext;
    this.recordingDestination = audioContext.createMediaStreamDestination();
    this.masterGain = audioContext.createGain();
    this.masterGain.gain.value = 1;

    // Route master gain to both speakers and recording destination
    // Use original connect to avoid recursion
    if (this.originalConnect) {
      this.originalConnect.call(this.masterGain, audioContext.destination);
      this.originalConnect.call(this.masterGain, this.recordingDestination);
    }
  }

  /**
   * Check if recorder is initialized and ready
   */
  isReady(): boolean {
    return this.recordingDestination !== null && this.masterGain !== null;
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.mediaRecorder?.state === "recording";
  }

  /**
   * Start recording audio
   */
  private startRecording() {
    if (!this.recordingDestination) {
      throw new Error("Audio recorder not initialized. Play audio first.");
    }

    if (this.isRecording()) {
      return; // Already recording
    }

    this.chunks = [];
    this.mediaRecorder = new MediaRecorder(this.recordingDestination.stream, {
      mimeType: "audio/webm;codecs=opus",
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };

    this.mediaRecorder.start(100); // Collect data every 100ms
  }

  /**
   * Stop recording and return the recorded audio as an AudioBuffer
   */
  private async stopRecording(): Promise<AudioBuffer> {
    if (!this.mediaRecorder) {
      throw new Error("No recording in progress");
    }

    if (!this.audioContext) {
      throw new Error("Audio context not available");
    }

    // Wait for MediaRecorder to stop and get webm blob
    const webmBlob = await new Promise<Blob>((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error("No recording in progress"));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: "audio/webm" });
        this.chunks = [];
        resolve(blob);
      };

      this.mediaRecorder.onerror = (event) => {
        reject(new Error(`Recording error: ${event}`));
      };

      this.mediaRecorder.stop();
    });

    // Decode webm to AudioBuffer
    const arrayBuffer = await webmBlob.arrayBuffer();
    return this.audioContext.decodeAudioData(arrayBuffer);
  }

  /**
   * Record for a specific duration and return MP3 blob
   */
  async recordDuration(durationSeconds: number): Promise<Blob> {
    if (!this.isReady()) {
      throw new Error("Audio recorder not initialized. Play audio first.");
    }

    // Start recording
    this.startRecording();

    // Wait for the specified duration
    await new Promise((resolve) => setTimeout(resolve, durationSeconds * 1000));

    // Stop and get AudioBuffer
    const audioBuffer = await this.stopRecording();

    // Convert to MP3
    return audioBufferToMp3(audioBuffer);
  }
}

// Singleton instance
export const audioRecorder = new AudioRecorder();
