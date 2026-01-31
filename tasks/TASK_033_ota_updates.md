# Task 033: Create OTA Update System

## 📋 Task Information

| Field       | Value                        |
| ----------- | ---------------------------- |
| **Task ID** | T033                         |
| **Phase**   | Phase 3 - ESP32 Development  |
| **Priority**| Low                          |
| **Estimate**| 6 hours                      |
| **Status**  | 🔲 Not Started               |

---

## 🎯 Objective

Implement Over-The-Air (OTA) firmware update capability for ESP32.

---

## 📝 Requirements

### Update Methods

1. **Web OTA** - Upload via web interface
2. **HTTP OTA** - Download from server URL
3. **ArduinoOTA** - Update from PlatformIO/Arduino IDE

### Features

1. **Secure Updates**
   - HTTPS for downloads
   - Firmware signature verification (optional)
   - Version checking

2. **Progress Reporting**
   - Download progress
   - Flash progress
   - LED indication

3. **Rollback Protection**
   - Verify successful boot
   - Keep previous version
   - Auto-rollback on failure

---

## 📁 Files to Create

```
packages/esp32-firmware/
├── src/
│   └── update/
│       ├── ota_manager.h
│       └── ota_manager.cpp
```

---

## 🔧 Implementation Details

### ota_manager.h

```cpp
#ifndef OTA_MANAGER_H
#define OTA_MANAGER_H

#include <Arduino.h>
#include <ArduinoOTA.h>
#include <HTTPUpdate.h>
#include <functional>

namespace UEBot {
namespace Update {

enum class OTAState {
    IDLE,
    CHECKING,
    DOWNLOADING,
    UPDATING,
    REBOOTING,
    ERROR
};

using ProgressCallback = std::function<void(int progress, int total)>;
using StateCallback = std::function<void(OTAState state, const String& message)>;

struct FirmwareInfo {
    String version;
    String url;
    size_t size;
    String checksum;  // MD5
};

struct OTAConfig {
    String deviceId;
    String currentVersion;
    String updateServerUrl;      // e.g., "https://update.ue-bot.local"
    uint16_t webServerPort = 80; // For web upload
    bool enableArduinoOTA = true;
    bool enableWebOTA = true;
    bool enableAutoUpdate = false;
    uint32_t checkIntervalMs = 3600000;  // 1 hour
};

class OTAManager {
public:
    static OTAManager& getInstance();
    
    bool begin(const OTAConfig& config);
    void loop();  // Must call in main loop
    
    // Check for updates
    bool checkForUpdate();
    bool isUpdateAvailable() const { return _updateAvailable; }
    FirmwareInfo getAvailableUpdate() const { return _availableUpdate; }
    
    // Perform update
    bool startUpdate();
    bool startUpdate(const String& url);
    
    // Web OTA server
    void handleWebUpload();  // For web server route
    
    // Status
    OTAState getState() const { return _state; }
    int getProgress() const { return _progress; }
    String getCurrentVersion() const { return _config.currentVersion; }
    
    // Callbacks
    void onProgress(ProgressCallback callback) { _progressCallback = callback; }
    void onStateChange(StateCallback callback) { _stateCallback = callback; }

private:
    OTAManager() = default;
    ~OTAManager() = default;
    
    void setupArduinoOTA();
    void setupWebOTA();
    void setState(OTAState state, const String& message = "");
    bool performHTTPUpdate(const String& url);
    bool verifyChecksum(const String& expected);
    
    OTAConfig _config;
    OTAState _state = OTAState::IDLE;
    int _progress = 0;
    bool _updateAvailable = false;
    FirmwareInfo _availableUpdate;
    
    uint32_t _lastCheck = 0;
    
    ProgressCallback _progressCallback = nullptr;
    StateCallback _stateCallback = nullptr;
};

} // namespace Update
} // namespace UEBot

#endif // OTA_MANAGER_H
```

### ota_manager.cpp

```cpp
#include "ota_manager.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Update.h>
#include <esp_ota_ops.h>

namespace UEBot {
namespace Update {

OTAManager& OTAManager::getInstance() {
    static OTAManager instance;
    return instance;
}

bool OTAManager::begin(const OTAConfig& config) {
    _config = config;
    
    if (_config.enableArduinoOTA) {
        setupArduinoOTA();
    }
    
    if (_config.enableWebOTA) {
        setupWebOTA();
    }
    
    // Mark current firmware as valid
    esp_ota_mark_app_valid_cancel_rollback();
    
    Serial.printf("OTA: Initialized, current version: %s\n", _config.currentVersion.c_str());
    return true;
}

void OTAManager::loop() {
    if (_config.enableArduinoOTA) {
        ArduinoOTA.handle();
    }
    
    // Auto update check
    if (_config.enableAutoUpdate && _config.updateServerUrl.length() > 0) {
        if (millis() - _lastCheck > _config.checkIntervalMs) {
            _lastCheck = millis();
            checkForUpdate();
        }
    }
}

void OTAManager::setupArduinoOTA() {
    ArduinoOTA.setHostname(_config.deviceId.c_str());
    
    ArduinoOTA.onStart([this]() {
        String type = ArduinoOTA.getCommand() == U_FLASH ? "sketch" : "filesystem";
        setState(OTAState::UPDATING, "Starting " + type + " update");
    });
    
    ArduinoOTA.onEnd([this]() {
        setState(OTAState::REBOOTING, "Update complete, rebooting...");
    });
    
    ArduinoOTA.onProgress([this](unsigned int progress, unsigned int total) {
        _progress = progress * 100 / total;
        if (_progressCallback) {
            _progressCallback(progress, total);
        }
    });
    
    ArduinoOTA.onError([this](ota_error_t error) {
        String msg;
        switch (error) {
            case OTA_AUTH_ERROR: msg = "Auth Failed"; break;
            case OTA_BEGIN_ERROR: msg = "Begin Failed"; break;
            case OTA_CONNECT_ERROR: msg = "Connect Failed"; break;
            case OTA_RECEIVE_ERROR: msg = "Receive Failed"; break;
            case OTA_END_ERROR: msg = "End Failed"; break;
            default: msg = "Unknown Error"; break;
        }
        setState(OTAState::ERROR, msg);
    });
    
    ArduinoOTA.begin();
    Serial.println("OTA: ArduinoOTA enabled");
}

void OTAManager::setupWebOTA() {
    // Web server for upload would be configured separately
    Serial.println("OTA: WebOTA enabled on port " + String(_config.webServerPort));
}

bool OTAManager::checkForUpdate() {
    if (_config.updateServerUrl.isEmpty()) {
        return false;
    }
    
    setState(OTAState::CHECKING, "Checking for updates...");
    
    HTTPClient http;
    String url = _config.updateServerUrl + "/api/firmware/check";
    url += "?deviceId=" + _config.deviceId;
    url += "&version=" + _config.currentVersion;
    
    http.begin(url);
    int httpCode = http.GET();
    
    if (httpCode == HTTP_CODE_OK) {
        String payload = http.getString();
        DynamicJsonDocument doc(512);
        
        if (deserializeJson(doc, payload) == DeserializationError::Ok) {
            if (doc["updateAvailable"].as<bool>()) {
                _updateAvailable = true;
                _availableUpdate.version = doc["version"].as<String>();
                _availableUpdate.url = doc["url"].as<String>();
                _availableUpdate.size = doc["size"].as<size_t>();
                _availableUpdate.checksum = doc["checksum"].as<String>();
                
                setState(OTAState::IDLE, "Update available: " + _availableUpdate.version);
                Serial.printf("OTA: Update available: %s -> %s\n", 
                              _config.currentVersion.c_str(), 
                              _availableUpdate.version.c_str());
            } else {
                _updateAvailable = false;
                setState(OTAState::IDLE, "No updates available");
            }
        }
    } else {
        setState(OTAState::ERROR, "Check failed: " + String(httpCode));
    }
    
    http.end();
    return _updateAvailable;
}

bool OTAManager::startUpdate() {
    if (!_updateAvailable || _availableUpdate.url.isEmpty()) {
        setState(OTAState::ERROR, "No update available");
        return false;
    }
    return startUpdate(_availableUpdate.url);
}

bool OTAManager::startUpdate(const String& url) {
    setState(OTAState::DOWNLOADING, "Downloading firmware...");
    return performHTTPUpdate(url);
}

bool OTAManager::performHTTPUpdate(const String& url) {
    WiFiClient client;
    
    httpUpdate.setLedPin(LED_BUILTIN, LOW);
    
    httpUpdate.onStart([this]() {
        setState(OTAState::UPDATING, "Starting firmware update...");
    });
    
    httpUpdate.onEnd([this]() {
        setState(OTAState::REBOOTING, "Update complete!");
    });
    
    httpUpdate.onProgress([this](int cur, int total) {
        _progress = cur * 100 / total;
        if (_progressCallback) {
            _progressCallback(cur, total);
        }
    });
    
    httpUpdate.onError([this](int err) {
        setState(OTAState::ERROR, "Update error: " + String(err));
    });
    
    t_httpUpdate_return ret = httpUpdate.update(client, url);
    
    switch (ret) {
        case HTTP_UPDATE_FAILED:
            setState(OTAState::ERROR, httpUpdate.getLastErrorString());
            return false;
            
        case HTTP_UPDATE_NO_UPDATES:
            setState(OTAState::IDLE, "No updates");
            return false;
            
        case HTTP_UPDATE_OK:
            // Will reboot
            return true;
    }
    
    return false;
}

void OTAManager::setState(OTAState state, const String& message) {
    _state = state;
    Serial.printf("OTA: %s\n", message.c_str());
    
    if (_stateCallback) {
        _stateCallback(state, message);
    }
}

} // namespace Update
}
```

---

## ✅ Acceptance Criteria

- [ ] ArduinoOTA works from PlatformIO
- [ ] HTTP OTA downloads and installs firmware
- [ ] Progress is reported correctly
- [ ] LED indicates update state
- [ ] Rollback on failed update
- [ ] Version checking works
- [ ] Secure download (HTTPS)

---

## 🧪 Testing

```cpp
void setup() {
    Serial.begin(115200);
    WiFi.begin(ssid, password);
    // Wait for connection
    
    OTAConfig config;
    config.deviceId = "esp32-001";
    config.currentVersion = "1.0.0";
    config.updateServerUrl = "https://update.ue-bot.local";
    config.enableArduinoOTA = true;
    config.enableAutoUpdate = false;
    
    OTAManager::getInstance().begin(config);
    
    OTAManager::getInstance().onProgress([](int cur, int total) {
        Serial.printf("Update: %d%%\n", cur * 100 / total);
        LEDIndicator::getInstance().setState(LEDState::PROCESSING);
    });
    
    OTAManager::getInstance().onStateChange([](OTAState state, const String& msg) {
        Serial.printf("OTA State: %d - %s\n", (int)state, msg.c_str());
    });
}

void loop() {
    OTAManager::getInstance().loop();
}
```

### Update via PlatformIO
```bash
pio run -t upload --upload-port esp32-001.local
```

---

## 📚 References

- [ESP32 OTA Updates](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/system/ota.html)
- [ArduinoOTA Library](https://github.com/esp8266/Arduino/tree/master/libraries/ArduinoOTA)
- [HTTPUpdate](https://github.com/esp8266/Arduino/tree/master/libraries/HTTPUpdate)

---

## 📝 Notes

- Use HTTPS in production
- Consider firmware signing for security
- OTA partition scheme required in partition table
- Test rollback mechanism thoroughly
