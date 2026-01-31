# Task 031: Add LED Status Indicators

## 📋 Task Information

| Field        | Value                       |
| ------------ | --------------------------- |
| **Task ID**  | T031                        |
| **Phase**    | Phase 3 - ESP32 Development |
| **Priority** | Low                         |
| **Estimate** | 2 hours                     |
| **Status**   | 🔲 Not Started              |

---

## 🎯 Objective

Implement LED status indicators to show device state (WiFi, listening, recording, processing).

---

## 📝 Requirements

### LED States

| State           | LED Pattern        | Description           |
| --------------- | ------------------ | --------------------- |
| Boot            | Fast blink (100ms) | Device starting up    |
| WiFi Connecting | Slow blink (500ms) | Connecting to WiFi    |
| WiFi Connected  | Solid on           | Connected, idle       |
| Listening       | Pulse (breathe)    | Waiting for wake word |
| Recording       | Fast pulse         | Recording audio       |
| Processing      | Rainbow/cycle      | Sending to server     |
| Error           | Red blink          | Error occurred        |

### Hardware Options

1. **Single LED** - Simple on/off with patterns
2. **RGB LED** - Color + patterns
3. **WS2812 NeoPixel** - Addressable RGB (recommended)

---

## 📁 Files to Create

```
packages/esp32-firmware/
├── src/
│   └── indicators/
│       ├── led_indicator.h
│       └── led_indicator.cpp
```

---

## 🔧 Implementation Details

### led_indicator.h

```cpp
#ifndef LED_INDICATOR_H
#define LED_INDICATOR_H

#include <Arduino.h>
#include <Adafruit_NeoPixel.h>

namespace UEBot {
namespace Indicators {

enum class LEDState {
    OFF,
    BOOT,
    WIFI_CONNECTING,
    WIFI_CONNECTED,
    LISTENING,
    WAKE_WORD_DETECTED,
    RECORDING,
    PROCESSING,
    SUCCESS,
    ERROR
};

struct LEDConfig {
    uint8_t pin = 48;           // Default for ESP32-S3 DevKit
    uint8_t numLeds = 1;        // Number of LEDs
    uint8_t brightness = 50;    // 0-255
    bool useNeoPixel = true;    // Use WS2812 or simple LED
};

class LEDIndicator {
public:
    static LEDIndicator& getInstance();

    bool begin(const LEDConfig& config = LEDConfig());
    void end();

    void setState(LEDState state);
    LEDState getState() const { return _state; }

    void setBrightness(uint8_t brightness);

    // Must call in loop for animations
    void update();

private:
    LEDIndicator() = default;
    ~LEDIndicator();

    void setColor(uint8_t r, uint8_t g, uint8_t b);
    void setPattern();
    uint32_t wheel(byte pos);

    LEDConfig _config;
    LEDState _state = LEDState::OFF;
    Adafruit_NeoPixel* _pixels = nullptr;

    // Animation state
    uint32_t _lastUpdate = 0;
    uint8_t _animationStep = 0;
    bool _ledOn = false;
};

} // namespace Indicators
} // namespace UEBot

#endif // LED_INDICATOR_H
```

### led_indicator.cpp

```cpp
#include "led_indicator.h"

namespace UEBot {
namespace Indicators {

LEDIndicator& LEDIndicator::getInstance() {
    static LEDIndicator instance;
    return instance;
}

LEDIndicator::~LEDIndicator() {
    end();
}

bool LEDIndicator::begin(const LEDConfig& config) {
    _config = config;

    if (_config.useNeoPixel) {
        _pixels = new Adafruit_NeoPixel(_config.numLeds, _config.pin, NEO_GRB + NEO_KHZ800);
        _pixels->begin();
        _pixels->setBrightness(_config.brightness);
        _pixels->clear();
        _pixels->show();
    } else {
        pinMode(_config.pin, OUTPUT);
        digitalWrite(_config.pin, LOW);
    }

    return true;
}

void LEDIndicator::end() {
    if (_pixels) {
        _pixels->clear();
        _pixels->show();
        delete _pixels;
        _pixels = nullptr;
    }
}

void LEDIndicator::setState(LEDState state) {
    _state = state;
    _animationStep = 0;
    _lastUpdate = 0;
}

void LEDIndicator::setBrightness(uint8_t brightness) {
    _config.brightness = brightness;
    if (_pixels) {
        _pixels->setBrightness(brightness);
    }
}

void LEDIndicator::update() {
    uint32_t now = millis();
    uint32_t interval = 100;  // Default update interval

    switch (_state) {
        case LEDState::OFF:
            setColor(0, 0, 0);
            return;

        case LEDState::BOOT:
            interval = 100;
            if (now - _lastUpdate >= interval) {
                _ledOn = !_ledOn;
                setColor(_ledOn ? 255 : 0, _ledOn ? 165 : 0, 0);  // Orange blink
                _lastUpdate = now;
            }
            break;

        case LEDState::WIFI_CONNECTING:
            interval = 500;
            if (now - _lastUpdate >= interval) {
                _ledOn = !_ledOn;
                setColor(0, 0, _ledOn ? 255 : 0);  // Blue blink
                _lastUpdate = now;
            }
            break;

        case LEDState::WIFI_CONNECTED:
            setColor(0, 255, 0);  // Solid green
            break;

        case LEDState::LISTENING:
            // Breathing effect
            interval = 30;
            if (now - _lastUpdate >= interval) {
                _animationStep = (_animationStep + 1) % 256;
                uint8_t brightness = (sin(_animationStep * 0.0245) + 1) * 127;
                setColor(0, brightness, brightness);  // Cyan pulse
                _lastUpdate = now;
            }
            break;

        case LEDState::WAKE_WORD_DETECTED:
            setColor(0, 255, 255);  // Bright cyan
            break;

        case LEDState::RECORDING:
            interval = 100;
            if (now - _lastUpdate >= interval) {
                _animationStep = (_animationStep + 1) % 256;
                uint8_t brightness = (sin(_animationStep * 0.1) + 1) * 127;
                setColor(255, brightness, 0);  // Orange/yellow pulse
                _lastUpdate = now;
            }
            break;

        case LEDState::PROCESSING:
            // Rainbow cycle
            interval = 20;
            if (now - _lastUpdate >= interval) {
                _animationStep = (_animationStep + 1) % 256;
                uint32_t color = wheel(_animationStep);
                if (_pixels) {
                    _pixels->setPixelColor(0, color);
                    _pixels->show();
                }
                _lastUpdate = now;
            }
            break;

        case LEDState::SUCCESS:
            setColor(0, 255, 0);  // Green
            break;

        case LEDState::ERROR:
            interval = 200;
            if (now - _lastUpdate >= interval) {
                _ledOn = !_ledOn;
                setColor(_ledOn ? 255 : 0, 0, 0);  // Red blink
                _lastUpdate = now;
            }
            break;
    }
}

void LEDIndicator::setColor(uint8_t r, uint8_t g, uint8_t b) {
    if (_pixels) {
        _pixels->setPixelColor(0, _pixels->Color(r, g, b));
        _pixels->show();
    } else {
        // Simple LED - use PWM for brightness
        analogWrite(_config.pin, (r + g + b) / 3);
    }
}

uint32_t LEDIndicator::wheel(byte pos) {
    pos = 255 - pos;
    if (pos < 85) {
        return _pixels->Color(255 - pos * 3, 0, pos * 3);
    }
    if (pos < 170) {
        pos -= 85;
        return _pixels->Color(0, pos * 3, 255 - pos * 3);
    }
    pos -= 170;
    return _pixels->Color(pos * 3, 255 - pos * 3, 0);
}

} // namespace Indicators
}
```

### platformio.ini addition

```ini
lib_deps =
    adafruit/Adafruit NeoPixel@^1.11.0
```

---

## ✅ Acceptance Criteria

- [ ] LED indicates all states correctly
- [ ] Animations are smooth
- [ ] Brightness is adjustable
- [ ] Works with both NeoPixel and simple LED
- [ ] Minimal CPU usage

---

## 🧪 Testing

```cpp
void setup() {
    LEDIndicator::getInstance().begin();
    LEDIndicator::getInstance().setState(LEDState::BOOT);
}

void loop() {
    LEDIndicator::getInstance().update();

    // Test state changes
    static uint32_t lastChange = 0;
    static int state = 0;

    if (millis() - lastChange > 3000) {
        state = (state + 1) % 8;
        LEDIndicator::getInstance().setState((LEDState)state);
        lastChange = millis();
    }
}
```

---

## 📚 References

- [Adafruit NeoPixel Library](https://github.com/adafruit/Adafruit_NeoPixel)
- [ESP32-S3 DevKit Pinout](https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/hw-reference/esp32s3/user-guide-devkitc-1.html)
