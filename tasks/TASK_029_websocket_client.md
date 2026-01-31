# Task 029: Create ESP32 WebSocket Client

## 📋 Task Information

| Field        | Value                       |
| ------------ | --------------------------- |
| **Task ID**  | T029                        |
| **Phase**    | Phase 3 - ESP32 Development |
| **Priority** | High                        |
| **Estimate** | 8 hours                     |
| **Status**   | 🔲 Not Started              |

---

## 🎯 Objective

Implement WebSocket client for ESP32 to communicate with Bridge Service using the protocol defined in T024.

---

## 📝 Requirements

### Protocol Support

Based on T024 ESP32 WebSocket Protocol:

**Client → Server Messages:**

- `device:register` - Register device on connect
- `audio:start` - Start audio streaming
- `audio:data` - Send audio chunk (base64)
- `audio:end` - End audio streaming
- `device:status` - Send device status

**Server → Client Messages:**

- `device:registered` - Registration confirmed
- `audio:response` - TTS audio to play
- `command:execute` - Execute command
- `error` - Error message

### Functional Requirements

1. **Connection Management**
   - Connect to Bridge Service WebSocket
   - Auto-reconnect on disconnect
   - Heartbeat/ping-pong support

2. **Device Registration**
   - Send device info on connect
   - Handle registration confirmation

3. **Audio Streaming**
   - Stream audio chunks during recording
   - Receive TTS audio responses

4. **Event Handling**
   - Parse incoming JSON messages
   - Dispatch to appropriate handlers

---

## 📁 Files to Create

```
packages/esp32-firmware/
├── src/
│   └── network/
│       ├── websocket_client.h
│       ├── websocket_client.cpp
│       └── protocol.h
├── lib/
│   └── ArduinoJson/ (dependency)
└── platformio.ini (update)
```

---

## 🔧 Implementation Details

### protocol.h

```cpp
#ifndef PROTOCOL_H
#define PROTOCOL_H

namespace UEBot {
namespace Protocol {

// Message Types
namespace MessageType {
    // Device messages
    constexpr const char* DEVICE_REGISTER = "device:register";
    constexpr const char* DEVICE_REGISTERED = "device:registered";
    constexpr const char* DEVICE_STATUS = "device:status";

    // Audio messages
    constexpr const char* AUDIO_START = "audio:start";
    constexpr const char* AUDIO_DATA = "audio:data";
    constexpr const char* AUDIO_END = "audio:end";
    constexpr const char* AUDIO_RESPONSE = "audio:response";

    // Command messages
    constexpr const char* COMMAND_EXECUTE = "command:execute";
    constexpr const char* COMMAND_RESULT = "command:result";

    // Control messages
    constexpr const char* PING = "ping";
    constexpr const char* PONG = "pong";
    constexpr const char* ERROR = "error";
}

// Device Types
namespace DeviceType {
    constexpr const char* VOICE_ASSISTANT = "voice-assistant";
    constexpr const char* SENSOR = "sensor";
    constexpr const char* ACTUATOR = "actuator";
}

// Audio Formats
namespace AudioFormat {
    constexpr const char* PCM_16K_16BIT = "pcm-16k-16bit";
    constexpr const char* WAV = "wav";
    constexpr const char* MP3 = "mp3";
}

} // namespace Protocol
} // namespace UEBot

#endif // PROTOCOL_H
```

### websocket_client.h

```cpp
#ifndef WEBSOCKET_CLIENT_H
#define WEBSOCKET_CLIENT_H

#include <Arduino.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <functional>
#include "protocol.h"

namespace UEBot {
namespace Network {

enum class WSState {
    DISCONNECTED,
    CONNECTING,
    CONNECTED,
    REGISTERED,
    ERROR
};

// Callback types
using StateCallback = std::function<void(WSState state)>;
using RegisteredCallback = std::function<void(const String& sessionId)>;
using AudioResponseCallback = std::function<void(const uint8_t* data, size_t length, const String& format)>;
using CommandCallback = std::function<void(const String& command, const JsonObject& params)>;
using ErrorCallback = std::function<void(const String& error, const String& details)>;

struct DeviceInfo {
    String deviceId;
    String deviceType = "voice-assistant";
    String firmwareVersion = "1.0.0";
    bool hasMicrophone = true;
    bool hasSpeaker = true;
};

class WebSocketClient {
public:
    static WebSocketClient& getInstance();

    // Configuration
    void configure(const String& host, uint16_t port, const String& path = "/ws");
    void setDeviceInfo(const DeviceInfo& info);

    // Connection
    bool connect();
    void disconnect();
    void loop();  // Must be called in main loop

    // Status
    WSState getState() const { return _state; }
    bool isConnected() const { return _state == WSState::CONNECTED || _state == WSState::REGISTERED; }
    bool isRegistered() const { return _state == WSState::REGISTERED; }
    String getSessionId() const { return _sessionId; }

    // Audio streaming
    bool startAudioStream(const String& format = "pcm-16k-16bit");
    bool sendAudioChunk(const uint8_t* data, size_t length);
    bool endAudioStream();
    bool isStreaming() const { return _isStreaming; }

    // Device status
    bool sendDeviceStatus(int batteryLevel, int signalStrength, bool isRecording = false);

    // Callbacks
    void onStateChange(StateCallback callback) { _stateCallback = callback; }
    void onRegistered(RegisteredCallback callback) { _registeredCallback = callback; }
    void onAudioResponse(AudioResponseCallback callback) { _audioCallback = callback; }
    void onCommand(CommandCallback callback) { _commandCallback = callback; }
    void onError(ErrorCallback callback) { _errorCallback = callback; }

private:
    WebSocketClient() = default;
    ~WebSocketClient() = default;
    WebSocketClient(const WebSocketClient&) = delete;
    WebSocketClient& operator=(const WebSocketClient&) = delete;

    void handleEvent(WStype_t type, uint8_t* payload, size_t length);
    void handleMessage(const String& message);
    void setState(WSState newState);
    void sendRegisterMessage();
    bool sendJson(JsonDocument& doc);
    String base64Encode(const uint8_t* data, size_t length);

    WebSocketsClient _ws;
    WSState _state = WSState::DISCONNECTED;

    // Configuration
    String _host;
    uint16_t _port = 3001;
    String _path = "/ws";
    DeviceInfo _deviceInfo;

    // Session
    String _sessionId;
    String _streamId;
    bool _isStreaming = false;

    // Reconnection
    uint32_t _lastReconnectAttempt = 0;
    uint32_t _reconnectDelay = 1000;
    uint8_t _reconnectAttempts = 0;
    static constexpr uint8_t MAX_RECONNECT_ATTEMPTS = 10;

    // Callbacks
    StateCallback _stateCallback = nullptr;
    RegisteredCallback _registeredCallback = nullptr;
    AudioResponseCallback _audioCallback = nullptr;
    CommandCallback _commandCallback = nullptr;
    ErrorCallback _errorCallback = nullptr;

    // Static event handler
    static void eventHandler(WStype_t type, uint8_t* payload, size_t length);
    static WebSocketClient* _instance;
};

} // namespace Network
} // namespace UEBot

#endif // WEBSOCKET_CLIENT_H
```

### websocket_client.cpp

```cpp
#include "websocket_client.h"
#include <base64.h>

namespace UEBot {
namespace Network {

WebSocketClient* WebSocketClient::_instance = nullptr;

WebSocketClient& WebSocketClient::getInstance() {
    static WebSocketClient instance;
    _instance = &instance;
    return instance;
}

void WebSocketClient::configure(const String& host, uint16_t port, const String& path) {
    _host = host;
    _port = port;
    _path = path;
}

void WebSocketClient::setDeviceInfo(const DeviceInfo& info) {
    _deviceInfo = info;
}

bool WebSocketClient::connect() {
    if (_host.isEmpty()) {
        Serial.println("WebSocket: Host not configured");
        return false;
    }

    setState(WSState::CONNECTING);

    _ws.begin(_host, _port, _path);
    _ws.onEvent(eventHandler);
    _ws.setReconnectInterval(5000);
    _ws.enableHeartbeat(15000, 3000, 2);  // ping every 15s, timeout 3s, 2 retries

    Serial.printf("WebSocket: Connecting to %s:%d%s\n", _host.c_str(), _port, _path.c_str());
    return true;
}

void WebSocketClient::disconnect() {
    _ws.disconnect();
    setState(WSState::DISCONNECTED);
    _sessionId = "";
    _isStreaming = false;
}

void WebSocketClient::loop() {
    _ws.loop();

    // Handle reconnection
    if (_state == WSState::DISCONNECTED && _reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        uint32_t now = millis();
        if (now - _lastReconnectAttempt > _reconnectDelay) {
            _lastReconnectAttempt = now;
            _reconnectAttempts++;
            _reconnectDelay = min(_reconnectDelay * 2, 30000UL);  // Exponential backoff
            connect();
        }
    }
}

void WebSocketClient::eventHandler(WStype_t type, uint8_t* payload, size_t length) {
    if (_instance) {
        _instance->handleEvent(type, payload, length);
    }
}

void WebSocketClient::handleEvent(WStype_t type, uint8_t* payload, size_t length) {
    switch (type) {
        case WStype_DISCONNECTED:
            Serial.println("WebSocket: Disconnected");
            setState(WSState::DISCONNECTED);
            _sessionId = "";
            _isStreaming = false;
            break;

        case WStype_CONNECTED:
            Serial.printf("WebSocket: Connected to %s\n", (char*)payload);
            setState(WSState::CONNECTED);
            _reconnectAttempts = 0;
            _reconnectDelay = 1000;
            sendRegisterMessage();
            break;

        case WStype_TEXT:
            handleMessage(String((char*)payload));
            break;

        case WStype_BIN:
            // Handle binary audio response
            if (_audioCallback) {
                _audioCallback(payload, length, "binary");
            }
            break;

        case WStype_PING:
            // Auto-handled by library
            break;

        case WStype_PONG:
            // Connection is alive
            break;

        case WStype_ERROR:
            Serial.println("WebSocket: Error");
            setState(WSState::ERROR);
            break;
    }
}

void WebSocketClient::handleMessage(const String& message) {
    DynamicJsonDocument doc(4096);
    DeserializationError error = deserializeJson(doc, message);

    if (error) {
        Serial.printf("WebSocket: JSON parse error: %s\n", error.c_str());
        return;
    }

    const char* type = doc["type"];
    if (!type) return;

    Serial.printf("WebSocket: Received %s\n", type);

    if (strcmp(type, Protocol::MessageType::DEVICE_REGISTERED) == 0) {
        _sessionId = doc["sessionId"].as<String>();
        setState(WSState::REGISTERED);

        if (_registeredCallback) {
            _registeredCallback(_sessionId);
        }

    } else if (strcmp(type, Protocol::MessageType::AUDIO_RESPONSE) == 0) {
        if (_audioCallback) {
            const char* audioData = doc["audio"];
            const char* format = doc["format"] | "pcm-16k-16bit";

            if (audioData) {
                // Decode base64 audio
                size_t decodedLen = base64_decode_expected_len(strlen(audioData));
                uint8_t* decoded = (uint8_t*)malloc(decodedLen);

                if (decoded) {
                    base64_decode_chars(audioData, strlen(audioData), (char*)decoded);
                    _audioCallback(decoded, decodedLen, String(format));
                    free(decoded);
                }
            }
        }

    } else if (strcmp(type, Protocol::MessageType::COMMAND_EXECUTE) == 0) {
        if (_commandCallback) {
            String command = doc["command"].as<String>();
            JsonObject params = doc["params"].as<JsonObject>();
            _commandCallback(command, params);
        }

    } else if (strcmp(type, Protocol::MessageType::ERROR) == 0) {
        if (_errorCallback) {
            String errorMsg = doc["error"].as<String>();
            String details = doc["details"] | "";
            _errorCallback(errorMsg, details);
        }
    }
}

void WebSocketClient::setState(WSState newState) {
    if (_state != newState) {
        _state = newState;
        if (_stateCallback) {
            _stateCallback(newState);
        }
    }
}

void WebSocketClient::sendRegisterMessage() {
    DynamicJsonDocument doc(512);
    doc["type"] = Protocol::MessageType::DEVICE_REGISTER;
    doc["deviceId"] = _deviceInfo.deviceId;
    doc["deviceType"] = _deviceInfo.deviceType;
    doc["firmwareVersion"] = _deviceInfo.firmwareVersion;

    JsonObject capabilities = doc.createNestedObject("capabilities");
    capabilities["microphone"] = _deviceInfo.hasMicrophone;
    capabilities["speaker"] = _deviceInfo.hasSpeaker;

    sendJson(doc);
}

bool WebSocketClient::sendJson(JsonDocument& doc) {
    String message;
    serializeJson(doc, message);
    return _ws.sendTXT(message);
}

bool WebSocketClient::startAudioStream(const String& format) {
    if (!isRegistered() || _isStreaming) {
        return false;
    }

    _streamId = String(millis());  // Simple unique ID

    DynamicJsonDocument doc(256);
    doc["type"] = Protocol::MessageType::AUDIO_START;
    doc["streamId"] = _streamId;
    doc["format"] = format;
    doc["sampleRate"] = 16000;
    doc["channels"] = 1;
    doc["bitsPerSample"] = 16;

    if (sendJson(doc)) {
        _isStreaming = true;
        return true;
    }
    return false;
}

bool WebSocketClient::sendAudioChunk(const uint8_t* data, size_t length) {
    if (!_isStreaming) {
        return false;
    }

    DynamicJsonDocument doc(length * 2 + 256);  // Base64 is ~1.33x larger
    doc["type"] = Protocol::MessageType::AUDIO_DATA;
    doc["streamId"] = _streamId;
    doc["audio"] = base64Encode(data, length);
    doc["sequence"] = millis();

    return sendJson(doc);
}

bool WebSocketClient::endAudioStream() {
    if (!_isStreaming) {
        return false;
    }

    DynamicJsonDocument doc(256);
    doc["type"] = Protocol::MessageType::AUDIO_END;
    doc["streamId"] = _streamId;

    bool sent = sendJson(doc);
    _isStreaming = false;
    _streamId = "";

    return sent;
}

bool WebSocketClient::sendDeviceStatus(int batteryLevel, int signalStrength, bool isRecording) {
    if (!isRegistered()) {
        return false;
    }

    DynamicJsonDocument doc(256);
    doc["type"] = Protocol::MessageType::DEVICE_STATUS;
    doc["batteryLevel"] = batteryLevel;
    doc["signalStrength"] = signalStrength;
    doc["isRecording"] = isRecording;
    doc["freeHeap"] = ESP.getFreeHeap();
    doc["uptime"] = millis() / 1000;

    return sendJson(doc);
}

String WebSocketClient::base64Encode(const uint8_t* data, size_t length) {
    size_t encodedLen = base64_encode_expected_len(length);
    char* encoded = (char*)malloc(encodedLen + 1);

    if (!encoded) return "";

    base64_encode_chars((const char*)data, length, encoded);
    String result(encoded);
    free(encoded);

    return result;
}

} // namespace Network
}
```

### platformio.ini updates

```ini
[env:esp32-s3-devkitc-1]
platform = espressif32
board = esp32-s3-devkitc-1
framework = arduino
monitor_speed = 115200

lib_deps =
    links2004/WebSockets@^2.4.1
    bblanchon/ArduinoJson@^7.0.0

build_flags =
    -DBOARD_HAS_PSRAM
    -DARDUINO_USB_CDC_ON_BOOT=1
```

---

## ✅ Acceptance Criteria

- [ ] Connects to Bridge Service WebSocket
- [ ] Auto-reconnects on disconnect
- [ ] Device registration works
- [ ] Audio streaming sends data correctly
- [ ] Receives and handles TTS audio
- [ ] Command handling works
- [ ] Error handling is robust
- [ ] Memory efficient (no leaks)

---

## 🧪 Testing

### Test with Mock Server

```cpp
void setup() {
    Serial.begin(115200);

    // Setup WiFi first
    // ...

    WebSocketClient& ws = WebSocketClient::getInstance();

    DeviceInfo info;
    info.deviceId = "esp32-001";
    info.firmwareVersion = "1.0.0";

    ws.setDeviceInfo(info);
    ws.configure("192.168.1.100", 3001, "/ws");

    ws.onStateChange([](WSState state) {
        Serial.printf("WS State: %d\n", (int)state);
    });

    ws.onRegistered([](const String& sessionId) {
        Serial.printf("Registered! Session: %s\n", sessionId.c_str());
    });

    ws.onAudioResponse([](const uint8_t* data, size_t len, const String& format) {
        Serial.printf("Received audio: %d bytes, format: %s\n", len, format.c_str());
        // Play audio
    });

    ws.connect();
}

void loop() {
    WebSocketClient::getInstance().loop();
}
```

---

## 📚 References

- [WebSockets Library](https://github.com/Links2004/arduinoWebSockets)
- [ArduinoJson](https://arduinojson.org/)
- T024: ESP32 WebSocket Protocol

---

## 📝 Notes

- Use TLS for production (WSS)
- Consider message queue for offline buffering
- Implement proper error recovery
