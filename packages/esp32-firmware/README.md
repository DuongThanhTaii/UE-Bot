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

## Project Structure

```
esp32-firmware/
├── src/
│   ├── main.cpp           # Entry point
│   ├── config.h           # Configuration
│   ├── wifi/
│   │   ├── wifi_manager.h
│   │   └── wifi_manager.cpp
│   └── utils/
│       ├── led_indicator.h
│       └── led_indicator.cpp
├── lib/                   # External libraries
├── include/               # Header files
├── test/                  # Unit tests
├── platformio.ini         # PlatformIO config
└── README.md
```

## LED Status Indicators

| Pattern      | Meaning                |
| ------------ | ---------------------- |
| Slow Blink   | Waiting / Disconnected |
| Fast Blink   | Connecting             |
| Solid On     | Connected              |
| Double Blink | Error                  |

## Notes

- ESP32-S3 recommended for better audio performance
- PSRAM enabled for larger audio buffers
- Config.h contains all configurable parameters
- Hardware pins may vary depending on board
