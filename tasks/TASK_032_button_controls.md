# Task 032: Implement Button Controls

## 📋 Task Information

| Field        | Value                       |
| ------------ | --------------------------- |
| **Task ID**  | T032                        |
| **Phase**    | Phase 3 - ESP32 Development |
| **Priority** | Medium                      |
| **Estimate** | 3 hours                     |
| **Status**   | 🔲 Not Started              |

---

## 🎯 Objective

Implement button controls for manual triggering, volume control, and mode switching.

---

## 📝 Requirements

### Button Functions

| Button | Short Press       | Long Press (2s) | Double Click |
| ------ | ----------------- | --------------- | ------------ |
| Main   | Trigger recording | Cancel/Reset    | -            |
| Vol+   | Volume up         | Max volume      | -            |
| Vol-   | Volume down       | Mute toggle     | -            |
| Mode   | Switch mode       | Enter setup     | -            |

### Features

1. **Debouncing** - Prevent false triggers
2. **Long Press Detection** - Hold for 2 seconds
3. **Double Click Detection** - Two clicks within 300ms
4. **Interrupt-driven** - Low CPU usage

---

## 📁 Files to Create

```
packages/esp32-firmware/
├── src/
│   └── input/
│       ├── button_handler.h
│       └── button_handler.cpp
```

---

## 🔧 Implementation Details

### button_handler.h

```cpp
#ifndef BUTTON_HANDLER_H
#define BUTTON_HANDLER_H

#include <Arduino.h>
#include <functional>

namespace UEBot {
namespace Input {

enum class ButtonEvent {
    NONE,
    PRESS,
    RELEASE,
    SHORT_PRESS,
    LONG_PRESS,
    DOUBLE_CLICK
};

using ButtonCallback = std::function<void(ButtonEvent event)>;

struct ButtonConfig {
    uint8_t pin;
    bool activeLow = true;          // Button connects to GND
    uint32_t debounceMs = 50;       // Debounce time
    uint32_t longPressMs = 2000;    // Long press threshold
    uint32_t doubleClickMs = 300;   // Double click window
    bool enablePullup = true;       // Use internal pullup
};

class Button {
public:
    Button(const ButtonConfig& config);

    void begin();
    void update();  // Call in loop

    bool isPressed() const { return _pressed; }
    ButtonEvent getLastEvent() const { return _lastEvent; }

    void onEvent(ButtonCallback callback) { _callback = callback; }

private:
    ButtonConfig _config;
    bool _pressed = false;
    bool _lastState = false;
    uint32_t _lastDebounceTime = 0;
    uint32_t _pressStartTime = 0;
    uint32_t _lastReleaseTime = 0;
    uint8_t _clickCount = 0;
    bool _longPressHandled = false;
    ButtonEvent _lastEvent = ButtonEvent::NONE;
    ButtonCallback _callback = nullptr;

    void handleEvent(ButtonEvent event);
};

class ButtonHandler {
public:
    static ButtonHandler& getInstance();

    void begin();
    void update();  // Call in loop

    // Predefined buttons
    void onMainButton(ButtonCallback callback);
    void onVolumeUp(ButtonCallback callback);
    void onVolumeDown(ButtonCallback callback);
    void onModeButton(ButtonCallback callback);

private:
    ButtonHandler();
    ~ButtonHandler() = default;

    Button* _mainButton = nullptr;
    Button* _volUpButton = nullptr;
    Button* _volDownButton = nullptr;
    Button* _modeButton = nullptr;
};

} // namespace Input
} // namespace UEBot

#endif // BUTTON_HANDLER_H
```

### button_handler.cpp

```cpp
#include "button_handler.h"

// Default pin configuration for ESP32-S3
#define MAIN_BUTTON_PIN    0    // BOOT button
#define VOL_UP_PIN         1    // Optional
#define VOL_DOWN_PIN       2    // Optional
#define MODE_PIN           3    // Optional

namespace UEBot {
namespace Input {

// Button implementation
Button::Button(const ButtonConfig& config) : _config(config) {}

void Button::begin() {
    if (_config.enablePullup) {
        pinMode(_config.pin, INPUT_PULLUP);
    } else {
        pinMode(_config.pin, INPUT);
    }
    _lastState = digitalRead(_config.pin);
}

void Button::update() {
    bool currentState = digitalRead(_config.pin);

    // Invert if active low
    if (_config.activeLow) {
        currentState = !currentState;
    }

    uint32_t now = millis();

    // Debounce
    if (currentState != _lastState) {
        _lastDebounceTime = now;
    }

    if (now - _lastDebounceTime > _config.debounceMs) {
        // State has been stable
        if (currentState != _pressed) {
            _pressed = currentState;

            if (_pressed) {
                // Button pressed
                _pressStartTime = now;
                _longPressHandled = false;
                handleEvent(ButtonEvent::PRESS);
            } else {
                // Button released
                handleEvent(ButtonEvent::RELEASE);

                if (!_longPressHandled) {
                    // Check for double click
                    if (now - _lastReleaseTime < _config.doubleClickMs) {
                        _clickCount++;
                        if (_clickCount >= 2) {
                            handleEvent(ButtonEvent::DOUBLE_CLICK);
                            _clickCount = 0;
                        }
                    } else {
                        _clickCount = 1;
                        // Delay short press to check for double click
                        // In real implementation, use a timer
                        handleEvent(ButtonEvent::SHORT_PRESS);
                    }
                }

                _lastReleaseTime = now;
            }
        }

        // Check for long press
        if (_pressed && !_longPressHandled) {
            if (now - _pressStartTime >= _config.longPressMs) {
                handleEvent(ButtonEvent::LONG_PRESS);
                _longPressHandled = true;
            }
        }
    }

    _lastState = currentState;
}

void Button::handleEvent(ButtonEvent event) {
    _lastEvent = event;
    if (_callback) {
        _callback(event);
    }
}

// ButtonHandler implementation
ButtonHandler& ButtonHandler::getInstance() {
    static ButtonHandler instance;
    return instance;
}

ButtonHandler::ButtonHandler() {
    // Initialize main button (BOOT button on ESP32)
    ButtonConfig mainConfig = {
        .pin = MAIN_BUTTON_PIN,
        .activeLow = true,
        .debounceMs = 50,
        .longPressMs = 2000,
        .doubleClickMs = 300,
        .enablePullup = true
    };
    _mainButton = new Button(mainConfig);
}

void ButtonHandler::begin() {
    if (_mainButton) _mainButton->begin();
    if (_volUpButton) _volUpButton->begin();
    if (_volDownButton) _volDownButton->begin();
    if (_modeButton) _modeButton->begin();

    Serial.println("ButtonHandler: Initialized");
}

void ButtonHandler::update() {
    if (_mainButton) _mainButton->update();
    if (_volUpButton) _volUpButton->update();
    if (_volDownButton) _volDownButton->update();
    if (_modeButton) _modeButton->update();
}

void ButtonHandler::onMainButton(ButtonCallback callback) {
    if (_mainButton) {
        _mainButton->onEvent(callback);
    }
}

void ButtonHandler::onVolumeUp(ButtonCallback callback) {
    if (_volUpButton) {
        _volUpButton->onEvent(callback);
    }
}

void ButtonHandler::onVolumeDown(ButtonCallback callback) {
    if (_volDownButton) {
        _volDownButton->onEvent(callback);
    }
}

void ButtonHandler::onModeButton(ButtonCallback callback) {
    if (_modeButton) {
        _modeButton->onEvent(callback);
    }
}

} // namespace Input
}
```

---

## ✅ Acceptance Criteria

- [ ] Button presses detected correctly
- [ ] Debouncing works properly
- [ ] Long press detection works
- [ ] Double click detection works
- [ ] Main button triggers recording
- [ ] No false triggers

---

## 🧪 Testing

```cpp
void setup() {
    Serial.begin(115200);

    ButtonHandler::getInstance().begin();

    ButtonHandler::getInstance().onMainButton([](ButtonEvent event) {
        switch (event) {
            case ButtonEvent::SHORT_PRESS:
                Serial.println("Main: Short press - trigger recording");
                WakeWordDetector::getInstance().trigger();
                break;
            case ButtonEvent::LONG_PRESS:
                Serial.println("Main: Long press - cancel");
                WakeWordDetector::getInstance().reset();
                break;
            case ButtonEvent::DOUBLE_CLICK:
                Serial.println("Main: Double click");
                break;
        }
    });
}

void loop() {
    ButtonHandler::getInstance().update();
}
```

---

## 📚 References

- [ESP32 GPIO](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/peripherals/gpio.html)
- [Debouncing Techniques](https://www.arduino.cc/en/Tutorial/BuiltInExamples/Debounce)
