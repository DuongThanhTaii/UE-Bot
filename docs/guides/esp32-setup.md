# ESP32 Setup Guide

## Hardware Requirements

### Essential Components

| Component          | Description                    | Where to Buy          |
| ------------------ | ------------------------------ | --------------------- |
| ESP32-S3 DevKitC-1 | Main microcontroller           | AliExpress, Amazon    |
| INMP441            | I2S MEMS Microphone            | AliExpress, Amazon    |
| MAX98357A          | I2S DAC + 3W Amplifier         | AliExpress, Amazon    |
| Speaker (3W 4Ω)    | Small speaker for audio output | AliExpress, Amazon    |
| Jumper wires       | For connections                | Any electronics store |
| Breadboard         | For prototyping                | Any electronics store |

### Recommended (Optional)

- Push button for manual wake
- RGB LED for status indication
- 3D printed case

## Wiring Diagram

### INMP441 Microphone → ESP32-S3

| INMP441 Pin | ESP32-S3 Pin   | Wire Color (Suggested) |
| ----------- | -------------- | ---------------------- |
| VDD         | 3.3V           | Red                    |
| GND         | GND            | Black                  |
| SD          | GPIO33         | Blue                   |
| WS          | GPIO25         | Yellow                 |
| SCK         | GPIO32         | Green                  |
| L/R         | GND (for left) | -                      |

### MAX98357A DAC → ESP32-S3

| MAX98357A Pin | ESP32-S3 Pin     | Wire Color (Suggested) |
| ------------- | ---------------- | ---------------------- |
| VIN           | 5V               | Red                    |
| GND           | GND              | Black                  |
| DIN           | GPIO14           | Blue                   |
| BCLK          | GPIO26           | Yellow                 |
| LRC           | GPIO27           | Green                  |
| GAIN          | Not connected    | -                      |
| SD            | 3.3V (always on) | -                      |

### Visual Diagram

```
                    ESP32-S3
                 ┌─────────────┐
                 │             │
    INMP441      │    GPIO25 ◄─┼── WS
    ┌────────┐   │    GPIO33 ◄─┼── SD
    │   VDD ─┼───┼─► 3.3V      │
    │   GND ─┼───┼─► GND       │
    │    SD ─┼───┼─► GPIO33    │
    │    WS ─┼───┼─► GPIO25    │
    │   SCK ─┼───┼─► GPIO32    │
    │   L/R ─┼───┼─► GND       │
    └────────┘   │             │
                 │    GPIO32 ◄─┼── SCK
                 │             │
    MAX98357A    │             │
    ┌────────┐   │    GPIO14 ►─┼── DIN
    │   VIN ─┼───┼─► 5V        │
    │   GND ─┼───┼─► GND       │
    │   DIN ─┼───┼─► GPIO14    │
    │  BCLK ─┼───┼─► GPIO26    │
    │   LRC ─┼───┼─► GPIO27    │
    └────────┘   │    GPIO26 ►─┼── BCLK
                 │    GPIO27 ►─┼── LRC
                 │             │
                 │    GPIO2  ──┼── LED (Optional)
                 │    GPIO0  ◄─┼── Button (BOOT)
                 └─────────────┘
```

## Software Setup

### 1. Install PlatformIO

**Option A: VS Code Extension (Recommended)**

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search "PlatformIO IDE"
4. Install

**Option B: CLI**

```bash
pip install platformio
```

### 2. Configure Firmware

Edit `packages/esp32-firmware/src/config.h`:

```cpp
// WiFi credentials
#define WIFI_SSID "your_wifi_name"
#define WIFI_PASSWORD "your_wifi_password"

// Bridge service address
#define BRIDGE_HOST "192.168.1.100"  // Your computer's IP
#define BRIDGE_PORT 8080
```

### 3. Build and Upload

**Using PlatformIO CLI:**

```bash
cd packages/esp32-firmware

# Build
pio run -e esp32-s3

# Upload
pio run -e esp32-s3 -t upload

# Monitor serial output
pio device monitor
```

**Using VS Code:**

1. Open `packages/esp32-firmware` folder
2. Click PlatformIO icon in sidebar
3. Select "Upload" under esp32-s3 environment
4. Click "Monitor" to see serial output

## Testing

### 1. Serial Monitor Test

After uploading, open serial monitor (115200 baud):

```
==========================
  UE-Bot ESP32 Firmware
==========================
Device ID: esp32-001
Version: 0.1.0

[WiFi] Connecting to YourSSID
..........
[WiFi] Connected! IP: 192.168.1.50
[Main] WiFi connected!
[Main] Device Info:
  MAC: AA:BB:CC:DD:EE:FF
  IP: 192.168.1.50
  RSSI: -45 dBm
```

### 2. LED Indicator Test

| LED Pattern        | Meaning               |
| ------------------ | --------------------- |
| Slow blink (1s)    | Disconnected, waiting |
| Fast blink (200ms) | Connecting            |
| Solid on           | Connected             |
| Double blink       | Error                 |

### 3. Microphone Test

Speak near the microphone and check serial output for audio levels.

### 4. Speaker Test

The device should play a startup sound when connected successfully.

## Troubleshooting

### WiFi Connection Failed

1. Check SSID and password in config.h
2. Ensure 2.4GHz WiFi (not 5GHz)
3. Check router allows new connections
4. Try closer to router

### No Audio Input

1. Check INMP441 wiring
2. Verify 3.3V power (not 5V!)
3. Check L/R pin is connected to GND

### No Audio Output

1. Check MAX98357A wiring
2. Verify 5V power
3. Check speaker connections
4. Ensure SD pin is pulled HIGH

### Can't Upload

1. Hold BOOT button while clicking Upload
2. Check USB cable (data, not charge-only)
3. Install USB drivers if needed
4. Try different USB port

## Advanced Configuration

### Custom Pin Assignment

Edit `config.h` to change pin assignments:

```cpp
// I2S Pins (INMP441 Microphone)
#define I2S_MIC_WS 25
#define I2S_MIC_SD 33
#define I2S_MIC_SCK 32

// I2S Pins (MAX98357A Speaker)
#define I2S_SPK_BCLK 26
#define I2S_SPK_LRC 27
#define I2S_SPK_DOUT 14
```

### Different ESP32 Board

Edit `platformio.ini` for different boards:

```ini
[env:esp32dev]
board = esp32dev  ; Standard ESP32

[env:esp32-s3]
board = esp32-s3-devkitc-1  ; ESP32-S3 (recommended)
```

## Next Steps

1. [Getting Started Guide](./getting-started.md)
2. [Development Guide](./development.md)
3. [Architecture Overview](../architecture/README.md)
