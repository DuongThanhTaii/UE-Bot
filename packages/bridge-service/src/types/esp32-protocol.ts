/**
 * ESP32 WebSocket Protocol Types
 *
 * Định nghĩa protocol giao tiếp giữa ESP32 và Bridge Service
 * Protocol sử dụng JSON cho control messages và binary cho audio data
 */

// ============ Message Types ============

/**
 * Base message structure cho tất cả WebSocket messages
 */
export interface BaseMessage {
  type: string;
  timestamp: number;
  messageId?: string;
}

// ============ Client -> Server Messages ============

/**
 * Handshake message khi ESP32 kết nối
 */
export interface HandshakeMessage extends BaseMessage {
  type: 'handshake';
  deviceId: string;
  macAddress: string;
  firmwareVersion: string;
  capabilities: DeviceCapabilities;
}

/**
 * Khả năng của device
 */
export interface DeviceCapabilities {
  hasWakeWord: boolean;
  hasSpeaker: boolean;
  hasMicrophone: boolean;
  hasLED: boolean;
  maxSampleRate: number;
  supportedFormats: AudioFormat[];
}

/**
 * Audio format được hỗ trợ
 */
export type AudioFormat = 'pcm16' | 'opus' | 'mp3';

/**
 * Audio chunk từ ESP32 (binary data với header)
 */
export interface AudioChunkMessage extends BaseMessage {
  type: 'audio_chunk';
  streamId: string;
  sequenceNumber: number;
  isFinal: boolean;
  format: AudioFormat;
  sampleRate: number;
  channels: number;
  // data là binary, gửi riêng sau JSON header
}

/**
 * Audio stream bắt đầu
 */
export interface AudioStartMessage extends BaseMessage {
  type: 'audio_start';
  streamId: string;
  format: AudioFormat;
  sampleRate: number;
  channels: number;
  reason: 'wake_word' | 'button' | 'api';
}

/**
 * Audio stream kết thúc
 */
export interface AudioEndMessage extends BaseMessage {
  type: 'audio_end';
  streamId: string;
  totalChunks: number;
  totalBytes: number;
  reason: 'silence' | 'timeout' | 'user' | 'error';
}

/**
 * Status update từ device
 */
export interface StatusMessage extends BaseMessage {
  type: 'status';
  status: 'idle' | 'listening' | 'processing' | 'speaking' | 'error';
  batteryLevel?: number;
  wifiStrength?: number;
  freeMemory?: number;
  uptime?: number;
}

/**
 * Pong response
 */
export interface PongMessage extends BaseMessage {
  type: 'pong';
}

/**
 * Error từ device
 */
export interface ErrorMessage extends BaseMessage {
  type: 'error';
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============ Server -> Client Messages ============

/**
 * Handshake acknowledgement
 */
export interface HandshakeAckMessage extends BaseMessage {
  type: 'handshake_ack';
  success: boolean;
  sessionId: string;
  serverTime: number;
  config?: Partial<DeviceConfigMessage>;
}

/**
 * Ping request
 */
export interface PingMessage extends BaseMessage {
  type: 'ping';
}

/**
 * Config update cho device
 */
export interface DeviceConfigMessage extends BaseMessage {
  type: 'config';
  wakeWord?: string;
  language?: string;
  volume?: number;
  sensitivity?: number;
  ledEnabled?: boolean;
  vadThreshold?: number;
  silenceTimeout?: number;
}

/**
 * Command từ server
 */
export interface CommandMessage extends BaseMessage {
  type: 'command';
  command: DeviceCommandType;
  payload?: Record<string, unknown>;
}

export type DeviceCommandType =
  | 'start_listening'
  | 'stop_listening'
  | 'play_audio'
  | 'stop_audio'
  | 'restart'
  | 'ota_update'
  | 'factory_reset'
  | 'led_control';

/**
 * Audio playback từ server (TTS response)
 */
export interface AudioPlayMessage extends BaseMessage {
  type: 'audio_play';
  streamId: string;
  format: AudioFormat;
  sampleRate: number;
  channels: number;
  totalChunks: number;
  totalBytes: number;
}

/**
 * Audio chunk từ server
 */
export interface AudioPlayChunkMessage extends BaseMessage {
  type: 'audio_play_chunk';
  streamId: string;
  sequenceNumber: number;
  isFinal: boolean;
  // data là binary, gửi riêng
}

/**
 * Text response (có thể hiển thị trên LED matrix nếu có)
 */
export interface TextResponseMessage extends BaseMessage {
  type: 'text_response';
  text: string;
  isPartial: boolean;
  sessionId?: string;
}

// ============ Union Types ============

export type ClientMessage =
  | HandshakeMessage
  | AudioStartMessage
  | AudioChunkMessage
  | AudioEndMessage
  | StatusMessage
  | PongMessage
  | ErrorMessage;

export type ServerMessage =
  | HandshakeAckMessage
  | PingMessage
  | DeviceConfigMessage
  | CommandMessage
  | AudioPlayMessage
  | AudioPlayChunkMessage
  | TextResponseMessage
  | ErrorMessage;

export type ESP32Message = ClientMessage | ServerMessage;

// ============ Stream Management ============

/**
 * Trạng thái của một audio stream
 */
export interface AudioStreamState {
  streamId: string;
  deviceId: string;
  format: AudioFormat;
  sampleRate: number;
  channels: number;
  startTime: number;
  endTime?: number;
  chunks: number;
  bytes: number;
  status: 'active' | 'completed' | 'error' | 'cancelled';
}

// ============ Event Types ============

export interface ESP32Event {
  type: ESP32EventType;
  deviceId: string;
  timestamp: number;
  data?: unknown;
}

export type ESP32EventType =
  | 'device:connected'
  | 'device:disconnected'
  | 'device:error'
  | 'device:status'
  | 'audio:start'
  | 'audio:chunk'
  | 'audio:end'
  | 'audio:transcription'
  | 'tts:start'
  | 'tts:end';

// ============ Binary Protocol ============

/**
 * Binary message header (8 bytes)
 * - 2 bytes: magic number (0xE5 0x32 = "ES32")
 * - 2 bytes: message type
 * - 4 bytes: payload length
 */
export interface BinaryHeader {
  magic: number; // 0xE532
  type: BinaryMessageType;
  length: number;
}

export enum BinaryMessageType {
  AUDIO_DATA = 0x01,
  AUDIO_PLAY_DATA = 0x02,
}

export const BINARY_MAGIC = 0xe532;
export const BINARY_HEADER_SIZE = 8;
