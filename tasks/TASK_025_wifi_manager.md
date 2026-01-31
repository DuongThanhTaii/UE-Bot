# Task 025: ESP32 WiFi Manager

## 📋 Task Information

| Field        | Value                       |
| ------------ | --------------------------- |
| **Task ID**  | T025                        |
| **Phase**    | Phase 3 - ESP32 Development |
| **Priority** | High                        |
| **Estimate** | 4 hours                     |
| **Status**   | 🔲 Not Started              |

---

## 🎯 Objective

Implement a robust WiFi manager for ESP32 that handles:

- WiFi connection with credentials
- Auto-reconnection on disconnect
- Captive portal for initial setup (SmartConfig)
- Connection status monitoring
- Multiple WiFi network support

---

## 📝 Requirements

### Functional Requirements

1. **WiFi Connection**
   - Connect to WiFi using SSID and password
   - Support WPA2-Personal security
   - Timeout handling (30s default)

2. **Auto-Reconnection**
   - Detect disconnection
   - Automatic reconnect attempts
   - Exponential backoff (1s, 2s, 4s, 8s, max 30s)
   - Max retry count configurable

3. **SmartConfig / Captive Portal**
   - ESP-TOUCH for initial setup
   - Web-based captive portal fallback
   - Save credentials to NVS (Non-Volatile Storage)

4. **Status Monitoring**
   - Connection state callbacks
   - RSSI (signal strength) reporting
   - IP address getter

### Technical Requirements

- Use ESP-IDF WiFi API (via Arduino framework)
- Non-blocking operations
- Event-driven architecture
- Thread-safe implementation

---

## 📁 Files to Create/Modify

```
packages/esp32-firmware/
├── src/
│   ├── wifi/
│   │   ├── wifi_manager.h
│   │   ├── wifi_manager.cpp
│   │   ├── wifi_config.h
│   │   └── smart_config.cpp
│   └── config.h (update)
├── include/
│   └── wifi_credentials.h.example
└── platformio.ini (update if needed)
```

---

## 🔧 Implementation Details

### wifi_manager.h

```cpp
#ifndef WIFI_MANAGER_H
#define WIFI_MANAGER_H

#include <Arduino.h>
#include <WiFi.h>
#include <functional>

namespace UEBot {
namespace WiFi {

enum class WiFiState {
    DISCONNECTED,
    CONNECTING,
    CONNECTED,
    RECONNECTING,
    SMART_CONFIG,
    ERROR
};

using WiFiStateCallback = std::function<void(WiFiState state)>;
using WiFiConnectedCallback = std::function<void(IPAddress ip)>;

struct WiFiConfig {
    const char* ssid;
    const char* password;
    uint32_t connectTimeout = 30000;  // ms
    uint32_t reconnectDelay = 1000;   // ms
    uint8_t maxRetries = 10;
    bool autoReconnect = true;
};

class WiFiManager {
public:
    static WiFiManager& getInstance();

    // Initialization
    bool begin(const WiFiConfig& config);
    void loop();

    // Connection
    bool connect();
    bool connect(const char* ssid, const char* password);
    void disconnect();

    // SmartConfig
    bool startSmartConfig(uint32_t timeout = 60000);
    void stopSmartConfig();

    // Status
    WiFiState getState() const { return _state; }
    bool isConnected() const { return _state == WiFiState::CONNECTED; }
    IPAddress getIP() const;
    int8_t getRSSI() const;
    String getSSID() const;
    String getMacAddress() const;

    // Callbacks
    void onStateChange(WiFiStateCallback callback);
    void onConnected(WiFiConnectedCallback callback);

    // Credentials storage
    bool saveCredentials(const char* ssid, const char* password);
    bool loadCredentials(String& ssid, String& password);
    bool clearCredentials();

private:
    WiFiManager() = default;
    ~WiFiManager() = default;
    WiFiManager(const WiFiManager&) = delete;
    WiFiManager& operator=(const WiFiManager&) = delete;

    void setState(WiFiState newState);
    void handleReconnect();
    static void wifiEventHandler(WiFiEvent_t event);

    WiFiConfig _config;
    WiFiState _state = WiFiState::DISCONNECTED;
    WiFiStateCallback _stateCallback = nullptr;
    WiFiConnectedCallback _connectedCallback = nullptr;

    uint32_t _lastReconnectAttempt = 0;
    uint32_t _reconnectDelay = 1000;
    uint8_t _retryCount = 0;
    bool _smartConfigActive = false;
};

} // namespace WiFi
} // namespace UEBot

#endif // WIFI_MANAGER_H
```

### Usage Example

```cpp
#include "wifi/wifi_manager.h"

using namespace UEBot::WiFi;

void setup() {
    Serial.begin(115200);

    WiFiManager& wifi = WiFiManager::getInstance();

    // Setup callbacks
    wifi.onStateChange([](WiFiState state) {
        switch (state) {
            case WiFiState::CONNECTING:
                Serial.println("Connecting to WiFi...");
                break;
            case WiFiState::CONNECTED:
                Serial.println("WiFi Connected!");
                break;
            case WiFiState::DISCONNECTED:
                Serial.println("WiFi Disconnected");
                break;
            case WiFiState::RECONNECTING:
                Serial.println("Reconnecting...");
                break;
        }
    });

    wifi.onConnected([](IPAddress ip) {
        Serial.print("IP Address: ");
        Serial.println(ip);
    });

    // Try to load saved credentials
    String ssid, password;
    if (wifi.loadCredentials(ssid, password)) {
        WiFiConfig config = {
            .ssid = ssid.c_str(),
            .password = password.c_str()
        };
        wifi.begin(config);
    } else {
        // Start SmartConfig
        wifi.startSmartConfig();
    }
}

void loop() {
    WiFiManager::getInstance().loop();
}
```

---

## ✅ Acceptance Criteria

- [ ] WiFi connects successfully with valid credentials
- [ ] Auto-reconnects when connection is lost
- [ ] SmartConfig works for initial setup
- [ ] Credentials saved to NVS persist across reboots
- [ ] State callbacks fire correctly
- [ ] RSSI reading is accurate
- [ ] No memory leaks or crashes
- [ ] Works with ESP32-S3

---

## 🧪 Testing

### Manual Tests

1. **Basic Connection**
   - Power on ESP32
   - Check serial output for connection status
   - Verify IP address obtained

2. **Reconnection**
   - Disconnect router temporarily
   - Verify ESP32 attempts reconnection
   - Reconnect router
   - Verify ESP32 reconnects automatically

3. **SmartConfig**
   - Clear NVS credentials
   - Reboot ESP32
   - Use ESP-TOUCH app to configure
   - Verify connection established

4. **Persistence**
   - Connect to WiFi
   - Reboot ESP32
   - Verify auto-connects without SmartConfig

---

## 📚 References

- [ESP32 WiFi API](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/network/esp_wifi.html)
- [ESP-TOUCH SmartConfig](https://www.espressif.com/en/products/software/esp-touch/overview)
- [Arduino ESP32 WiFi](https://github.com/espressif/arduino-esp32/tree/master/libraries/WiFi)

---

## 📝 Notes

- Use `Preferences` library for NVS storage
- Consider adding mDNS support for easier discovery
- LED indicator integration will be done in T031
