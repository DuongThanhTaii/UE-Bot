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
