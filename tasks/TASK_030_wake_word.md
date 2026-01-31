# Task 030: Implement Wake Word Detection

## 📋 Task Information

| Field        | Value                       |
| ------------ | --------------------------- |
| **Task ID**  | T030                        |
| **Phase**    | Phase 3 - ESP32 Development |
| **Priority** | High                        |
| **Estimate** | 12 hours                    |
| **Status**   | 🔲 Not Started              |

---

## 🎯 Objective

Implement wake word detection ("Hey Robot" or custom) to activate voice recording on ESP32.

---

## 📝 Requirements

### Approach Options

1. **ESP-SR (Espressif Speech Recognition)** - Recommended
   - Built-in wake word engine
   - Low power consumption
   - Supports custom wake words
   - Works offline

2. **Picovoice Porcupine** - Alternative
   - High accuracy
   - Custom wake words
   - Requires license for commercial use

3. **Simple Energy-based VAD** - Fallback
   - Detect audio energy above threshold
   - Simple but prone to false positives
   - Use as backup or with button trigger

### Functional Requirements

1. **Wake Word Detection**
   - Detect wake word in real-time
   - Low latency (< 500ms)
   - Configurable sensitivity

2. **State Machine**
   - IDLE → Listening for wake word
   - TRIGGERED → Wake word detected, start recording
   - RECORDING → Recording user speech
   - PROCESSING → Sending audio to server

3. **Voice Activity Detection (VAD)**
   - Detect end of speech
   - Timeout for maximum recording
   - Silence detection to stop recording

---

## 📁 Files to Create

```
packages/esp32-firmware/
├── src/
│   └── audio/
│       ├── wake_word.h
│       ├── wake_word.cpp
│       ├── vad.h
│       └── vad.cpp
├── lib/
│   └── esp-sr/ (if using ESP-SR)
└── models/
    └── wake_word.bin (custom model)
```

---

## 🔧 Implementation Details

### wake_word.h

```cpp
#ifndef WAKE_WORD_H
#define WAKE_WORD_H

#include <Arduino.h>
#include <functional>

namespace UEBot {
namespace Audio {

enum class WakeWordState {
    IDLE,           // Waiting for wake word
    TRIGGERED,      // Wake word detected
    RECORDING,      // Recording speech
    PROCESSING,     // Processing/Sending
    ERROR
};

using WakeWordCallback = std::function<void()>;
using StateChangeCallback = std::function<void(WakeWordState state)>;
using RecordingCompleteCallback = std::function<void(const uint8_t* data, size_t length)>;

struct WakeWordConfig {
    float sensitivity = 0.5f;         // 0.0 - 1.0
    uint32_t silenceTimeoutMs = 1500; // Stop recording after silence
    uint32_t maxRecordingMs = 10000;  // Maximum recording duration
    uint32_t minRecordingMs = 500;    // Minimum recording duration
    int vadThreshold = 500;           // Voice activity threshold
};

class WakeWordDetector {
public:
    static WakeWordDetector& getInstance();

    // Initialization
    bool begin(const WakeWordConfig& config = WakeWordConfig());
    void end();

    // Control
    void start();   // Start listening for wake word
    void stop();    // Stop listening
    void reset();   // Reset to IDLE state

    // Manual trigger (button press)
    void trigger();

    // Process audio (call with incoming audio samples)
    void processAudio(const int16_t* samples, size_t count);

    // Status
    WakeWordState getState() const { return _state; }
    bool isListening() const { return _state == WakeWordState::IDLE; }
    bool isRecording() const { return _state == WakeWordState::RECORDING; }

    // Configuration
    void setSensitivity(float sensitivity);
    void setConfig(const WakeWordConfig& config);

    // Callbacks
    void onWakeWord(WakeWordCallback callback) { _wakeWordCallback = callback; }
    void onStateChange(StateChangeCallback callback) { _stateCallback = callback; }
    void onRecordingComplete(RecordingCompleteCallback callback) { _recordingCallback = callback; }

private:
    WakeWordDetector() = default;
    ~WakeWordDetector();
    WakeWordDetector(const WakeWordDetector&) = delete;
    WakeWordDetector& operator=(const WakeWordDetector&) = delete;

    void setState(WakeWordState newState);
    bool detectWakeWord(const int16_t* samples, size_t count);
    bool detectSilence(const int16_t* samples, size_t count);
    int calculateEnergy(const int16_t* samples, size_t count);

    WakeWordState _state = WakeWordState::IDLE;
    WakeWordConfig _config;

    // Recording
    uint8_t* _recordBuffer = nullptr;
    size_t _recordBufferSize = 0;
    size_t _recordedBytes = 0;
    uint32_t _recordStartTime = 0;
    uint32_t _lastVoiceTime = 0;

    // Wake word model
    void* _model = nullptr;

    // Energy-based detection fallback
    int _recentEnergy[10] = {0};
    int _energyIndex = 0;
    int _avgEnergy = 0;

    // Callbacks
    WakeWordCallback _wakeWordCallback = nullptr;
    StateChangeCallback _stateCallback = nullptr;
    RecordingCompleteCallback _recordingCallback = nullptr;
};

} // namespace Audio
} // namespace UEBot

#endif // WAKE_WORD_H
```

### wake_word.cpp (ESP-SR Implementation)

```cpp
#include "wake_word.h"
#include "audio_config.h"

// ESP-SR includes (when available)
#if defined(CONFIG_IDF_TARGET_ESP32S3)
#include "esp_wn_iface.h"
#include "esp_wn_models.h"
#include "esp_afe_sr_iface.h"
#include "esp_afe_sr_models.h"
#include "model_path.h"
#define USE_ESP_SR 1
#endif

namespace UEBot {
namespace Audio {

WakeWordDetector& WakeWordDetector::getInstance() {
    static WakeWordDetector instance;
    return instance;
}

WakeWordDetector::~WakeWordDetector() {
    end();
}

bool WakeWordDetector::begin(const WakeWordConfig& config) {
    _config = config;

    // Allocate recording buffer (use PSRAM)
    _recordBufferSize = SAMPLE_RATE * (_config.maxRecordingMs / 1000) * sizeof(int16_t);
    _recordBuffer = (uint8_t*)heap_caps_malloc(_recordBufferSize, MALLOC_CAP_SPIRAM);

    if (!_recordBuffer) {
        _recordBuffer = (uint8_t*)malloc(_recordBufferSize);
    }

    if (!_recordBuffer) {
        Serial.println("WakeWord: Failed to allocate record buffer");
        return false;
    }

#if USE_ESP_SR
    // Initialize ESP-SR wake word engine
    srmodel_list_t *models = esp_srmodel_init("model");
    char *wn_name = esp_srmodel_filter(models, ESP_WN_PREFIX, "hiesp");

    if (wn_name) {
        _model = esp_wn_iface.create(wn_name, DET_MODE_90);
        Serial.printf("WakeWord: Loaded model %s\n", wn_name);
    } else {
        Serial.println("WakeWord: No wake word model found, using energy detection");
    }
#else
    Serial.println("WakeWord: Using energy-based detection (ESP-SR not available)");
#endif

    _state = WakeWordState::IDLE;
    return true;
}

void WakeWordDetector::end() {
    if (_recordBuffer) {
        free(_recordBuffer);
        _recordBuffer = nullptr;
    }

#if USE_ESP_SR
    if (_model) {
        esp_wn_iface.destroy(_model);
        _model = nullptr;
    }
#endif
}

void WakeWordDetector::start() {
    if (_state == WakeWordState::ERROR) {
        return;
    }
    setState(WakeWordState::IDLE);
}

void WakeWordDetector::stop() {
    setState(WakeWordState::IDLE);
}

void WakeWordDetector::reset() {
    _recordedBytes = 0;
    _recordStartTime = 0;
    _lastVoiceTime = 0;
    setState(WakeWordState::IDLE);
}

void WakeWordDetector::trigger() {
    // Manual trigger (e.g., from button press)
    if (_state == WakeWordState::IDLE) {
        Serial.println("WakeWord: Manual trigger");
        setState(WakeWordState::TRIGGERED);

        if (_wakeWordCallback) {
            _wakeWordCallback();
        }

        // Start recording
        _recordedBytes = 0;
        _recordStartTime = millis();
        _lastVoiceTime = millis();
        setState(WakeWordState::RECORDING);
    }
}

void WakeWordDetector::processAudio(const int16_t* samples, size_t count) {
    switch (_state) {
        case WakeWordState::IDLE:
            // Check for wake word
            if (detectWakeWord(samples, count)) {
                Serial.println("WakeWord: Detected!");
                setState(WakeWordState::TRIGGERED);

                if (_wakeWordCallback) {
                    _wakeWordCallback();
                }

                // Start recording immediately
                _recordedBytes = 0;
                _recordStartTime = millis();
                _lastVoiceTime = millis();
                setState(WakeWordState::RECORDING);
            }
            break;

        case WakeWordState::RECORDING:
            // Append audio to buffer
            if (_recordedBytes + count * sizeof(int16_t) <= _recordBufferSize) {
                memcpy(_recordBuffer + _recordedBytes, samples, count * sizeof(int16_t));
                _recordedBytes += count * sizeof(int16_t);
            }

            // Check for voice activity
            if (!detectSilence(samples, count)) {
                _lastVoiceTime = millis();
            }

            // Check recording conditions
            uint32_t elapsed = millis() - _recordStartTime;
            uint32_t silenceDuration = millis() - _lastVoiceTime;

            // Stop conditions
            bool maxDurationReached = elapsed >= _config.maxRecordingMs;
            bool silenceTimeout = elapsed > _config.minRecordingMs &&
                                  silenceDuration >= _config.silenceTimeoutMs;

            if (maxDurationReached || silenceTimeout) {
                Serial.printf("WakeWord: Recording complete (%d ms, %d bytes)\n",
                              elapsed, _recordedBytes);

                setState(WakeWordState::PROCESSING);

                if (_recordingCallback && _recordedBytes > 0) {
                    _recordingCallback(_recordBuffer, _recordedBytes);
                }

                // Return to idle
                reset();
            }
            break;

        case WakeWordState::PROCESSING:
            // Ignore audio while processing
            break;

        default:
            break;
    }
}

bool WakeWordDetector::detectWakeWord(const int16_t* samples, size_t count) {
#if USE_ESP_SR
    if (_model) {
        // Use ESP-SR wake word detection
        int result = esp_wn_iface.detect(_model, (int16_t*)samples);
        return result > 0;
    }
#endif

    // Fallback: Energy-based detection
    // This is a simple approach - look for sudden increase in energy
    int energy = calculateEnergy(samples, count);

    // Update rolling average
    _recentEnergy[_energyIndex] = energy;
    _energyIndex = (_energyIndex + 1) % 10;

    int sum = 0;
    for (int i = 0; i < 10; i++) {
        sum += _recentEnergy[i];
    }
    int newAvg = sum / 10;

    // Detect spike (energy > 2x average and above threshold)
    bool detected = (energy > newAvg * 2) && (energy > _config.vadThreshold * 3);

    _avgEnergy = newAvg;

    return detected;
}

bool WakeWordDetector::detectSilence(const int16_t* samples, size_t count) {
    int energy = calculateEnergy(samples, count);
    return energy < _config.vadThreshold;
}

int WakeWordDetector::calculateEnergy(const int16_t* samples, size_t count) {
    int64_t sum = 0;
    for (size_t i = 0; i < count; i++) {
        sum += abs(samples[i]);
    }
    return sum / count;
}

void WakeWordDetector::setState(WakeWordState newState) {
    if (_state != newState) {
        Serial.printf("WakeWord: State %d -> %d\n", (int)_state, (int)newState);
        _state = newState;

        if (_stateCallback) {
            _stateCallback(newState);
        }
    }
}

void WakeWordDetector::setSensitivity(float sensitivity) {
    _config.sensitivity = constrain(sensitivity, 0.0f, 1.0f);

#if USE_ESP_SR
    if (_model) {
        // Update ESP-SR sensitivity
        // Implementation depends on ESP-SR version
    }
#endif
}

} // namespace Audio
}
```

### vad.h (Voice Activity Detection)

```cpp
#ifndef VAD_H
#define VAD_H

#include <Arduino.h>

namespace UEBot {
namespace Audio {

class VAD {
public:
    VAD(int threshold = 500, int windowSize = 10);

    // Process samples and return true if voice detected
    bool process(const int16_t* samples, size_t count);

    // Get current energy level
    int getEnergy() const { return _currentEnergy; }
    int getAverageEnergy() const { return _avgEnergy; }

    // Configuration
    void setThreshold(int threshold) { _threshold = threshold; }
    int getThreshold() const { return _threshold; }

    // Reset state
    void reset();

private:
    int _threshold;
    int _windowSize;
    int _currentEnergy = 0;
    int _avgEnergy = 0;
    int* _energyHistory = nullptr;
    int _historyIndex = 0;
    int _historyCount = 0;
};

} // namespace Audio
} // namespace UEBot

#endif // VAD_H
```

---

## ✅ Acceptance Criteria

- [ ] Wake word detection works reliably
- [ ] False positive rate < 5%
- [ ] Detection latency < 500ms
- [ ] VAD correctly detects end of speech
- [ ] Recording stops on silence timeout
- [ ] Manual trigger (button) works
- [ ] Memory usage is acceptable
- [ ] Works with I2S audio input

---

## 🧪 Testing

### Test 1: Wake Word Detection

```cpp
void setup() {
    // Initialize audio and wake word
    I2SAudio::getInstance().begin();
    WakeWordDetector::getInstance().begin();

    WakeWordDetector::getInstance().onWakeWord([]() {
        Serial.println("Wake word detected!");
        // LED indication
    });

    WakeWordDetector::getInstance().onRecordingComplete([](const uint8_t* data, size_t len) {
        Serial.printf("Recording: %d bytes\n", len);
        // Send to server
    });

    // Start listening
    WakeWordDetector::getInstance().start();
}

void loop() {
    // Audio processing happens in I2S callback
}
```

### Test 2: Sensitivity Tuning

- Test with different sensitivity values
- Measure false positive rate
- Find optimal threshold

### Test 3: VAD Accuracy

- Test silence detection in quiet/noisy environments
- Verify speech end detection

---

## 📚 References

- [ESP-SR Documentation](https://github.com/espressif/esp-sr)
- [Picovoice Porcupine](https://picovoice.ai/platform/porcupine/)
- [Voice Activity Detection](https://en.wikipedia.org/wiki/Voice_activity_detection)

---

## 📝 Notes

- ESP-SR is preferred for ESP32-S3 (native support)
- Consider using button trigger as primary method initially
- Wake word accuracy depends on microphone quality
- May need noise cancellation in noisy environments
