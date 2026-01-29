# ESP32 Firmware

PlatformIO-based firmware for ESP32-S3 with voice I/O.

## Structure

- **src/** - Firmware source code
  - **wifi/** - WiFi management
  - **audio/** - I2S audio capture/playback
  - **network/** - WebSocket client
  - **utils/** - Utilities
- **lib/** - External libraries
- **test/** - Tests

## Building

```bash
cd packages/esp32-firmware
pio run -e esp32-s3           # Build
pio run -t upload -e esp32-s3 # Upload to device
pio device monitor             # Serial monitor
```
