# Data Flow Documentation

## 1. Voice Command Flow

```mermaid
sequenceDiagram
    participant User as User
    participant ESP as ESP32
    participant Bridge as Bridge Service
    participant STT as Whisper API
    participant Moltbot as Moltbot
    participant TTS as ElevenLabs

    User->>ESP: Speak command
    Note over ESP: Record audio (I2S)
    ESP->>Bridge: Stream audio chunks
    Bridge->>Bridge: Buffer audio
    Bridge->>STT: Send audio for transcription
    STT->>Bridge: Return text
    Bridge->>Moltbot: Send message
    Moltbot->>Bridge: Return response
    Bridge->>TTS: Convert to speech
    TTS->>Bridge: Return audio
    Bridge->>ESP: Stream audio
    Note over ESP: Playback (I2S)
    ESP->>User: Hear response
```

## 2. Web Chat Flow

```mermaid
sequenceDiagram
    participant User as User
    participant Webapp as Webapp
    participant Bridge as Bridge Service
    participant Moltbot as Moltbot

    User->>Webapp: Type message
    Webapp->>Bridge: POST /api/chat
    Bridge->>Moltbot: Forward message
    Moltbot->>Bridge: Return response
    Bridge->>Webapp: Return response
    Webapp->>User: Display message
```

## 3. Real-time Update Flow

```mermaid
sequenceDiagram
    participant Webapp as Webapp
    participant Bridge as Bridge Service
    participant ESP as ESP32

    Webapp->>Bridge: Connect WebSocket
    ESP->>Bridge: Connect WebSocket

    ESP->>Bridge: Status update
    Bridge->>Webapp: Broadcast status

    Webapp->>Bridge: Command to ESP
    Bridge->>ESP: Forward command
```

## 4. Audio Streaming Protocol

### ESP32 → Bridge (Voice Input)

```
┌──────────────────────────────────────────┐
│           WebSocket Message               │
├──────────────────────────────────────────┤
│ type: "audio"                            │
│ data: {                                  │
│   format: "pcm",                         │
│   sampleRate: 16000,                     │
│   bitsPerSample: 16,                     │
│   channels: 1,                           │
│   chunk: <base64 encoded audio>          │
│ }                                        │
└──────────────────────────────────────────┘
```

### Bridge → ESP32 (Voice Output)

```
┌──────────────────────────────────────────┐
│           WebSocket Message               │
├──────────────────────────────────────────┤
│ type: "audio"                            │
│ data: {                                  │
│   format: "mp3" | "pcm",                 │
│   sampleRate: 22050,                     │
│   chunk: <base64 encoded audio>,         │
│   sequence: 1,                           │
│   final: false                           │
│ }                                        │
└──────────────────────────────────────────┘
```

## 5. State Management

### Device State

```typescript
interface DeviceState {
  deviceId: string;
  status: 'online' | 'offline' | 'busy';
  lastSeen: Date;
  firmwareVersion: string;
  wifiStrength: number;
  isRecording: boolean;
  isPlaying: boolean;
}
```

### Session State

```typescript
interface SessionState {
  sessionId: string;
  userId: string;
  deviceId?: string;
  conversationHistory: Message[];
  createdAt: Date;
  lastActivity: Date;
}
```

## 6. Error Handling Flow

```mermaid
graph TD
    A[Error Occurs] --> B{Error Type}
    B -->|Network| C[Retry with backoff]
    B -->|Auth| D[Refresh token]
    B -->|Server| E[Log & notify]
    B -->|Client| F[Display error]

    C -->|Max retries| G[Disconnect]
    D -->|Failed| G
    G --> H[Reconnect flow]
```

## 7. Message Types

### WebSocket Message Format

```typescript
interface WSMessage {
  type: MessageType;
  payload: unknown;
  timestamp: number;
  messageId: string;
}

type MessageType = 'audio' | 'text' | 'command' | 'status' | 'error' | 'heartbeat';
```

### Audio Message Payload

```typescript
interface AudioPayload {
  format: 'pcm' | 'mp3' | 'wav';
  sampleRate: number;
  bitsPerSample: number;
  channels: number;
  chunk: string; // base64
  sequence?: number;
  final?: boolean;
}
```

### Command Payload

```typescript
interface CommandPayload {
  command: 'start_recording' | 'stop_recording' | 'play' | 'stop' | 'configure';
  params?: Record<string, unknown>;
}
```
