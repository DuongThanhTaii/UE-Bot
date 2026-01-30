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
