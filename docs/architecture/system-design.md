# System Design Document

## 1. Webapp (packages/webapp)

### Purpose

Web-based control panel và chat interface cho UE-Bot.

### Technology Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: TailwindCSS, Shadcn/UI
- **State**: Zustand
- **Data Fetching**: TanStack Query
- **Real-time**: WebSocket via Socket.io-client

### Key Features

- Dashboard với system status
- Chat interface với AI
- Device management (ESP32)
- Settings & configuration
- Conversation history

### Architecture

```mermaid
graph LR
    subgraph "Next.js App"
        PAGES[Pages/Routes]
        API[API Routes]
        COMP[Components]
        HOOKS[Hooks]
        STORE[State Store]
    end

    PAGES --> COMP
    PAGES --> HOOKS
    HOOKS --> STORE
    HOOKS --> API
    API --> BRIDGE[Bridge Service]
```

---

## 2. Bridge Service (packages/bridge-service)

### Purpose

Middleware service kết nối ESP32 với Moltbot, xử lý audio.

### Technology Stack

- **Runtime**: Node.js 22
- **Framework**: Express.js
- **WebSocket**: ws library
- **Audio**: node-opus, wav

### Key Features

- WebSocket server cho ESP32
- Audio stream processing
- Speech-to-Text relay (Whisper)
- Text-to-Speech relay (ElevenLabs)
- Device authentication
- Health monitoring

### Architecture

```mermaid
graph TB
    subgraph "Bridge Service"
        HTTP[HTTP Server]
        WS[WebSocket Server]
        AUTH[Auth Middleware]
        ESP_HANDLER[ESP32 Handler]
        AUDIO[Audio Processor]
        MOLTBOT_CLIENT[Moltbot Client]
    end

    ESP32[ESP32 Device] -->|WS| WS
    WS --> AUTH
    AUTH --> ESP_HANDLER
    ESP_HANDLER --> AUDIO
    AUDIO -->|STT| WHISPER[Whisper API]
    AUDIO -->|TTS| ELEVEN[ElevenLabs]
    ESP_HANDLER --> MOLTBOT_CLIENT
    MOLTBOT_CLIENT --> MOLTBOT[Moltbot]
    HTTP --> WEBAPP[Webapp]
```

### Connection Flow

```mermaid
sequenceDiagram
    participant ESP as ESP32
    participant Bridge as Bridge Service
    participant Moltbot as Moltbot

    ESP->>Bridge: WebSocket Connect
    Bridge->>ESP: Request Auth
    ESP->>Bridge: Send Device Token
    Bridge->>Bridge: Validate Token
    Bridge->>ESP: Auth Success

    loop Heartbeat
        Bridge->>ESP: Ping
        ESP->>Bridge: Pong
    end
```

---

## 3. ESP32 Firmware (packages/esp32-firmware)

### Purpose

Voice input/output hardware interface.

### Technology Stack

- **Platform**: ESP32-S3 (recommended)
- **Framework**: Arduino + PlatformIO
- **Audio**: I2S (INMP441 + MAX98357A)
- **Network**: WiFi + WebSocket

### Key Features

- WiFi connection với auto-reconnect
- WebSocket client
- I2S audio capture (16-bit, 16kHz)
- I2S audio playback
- Wake word detection (optional)
- LED status indicators

### Hardware Architecture

```
┌─────────────────────────────────────────┐
│              ESP32-S3                    │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │           I2S Bus 0              │   │
│  │  ┌─────────────┐                 │   │
│  │  │  INMP441    │ → Audio In      │   │
│  │  │  Microphone │                 │   │
│  │  └─────────────┘                 │   │
│  └──────────────────────────────────┘   │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │           I2S Bus 1              │   │
│  │  ┌─────────────┐                 │   │
│  │  │  MAX98357A  │ ← Audio Out     │   │
│  │  │  DAC+Amp    │                 │   │
│  │  └─────────────┘                 │   │
│  └──────────────────────────────────┘   │
│                                          │
│  ┌──────────┐  ┌──────────┐             │
│  │   WiFi   │  │   LED    │             │
│  └──────────┘  └──────────┘             │
└─────────────────────────────────────────┘
```

---

## 4. Moltbot Integration

### Integration Points

```mermaid
graph LR
    subgraph "UE-Bot System"
        BRIDGE[Bridge Service]
    end

    subgraph "Moltbot"
        API[HTTP API]
        CORE[AI Core]
        CHANNELS[Channel Adapters]
    end

    BRIDGE -->|HTTP| API
    API --> CORE
    CORE --> CHANNELS
```

### Communication Protocol

1. Bridge gửi text message tới Moltbot API
2. Moltbot xử lý và trả response
3. Bridge convert response thành audio (nếu cần)
4. Bridge stream audio tới ESP32

---

## 5. Security Architecture

### Authentication Flow

```mermaid
sequenceDiagram
    participant User as User
    participant Webapp as Webapp
    participant Bridge as Bridge
    participant ESP as ESP32

    User->>Webapp: Login
    Webapp->>Bridge: Authenticate
    Bridge->>Webapp: JWT Token

    User->>Webapp: Register Device
    Webapp->>Bridge: Create Device Token
    Bridge->>Webapp: Device Token
    Webapp->>User: Show QR/Token

    ESP->>Bridge: Connect + Device Token
    Bridge->>ESP: Authenticated
```

### Security Measures

- JWT for user authentication
- Device tokens for ESP32
- TLS encryption for all connections
- Rate limiting
- Input validation
- CORS configuration

---

## 6. Scalability Considerations

### Horizontal Scaling

```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼────┐        ┌─────▼────┐        ┌────▼────┐
    │ Bridge  │        │ Bridge   │        │ Bridge  │
    │   #1    │        │   #2     │        │   #3    │
    └────┬────┘        └────┬─────┘        └────┬────┘
         │                  │                   │
         └──────────────────┼───────────────────┘
                            │
                    ┌───────▼───────┐
                    │    Redis      │
                    │ (Pub/Sub)     │
                    └───────────────┘
```

### Performance Targets

- WebSocket latency: < 50ms
- Audio processing: < 200ms
- End-to-end voice: < 2s
- Concurrent ESP32 devices: 100+ per instance
