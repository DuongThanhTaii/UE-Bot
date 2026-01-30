#ifndef CONFIG_H
#define CONFIG_H

// ===================
// WiFi Configuration
// ===================
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

#ifndef BRIDGE_PATH
#define BRIDGE_PATH "/ws/esp32"
#endif

// ===================
// Device Configuration
// ===================
#ifndef DEVICE_ID
#define DEVICE_ID "esp32-001"
#endif

#ifndef DEVICE_NAME
#define DEVICE_NAME "UE-Bot Voice Module"
#endif

// ===================
// Audio Configuration
// ===================
#define SAMPLE_RATE 16000
#define BITS_PER_SAMPLE 16
#define CHANNELS 1
#define AUDIO_BUFFER_SIZE 1024
#define DMA_BUFFER_COUNT 8
#define DMA_BUFFER_LEN 1024

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
