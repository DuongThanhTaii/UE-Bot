# Task 026: Configure I2S Microphone (INMP441)

## 📋 Task Information

| Field        | Value                       |
| ------------ | --------------------------- |
| **Task ID**  | T026                        |
| **Phase**    | Phase 3 - ESP32 Development |
| **Priority** | High                        |
| **Estimate** | 6 hours                     |
| **Status**   | 🔲 Not Started              |

---

## 🎯 Objective

Configure and implement I2S driver for INMP441 MEMS microphone to capture audio for voice commands.

---

## 📝 Requirements

### Hardware Setup

**INMP441 Pinout to ESP32-S3:**

| INMP441 Pin | ESP32-S3 Pin | Description         |
| ----------- | ------------ | ------------------- |
| VDD         | 3.3V         | Power supply        |
| GND         | GND          | Ground              |
| SD          | GPIO 15      | Serial Data         |
| WS          | GPIO 16      | Word Select (LRCLK) |
| SCK         | GPIO 17      | Serial Clock (BCLK) |
| L/R         | GND          | Left channel select |

### Audio Specifications

- Sample Rate: 16000 Hz (optimal for speech recognition)
- Bits per Sample: 16-bit or 32-bit
- Channels: Mono (left channel)
- DMA Buffer: Configurable for latency

### Functional Requirements

1. **I2S Configuration**
   - Setup I2S peripheral in receive mode
   - Configure proper DMA buffers
   - Handle sample rate conversion if needed

2. **Audio Capture**
   - Continuous recording capability
   - Start/Stop control
   - Buffer management

3. **Audio Processing**
   - DC offset removal
   - Gain adjustment
   - Optional noise gate

---

## 📁 Files to Create/Modify

```
packages/esp32-firmware/
├── src/
│   ├── audio/
│   │   ├── i2s_audio.h
│   │   ├── i2s_audio.cpp
│   │   ├── audio_config.h
│   │   └── audio_buffer.h
│   └── config.h (update pins)
└── platformio.ini (add dependencies)
```

---

## 🔧 Implementation Details

### audio_config.h

```cpp
#ifndef AUDIO_CONFIG_H
#define AUDIO_CONFIG_H

namespace UEBot {
namespace Audio {

// I2S Pin Configuration for ESP32-S3
constexpr int I2S_MIC_SD_PIN = 15;   // Serial Data
constexpr int I2S_MIC_WS_PIN = 16;   // Word Select
constexpr int I2S_MIC_SCK_PIN = 17;  // Serial Clock

// Audio Configuration
constexpr int SAMPLE_RATE = 16000;
constexpr int BITS_PER_SAMPLE = 16;
constexpr int CHANNELS = 1;  // Mono

// DMA Configuration
constexpr int DMA_BUF_COUNT = 4;
constexpr int DMA_BUF_LEN = 1024;

// Recording Configuration
constexpr int RECORD_BUFFER_SIZE = SAMPLE_RATE * 5;  // 5 seconds max
constexpr int MIN_RECORDING_MS = 500;   // Minimum recording duration
constexpr int MAX_RECORDING_MS = 10000; // Maximum recording duration

// Audio Processing
constexpr float DEFAULT_GAIN = 1.5f;
constexpr int NOISE_GATE_THRESHOLD = 500;

} // namespace Audio
} // namespace UEBot

#endif // AUDIO_CONFIG_H
```

### i2s_audio.h

```cpp
#ifndef I2S_AUDIO_H
#define I2S_AUDIO_H

#include <Arduino.h>
#include <driver/i2s.h>
#include <functional>
#include "audio_config.h"

namespace UEBot {
namespace Audio {

enum class AudioState {
    IDLE,
    RECORDING,
    PROCESSING,
    ERROR
};

using AudioDataCallback = std::function<void(const int16_t* data, size_t samples)>;
using AudioCompleteCallback = std::function<void(const uint8_t* data, size_t bytes)>;

class I2SAudio {
public:
    static I2SAudio& getInstance();

    // Initialization
    bool begin();
    void end();

    // Recording control
    bool startRecording();
    void stopRecording();
    bool isRecording() const { return _state == AudioState::RECORDING; }

    // Get recorded audio
    const uint8_t* getRecordedData() const { return _recordBuffer; }
    size_t getRecordedSize() const { return _recordedBytes; }

    // Audio processing
    void setGain(float gain) { _gain = gain; }
    float getGain() const { return _gain; }
    void enableNoiseGate(bool enable) { _noiseGateEnabled = enable; }

    // Callbacks
    void onAudioData(AudioDataCallback callback);
    void onRecordingComplete(AudioCompleteCallback callback);

    // Stats
    AudioState getState() const { return _state; }
    int getAverageAmplitude() const { return _avgAmplitude; }
    bool isSilent() const { return _avgAmplitude < NOISE_GATE_THRESHOLD; }

    // Process (call in loop or use task)
    void process();

private:
    I2SAudio() = default;
    ~I2SAudio();
    I2SAudio(const I2SAudio&) = delete;
    I2SAudio& operator=(const I2SAudio&) = delete;

    bool configureI2S();
    void processAudioData(int16_t* samples, size_t count);
    void applyGain(int16_t* samples, size_t count);
    void removeDCOffset(int16_t* samples, size_t count);
    int16_t applyNoiseGate(int16_t sample);

    AudioState _state = AudioState::IDLE;

    // Buffers
    uint8_t* _recordBuffer = nullptr;
    size_t _recordedBytes = 0;
    int16_t* _dmaBuffer = nullptr;

    // Processing
    float _gain = DEFAULT_GAIN;
    bool _noiseGateEnabled = true;
    int _avgAmplitude = 0;
    int32_t _dcOffset = 0;

    // Callbacks
    AudioDataCallback _dataCallback = nullptr;
    AudioCompleteCallback _completeCallback = nullptr;

    // Task
    TaskHandle_t _audioTask = nullptr;
    static void audioTaskFunc(void* param);
};

} // namespace Audio
} // namespace UEBot

#endif // I2S_AUDIO_H
```

### i2s_audio.cpp (Key Implementation)

```cpp
#include "i2s_audio.h"

namespace UEBot {
namespace Audio {

I2SAudio& I2SAudio::getInstance() {
    static I2SAudio instance;
    return instance;
}

bool I2SAudio::begin() {
    // Allocate record buffer
    _recordBuffer = (uint8_t*)ps_malloc(RECORD_BUFFER_SIZE * sizeof(int16_t));
    if (!_recordBuffer) {
        Serial.println("Failed to allocate record buffer");
        return false;
    }

    // Allocate DMA buffer
    _dmaBuffer = (int16_t*)malloc(DMA_BUF_LEN * sizeof(int16_t));
    if (!_dmaBuffer) {
        free(_recordBuffer);
        return false;
    }

    if (!configureI2S()) {
        return false;
    }

    _state = AudioState::IDLE;
    return true;
}

bool I2SAudio::configureI2S() {
    i2s_config_t i2s_config = {
        .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
        .sample_rate = SAMPLE_RATE,
        .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
        .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
        .communication_format = I2S_COMM_FORMAT_STAND_I2S,
        .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
        .dma_buf_count = DMA_BUF_COUNT,
        .dma_buf_len = DMA_BUF_LEN,
        .use_apll = false,
        .tx_desc_auto_clear = false,
        .fixed_mclk = 0
    };

    i2s_pin_config_t pin_config = {
        .bck_io_num = I2S_MIC_SCK_PIN,
        .ws_io_num = I2S_MIC_WS_PIN,
        .data_out_num = I2S_PIN_NO_CHANGE,
        .data_in_num = I2S_MIC_SD_PIN
    };

    esp_err_t err = i2s_driver_install(I2S_NUM_0, &i2s_config, 0, NULL);
    if (err != ESP_OK) {
        Serial.printf("Failed to install I2S driver: %d\n", err);
        return false;
    }

    err = i2s_set_pin(I2S_NUM_0, &pin_config);
    if (err != ESP_OK) {
        Serial.printf("Failed to set I2S pins: %d\n", err);
        return false;
    }

    // Clear DMA buffers
    i2s_zero_dma_buffer(I2S_NUM_0);

    Serial.println("I2S configured successfully");
    return true;
}

bool I2SAudio::startRecording() {
    if (_state == AudioState::RECORDING) {
        return false;
    }

    _recordedBytes = 0;
    _state = AudioState::RECORDING;

    // Start audio task
    xTaskCreatePinnedToCore(
        audioTaskFunc,
        "AudioTask",
        4096,
        this,
        5,
        &_audioTask,
        1  // Run on Core 1
    );

    return true;
}

void I2SAudio::stopRecording() {
    if (_state != AudioState::RECORDING) {
        return;
    }

    _state = AudioState::PROCESSING;

    // Wait for task to finish
    if (_audioTask) {
        vTaskDelete(_audioTask);
        _audioTask = nullptr;
    }

    // Call completion callback
    if (_completeCallback) {
        _completeCallback(_recordBuffer, _recordedBytes);
    }

    _state = AudioState::IDLE;
}

void I2SAudio::audioTaskFunc(void* param) {
    I2SAudio* audio = static_cast<I2SAudio*>(param);
    size_t bytesRead = 0;

    while (audio->_state == AudioState::RECORDING) {
        esp_err_t err = i2s_read(
            I2S_NUM_0,
            audio->_dmaBuffer,
            DMA_BUF_LEN * sizeof(int16_t),
            &bytesRead,
            portMAX_DELAY
        );

        if (err == ESP_OK && bytesRead > 0) {
            size_t samples = bytesRead / sizeof(int16_t);
            audio->processAudioData(audio->_dmaBuffer, samples);

            // Copy to record buffer
            if (audio->_recordedBytes + bytesRead < RECORD_BUFFER_SIZE * sizeof(int16_t)) {
                memcpy(
                    audio->_recordBuffer + audio->_recordedBytes,
                    audio->_dmaBuffer,
                    bytesRead
                );
                audio->_recordedBytes += bytesRead;
            }

            // Call data callback
            if (audio->_dataCallback) {
                audio->_dataCallback(audio->_dmaBuffer, samples);
            }
        }

        vTaskDelay(1);  // Yield to other tasks
    }

    vTaskDelete(NULL);
}

void I2SAudio::processAudioData(int16_t* samples, size_t count) {
    removeDCOffset(samples, count);
    applyGain(samples, count);

    // Calculate average amplitude for silence detection
    int64_t sum = 0;
    for (size_t i = 0; i < count; i++) {
        sum += abs(samples[i]);
        if (_noiseGateEnabled) {
            samples[i] = applyNoiseGate(samples[i]);
        }
    }
    _avgAmplitude = sum / count;
}

} // namespace Audio
}
```

---

## ✅ Acceptance Criteria

- [ ] I2S driver initializes without errors
- [ ] Audio data is captured correctly (verified with serial output)
- [ ] Sample rate is accurate (16kHz)
- [ ] DC offset is properly removed
- [ ] Gain adjustment works
- [ ] Noise gate filters low-level noise
- [ ] Recording start/stop works reliably
- [ ] No audio glitches or DMA underruns
- [ ] Memory usage is optimized (uses PSRAM)

---

## 🧪 Testing

### Test 1: Basic Audio Capture

```cpp
void setup() {
    Serial.begin(115200);
    I2SAudio::getInstance().begin();

    I2SAudio::getInstance().onAudioData([](const int16_t* data, size_t samples) {
        // Print first few samples
        for (int i = 0; i < min(samples, (size_t)10); i++) {
            Serial.printf("%d ", data[i]);
        }
        Serial.println();
    });

    I2SAudio::getInstance().startRecording();
}
```

### Test 2: Silence Detection

- Speak and verify amplitude increases
- Stay silent and verify amplitude is low

### Test 3: Recording Quality

- Record 3 seconds of speech
- Send to PC via Serial
- Analyze in Audacity

---

## 📚 References

- [ESP32 I2S Documentation](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/peripherals/i2s.html)
- [INMP441 Datasheet](https://invensense.tdk.com/wp-content/uploads/2015/02/INMP441.pdf)
- [ESP32 Audio Projects](https://github.com/atomic14/esp32-i2s-mic-test)

---

## 📝 Notes

- INMP441 outputs 24-bit data padded to 32-bit, but we use 16-bit for Whisper compatibility
- Use PSRAM for recording buffer to save internal RAM
- Consider using double buffering for smoother operation
