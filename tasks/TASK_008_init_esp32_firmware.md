# TASK-008: Initialize ESP32 Firmware

## Task Information

- **ID**: T008
- **Phase**: 1 - Foundation
- **Priority**: High
- **Estimated Hours**: 2h
- **Dependencies**: None (parallel task)

---

## Objective

Khởi tạo PlatformIO project cho ESP32 firmware với cấu trúc cơ bản.

---

## Acceptance Criteria

- [ ] PlatformIO project configured
- [ ] Basic WiFi connection code
- [ ] LED blink test working
- [ ] Firmware compiles successfully

---

## Instructions

### Step 1: Create PlatformIO Project Structure

```
packages/esp32-firmware/
├── src/
│   ├── main.cpp
│   ├── config.h
│   ├── wifi/
│   │   ├── wifi_manager.cpp
│   │   └── wifi_manager.h
│   ├── audio/
│   │   ├── i2s_audio.cpp
│   │   ├── i2s_audio.h
│   │   └── audio_buffer.h
│   ├── network/
│   │   ├── websocket_client.cpp
│   │   └── websocket_client.h
│   └── utils/
│       ├── led_indicator.cpp
│       └── led_indicator.h
├── lib/
│   └── README.md
├── include/
│   └── README.md
├── test/
│   └── README.md
├── platformio.ini
└── README.md
```

### Step 2: Create platformio.ini

```ini
; PlatformIO Project Configuration File
; https://docs.platformio.org/page/projectconf.html

[env]
platform = espressif32
framework = arduino
monitor_speed = 115200
upload_speed = 921600
lib_deps =
    WiFi
    WebSockets
    ArduinoJson@^7.0.0

[env:esp32dev]
board = esp32dev
build_flags =
    -DCORE_DEBUG_LEVEL=3
    -DBOARD_HAS_PSRAM
    -mfix-esp32-psram-cache-issue

[env:esp32-s3]
board = esp32-s3-devkitc-1
board_build.mcu = esp32s3
board_build.f_cpu = 240000000L
build_flags =
    -DCORE_DEBUG_LEVEL=3
    -DARDUINO_USB_CDC_ON_BOOT=1
    -DARDUINO_USB_MODE=1

[env:esp32-s3-n16r8]
board = esp32-s3-devkitc-1
board_build.mcu = esp32s3
board_build.f_cpu = 240000000L
board_build.flash_mode = qio
board_build.psram = enabled
board_upload.flash_size = 16MB
build_flags =
    -DCORE_DEBUG_LEVEL=3
    -DARDUINO_USB_CDC_ON_BOOT=1
    -DBOARD_HAS_PSRAM
```

### Step 3: Create Configuration Header

#### src/config.h

```cpp
#ifndef CONFIG_H
#define CONFIG_H

// ===================
// WiFi Configuration
// ===================
// Override these in your local config or set via build flags
#ifndef WIFI_SSID
#define WIFI_SSID "your_wifi_ssid"
#endif

#ifndef WIFI_PASSWORD
#define WIFI_PASSWORD "your_wifi_password"
#endif

// ===================
// Server Configuration
// ===================
#ifndef BRIDGE_HOST
#define BRIDGE_HOST "192.168.1.100"
#endif

#ifndef BRIDGE_PORT
#define BRIDGE_PORT 8080
#endif

#ifndef DEVICE_ID
#define DEVICE_ID "esp32-001"
#endif

// ===================
// Audio Configuration
// ===================
#define SAMPLE_RATE 16000
#define BITS_PER_SAMPLE 16
#define CHANNELS 1
#define BUFFER_SIZE 1024
#define AUDIO_CHUNK_MS 100

// I2S Pins (INMP441 Microphone)
#define I2S_MIC_WS 25
#define I2S_MIC_SD 33
#define I2S_MIC_SCK 32

// I2S Pins (MAX98357A Speaker)
#define I2S_SPK_BCLK 26
#define I2S_SPK_LRC 27
#define I2S_SPK_DOUT 14

// ===================
// LED Configuration
// ===================
#define LED_PIN 2
#define LED_BUILTIN_ACTIVE_LOW false

// ===================
// Button Configuration
// ===================
#define BUTTON_PIN 0  // BOOT button on most ESP32 boards

// ===================
// Timing Configuration
// ===================
#define RECONNECT_DELAY_MS 5000
#define HEARTBEAT_INTERVAL_MS 30000
#define WIFI_TIMEOUT_MS 30000

// ===================
// Wake Word
// ===================
#define WAKE_WORD "hey bot"
#define WAKE_WORD_SENSITIVITY 0.5

#endif // CONFIG_H
```

### Step 4: Create WiFi Manager

#### src/wifi/wifi_manager.h

```cpp
#ifndef WIFI_MANAGER_H
#define WIFI_MANAGER_H

#include <WiFi.h>
#include <functional>

namespace UEBot {
namespace WiFi {

enum class WiFiState {
    DISCONNECTED,
    CONNECTING,
    CONNECTED,
    ERROR
};

using StateCallback = std::function<void(WiFiState)>;

class WiFiManager {
public:
    WiFiManager();

    bool begin(const char* ssid, const char* password);
    void loop();

    bool isConnected() const;
    WiFiState getState() const;
    String getIP() const;
    String getMAC() const;
    int getRSSI() const;

    void setStateCallback(StateCallback callback);
    void disconnect();
    void reconnect();

private:
    const char* _ssid;
    const char* _password;
    WiFiState _state;
    StateCallback _stateCallback;
    unsigned long _lastConnectAttempt;
    int _reconnectAttempts;

    void updateState(WiFiState newState);
    void handleDisconnect();
};

} // namespace WiFi
} // namespace UEBot

#endif // WIFI_MANAGER_H
```

#### src/wifi/wifi_manager.cpp

```cpp
#include "wifi_manager.h"
#include "../config.h"

namespace UEBot {
namespace WiFi {

WiFiManager::WiFiManager()
    : _ssid(nullptr)
    , _password(nullptr)
    , _state(WiFiState::DISCONNECTED)
    , _stateCallback(nullptr)
    , _lastConnectAttempt(0)
    , _reconnectAttempts(0) {
}

bool WiFiManager::begin(const char* ssid, const char* password) {
    _ssid = ssid;
    _password = password;

    Serial.print("[WiFi] Connecting to ");
    Serial.println(ssid);

    updateState(WiFiState::CONNECTING);

    ::WiFi.mode(WIFI_STA);
    ::WiFi.begin(ssid, password);

    unsigned long startTime = millis();
    while (::WiFi.status() != WL_CONNECTED) {
        if (millis() - startTime > WIFI_TIMEOUT_MS) {
            Serial.println("\n[WiFi] Connection timeout!");
            updateState(WiFiState::ERROR);
            return false;
        }
        delay(500);
        Serial.print(".");
    }

    Serial.println();
    Serial.print("[WiFi] Connected! IP: ");
    Serial.println(::WiFi.localIP());

    updateState(WiFiState::CONNECTED);
    _reconnectAttempts = 0;
    return true;
}

void WiFiManager::loop() {
    if (_state == WiFiState::CONNECTED && ::WiFi.status() != WL_CONNECTED) {
        handleDisconnect();
    }

    if (_state == WiFiState::DISCONNECTED || _state == WiFiState::ERROR) {
        unsigned long now = millis();
        if (now - _lastConnectAttempt > RECONNECT_DELAY_MS) {
            _lastConnectAttempt = now;
            reconnect();
        }
    }
}

bool WiFiManager::isConnected() const {
    return _state == WiFiState::CONNECTED && ::WiFi.status() == WL_CONNECTED;
}

WiFiState WiFiManager::getState() const {
    return _state;
}

String WiFiManager::getIP() const {
    return ::WiFi.localIP().toString();
}

String WiFiManager::getMAC() const {
    return ::WiFi.macAddress();
}

int WiFiManager::getRSSI() const {
    return ::WiFi.RSSI();
}

void WiFiManager::setStateCallback(StateCallback callback) {
    _stateCallback = callback;
}

void WiFiManager::disconnect() {
    ::WiFi.disconnect();
    updateState(WiFiState::DISCONNECTED);
}

void WiFiManager::reconnect() {
    if (_ssid == nullptr) return;

    _reconnectAttempts++;
    Serial.printf("[WiFi] Reconnect attempt %d...\n", _reconnectAttempts);

    begin(_ssid, _password);
}

void WiFiManager::updateState(WiFiState newState) {
    if (_state != newState) {
        _state = newState;
        if (_stateCallback) {
            _stateCallback(newState);
        }
    }
}

void WiFiManager::handleDisconnect() {
    Serial.println("[WiFi] Connection lost!");
    updateState(WiFiState::DISCONNECTED);
}

} // namespace WiFi
} // namespace UEBot
```

### Step 5: Create LED Indicator

#### src/utils/led_indicator.h

```cpp
#ifndef LED_INDICATOR_H
#define LED_INDICATOR_H

#include <Arduino.h>

namespace UEBot {
namespace Utils {

enum class LEDPattern {
    OFF,
    ON,
    BLINK_SLOW,
    BLINK_FAST,
    PULSE,
    DOUBLE_BLINK
};

class LEDIndicator {
public:
    LEDIndicator(uint8_t pin, bool activeLow = false);

    void begin();
    void loop();

    void setPattern(LEDPattern pattern);
    void on();
    void off();
    void toggle();

private:
    uint8_t _pin;
    bool _activeLow;
    LEDPattern _pattern;
    bool _ledState;
    unsigned long _lastUpdate;
    int _blinkPhase;

    void applyState(bool state);
};

} // namespace Utils
} // namespace UEBot

#endif // LED_INDICATOR_H
```

#### src/utils/led_indicator.cpp

```cpp
#include "led_indicator.h"

namespace UEBot {
namespace Utils {

LEDIndicator::LEDIndicator(uint8_t pin, bool activeLow)
    : _pin(pin)
    , _activeLow(activeLow)
    , _pattern(LEDPattern::OFF)
    , _ledState(false)
    , _lastUpdate(0)
    , _blinkPhase(0) {
}

void LEDIndicator::begin() {
    pinMode(_pin, OUTPUT);
    applyState(false);
}

void LEDIndicator::loop() {
    unsigned long now = millis();

    switch (_pattern) {
        case LEDPattern::OFF:
            applyState(false);
            break;

        case LEDPattern::ON:
            applyState(true);
            break;

        case LEDPattern::BLINK_SLOW:
            if (now - _lastUpdate > 1000) {
                _lastUpdate = now;
                toggle();
            }
            break;

        case LEDPattern::BLINK_FAST:
            if (now - _lastUpdate > 200) {
                _lastUpdate = now;
                toggle();
            }
            break;

        case LEDPattern::PULSE:
            // Simple pulse using PWM would be better, but this is basic
            if (now - _lastUpdate > 50) {
                _lastUpdate = now;
                toggle();
            }
            break;

        case LEDPattern::DOUBLE_BLINK:
            if (now - _lastUpdate > (_blinkPhase < 4 ? 100 : 500)) {
                _lastUpdate = now;
                toggle();
                _blinkPhase = (_blinkPhase + 1) % 6;
            }
            break;
    }
}

void LEDIndicator::setPattern(LEDPattern pattern) {
    _pattern = pattern;
    _lastUpdate = 0;
    _blinkPhase = 0;
}

void LEDIndicator::on() {
    _pattern = LEDPattern::ON;
    applyState(true);
}

void LEDIndicator::off() {
    _pattern = LEDPattern::OFF;
    applyState(false);
}

void LEDIndicator::toggle() {
    _ledState = !_ledState;
    applyState(_ledState);
}

void LEDIndicator::applyState(bool state) {
    _ledState = state;
    digitalWrite(_pin, _activeLow ? !state : state);
}

} // namespace Utils
} // namespace UEBot
```

### Step 6: Create Main Entry Point

#### src/main.cpp

```cpp
#include <Arduino.h>
#include "config.h"
#include "wifi/wifi_manager.h"
#include "utils/led_indicator.h"

// Global instances
UEBot::WiFi::WiFiManager wifiManager;
UEBot::Utils::LEDIndicator led(LED_PIN, LED_BUILTIN_ACTIVE_LOW);

// State
bool isConnectedToServer = false;

void onWiFiStateChange(UEBot::WiFi::WiFiState state) {
    switch (state) {
        case UEBot::WiFi::WiFiState::CONNECTING:
            Serial.println("[Main] WiFi connecting...");
            led.setPattern(UEBot::Utils::LEDPattern::BLINK_FAST);
            break;

        case UEBot::WiFi::WiFiState::CONNECTED:
            Serial.println("[Main] WiFi connected!");
            led.setPattern(UEBot::Utils::LEDPattern::ON);
            break;

        case UEBot::WiFi::WiFiState::DISCONNECTED:
            Serial.println("[Main] WiFi disconnected");
            led.setPattern(UEBot::Utils::LEDPattern::BLINK_SLOW);
            break;

        case UEBot::WiFi::WiFiState::ERROR:
            Serial.println("[Main] WiFi error!");
            led.setPattern(UEBot::Utils::LEDPattern::DOUBLE_BLINK);
            break;
    }
}

void setup() {
    // Initialize Serial
    Serial.begin(115200);
    delay(1000);

    Serial.println();
    Serial.println("==========================");
    Serial.println("  UE-Bot ESP32 Firmware");
    Serial.println("==========================");
    Serial.printf("Device ID: %s\n", DEVICE_ID);
    Serial.printf("Version: 0.1.0\n");
    Serial.println();

    // Initialize LED
    led.begin();
    led.setPattern(UEBot::Utils::LEDPattern::BLINK_SLOW);

    // Initialize WiFi
    wifiManager.setStateCallback(onWiFiStateChange);
    if (!wifiManager.begin(WIFI_SSID, WIFI_PASSWORD)) {
        Serial.println("[Main] WiFi initialization failed!");
    }

    // Print device info
    Serial.println();
    Serial.println("[Main] Device Info:");
    Serial.printf("  MAC: %s\n", wifiManager.getMAC().c_str());
    Serial.printf("  IP: %s\n", wifiManager.getIP().c_str());
    Serial.printf("  RSSI: %d dBm\n", wifiManager.getRSSI());
    Serial.println();

    Serial.println("[Main] Setup complete!");
}

void loop() {
    // Update WiFi manager
    wifiManager.loop();

    // Update LED
    led.loop();

    // TODO: Add WebSocket connection
    // TODO: Add audio capture
    // TODO: Add wake word detection

    // Small delay to prevent watchdog issues
    delay(10);
}
```

### Step 7: Create README.md

````markdown
# UE-Bot ESP32 Firmware

Firmware for ESP32 voice control module.

## Features

- WiFi connectivity with auto-reconnect
- WebSocket communication with bridge service
- I2S audio capture (INMP441)
- I2S audio playback (MAX98357A)
- Wake word detection
- LED status indicators

## Hardware Requirements

- ESP32 DevKit or ESP32-S3
- INMP441 I2S Microphone
- MAX98357A I2S DAC + Speaker
- Optional: External button

## Pin Configuration

### INMP441 Microphone

| INMP441 | ESP32  |
| ------- | ------ |
| VDD     | 3.3V   |
| GND     | GND    |
| SD      | GPIO33 |
| WS      | GPIO25 |
| SCK     | GPIO32 |

### MAX98357A Speaker

| MAX98357A | ESP32  |
| --------- | ------ |
| VIN       | 5V     |
| GND       | GND    |
| DIN       | GPIO14 |
| BCLK      | GPIO26 |
| LRC       | GPIO27 |

## Building

```bash
# Using PlatformIO CLI
pio run

# Build for specific board
pio run -e esp32-s3

# Upload to device
pio run -t upload

# Monitor serial
pio device monitor
```
````

## Configuration

Edit `src/config.h` or use build flags:

```ini
build_flags =
    -DWIFI_SSID=\"YourSSID\"
    -DWIFI_PASSWORD=\"YourPassword\"
    -DBRIDGE_HOST=\"192.168.1.100\"
```

## Development

1. Install PlatformIO
2. Clone repository
3. Open in VSCode with PlatformIO extension
4. Configure WiFi credentials
5. Build and upload

````

---

## Verification Checklist
- [ ] PlatformIO project compiles without errors
- [ ] WiFi connects successfully
- [ ] LED blinks to indicate status
- [ ] Serial output shows device info
- [ ] Can upload to ESP32 hardware (if available)

---

## Git Commit
```bash
git add .
git commit -m "feat(esp32): initialize PlatformIO firmware project [T008]"
git push
````

---

## Notes

- ESP32-S3 recommended cho tốc độ audio tốt hơn
- PSRAM enabled cho audio buffer lớn
- Config.h chứa tất cả cấu hình
- Hardware pins có thể thay đổi theo board
