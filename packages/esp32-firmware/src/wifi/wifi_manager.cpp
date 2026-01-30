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
