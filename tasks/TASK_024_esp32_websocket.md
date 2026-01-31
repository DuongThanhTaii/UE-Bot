# TASK_024: ESP32 WebSocket Protocol

## Metadata

- **Phase**: 3 - Voice Integration
- **Priority**: High
- **Status**: ✅ COMPLETED
- **Dependencies**: TASK_007 (Bridge Service)
- **Completed**: 2025-01-01

## Description

Implement WebSocket protocol for ESP32 device communication with audio streaming support.

## Objectives

1. ✅ Define ESP32 protocol types (binary + JSON hybrid)
2. ✅ Create ESP32Handler with WebSocket server
3. ✅ Implement audio streaming (upload/download)
4. ✅ Create event bus for inter-service communication
5. ✅ Create mock ESP32 client for testing
6. ✅ Write unit tests

## Deliverables

### Protocol Types

- [esp32-protocol.ts](../packages/bridge-service/src/types/esp32-protocol.ts)
  - Binary protocol: magic number 0xE532, 8-byte header
  - Message types: handshake, audio_start, audio_chunk, audio_end, status, command
  - Audio format: PCM16, 16kHz, mono

### ESP32 Handler

- [esp32.handler.ts](../packages/bridge-service/src/handlers/esp32.handler.ts)
  - WebSocket connection management
  - Handshake with device capabilities
  - Audio stream management (start/chunk/end)
  - Binary message parsing
  - Ping/pong health monitoring
  - Send text response, commands, config to device
  - Audio playback to device (TTS)

### Event Bus

- [event-bus.ts](../packages/bridge-service/src/utils/event-bus.ts)
  - TypedEventEmitter for type-safe events
  - Device events: connected, disconnected, error
  - Audio events: start, chunk, end, complete
  - STT/TTS/AI events ready for integration

### Mock ESP32 Client

- [mock-esp32.ts](../packages/bridge-service/src/utils/mock-esp32.ts)
  - Simulates ESP32 device for testing
  - WebSocket connection with handshake
  - Audio streaming (from file or generated sine wave)
  - CLI interface for manual testing

### Tests

- [esp32.handler.test.ts](../packages/bridge-service/src/__tests__/esp32.handler.test.ts)
  - Connection tests (WebSocket, handshake, tracking)
  - Audio streaming tests (start, binary data, end)
  - Server message tests (text response, commands)
  - Error handling tests (invalid magic, malformed JSON)

## Test Results

```
✓ ESP32Handler (11 tests)
  ✓ Connection (4)
    ✓ should accept WebSocket connection
    ✓ should complete handshake
    ✓ should track connected device
    ✓ should remove device on disconnect
  ✓ Audio Streaming (3)
    ✓ should handle audio start message
    ✓ should handle binary audio data
    ✓ should handle audio end message
  ✓ Server Messages (2)
    ✓ should send text response
    ✓ should send command
  ✓ Error Handling (2)
    ✓ should reject invalid magic number
    ✓ should handle malformed JSON gracefully

Test Files: 1 passed (1)
Tests: 11 passed (11)
```

## Usage

### Start Bridge Service

```bash
cd packages/bridge-service
pnpm dev
```

### Run Mock ESP32 Client

```bash
cd packages/bridge-service
npx ts-node scripts/mock-esp32.ts ws://localhost:3001/ws/esp32
```

### WebSocket Protocol

**Handshake Flow:**

1. Client connects to `ws://server/ws/esp32?id=<device-id>`
2. Client sends handshake message (JSON)
3. Server responds with handshake_ack

**Audio Streaming:**

1. Client sends `audio_start` (JSON)
2. Client sends binary audio chunks (header + PCM data)
3. Client sends `audio_end` (JSON)
4. Server processes and responds with `text_response` or `audio_play`

## Next Tasks

- [ ] T025: STT Integration (Speech-to-Text with Whisper/Groq)
- [ ] T026: TTS Integration (Text-to-Speech)
- [ ] T027: AI Integration (connect audio pipeline to LLM)
- [ ] T028: ESP32 Firmware (actual device implementation)

## Notes

- Protocol designed for low-latency real-time streaming
- Binary format minimizes overhead for audio data
- EventBus allows loose coupling between services
- Mock client enables development without hardware
