# Task 027: Configure I2S Speaker (MAX98357A)

## 📋 Task Information

| Field        | Value                       |
| ------------ | --------------------------- |
| **Task ID**  | T027                        |
| **Phase**    | Phase 3 - ESP32 Development |
| **Priority** | High                        |
| **Estimate** | 4 hours                     |
| **Status**   | 🔲 Not Started              |

---

## 🎯 Objective

Configure I2S output with MAX98357A DAC/Amplifier for playing TTS audio responses.

---

## 📝 Requirements

### Hardware Setup

**MAX98357A Pinout to ESP32-S3:**

| MAX98357A Pin | ESP32-S3 Pin | Description          |
| ------------- | ------------ | -------------------- |
| VIN           | 3.3V         | Power supply         |
| GND           | GND          | Ground               |
| DIN           | GPIO 18      | Data Input           |
| BCLK          | GPIO 19      | Bit Clock            |
| LRC           | GPIO 20      | Left/Right Clock     |
| GAIN          | GND          | 9dB gain             |
| SD            | 3.3V (via R) | Enable (active high) |

### Audio Specifications

- Sample Rate: 16000 Hz (match input) or 22050 Hz
- Bits per Sample: 16-bit
- Channels: Mono
- Output: Up to 3.2W into 4Ω speaker

### Functional Requirements

1. **I2S Output Configuration**
   - Setup I2S peripheral in transmit mode
   - Support various sample rates
   - Proper DMA buffer sizing

2. **Audio Playback**
   - Play raw PCM audio
   - Play from buffer
   - Streaming playback support

3. **Volume Control**
   - Software volume adjustment
   - Mute function

---

## 📁 Files to Create/Modify

```
packages/esp32-firmware/
├── src/
│   ├── audio/
│   │   ├── i2s_output.h
│   │   ├── i2s_output.cpp
│   │   └── audio_config.h (update)
│   └── config.h (update pins)
```

---

## 🔧 Implementation Details

### Update audio_config.h

```cpp
// Add to existing audio_config.h

// I2S Speaker Pin Configuration for ESP32-S3
constexpr int I2S_SPK_DIN_PIN = 18;   // Data Input
constexpr int I2S_SPK_BCLK_PIN = 19;  // Bit Clock
constexpr int I2S_SPK_LRC_PIN = 20;   // Left/Right Clock
constexpr int I2S_SPK_SD_PIN = 21;    // Shutdown (optional)

// Speaker Configuration
constexpr int SPK_SAMPLE_RATE = 22050;
constexpr int SPK_BITS_PER_SAMPLE = 16;

// Playback Configuration
constexpr int PLAYBACK_BUF_SIZE = 4096;
constexpr float DEFAULT_VOLUME = 0.8f;
```

### i2s_output.h

```cpp
#ifndef I2S_OUTPUT_H
#define I2S_OUTPUT_H

#include <Arduino.h>
#include <driver/i2s.h>
#include <functional>
#include "audio_config.h"

namespace UEBot {
namespace Audio {

enum class PlaybackState {
    IDLE,
    PLAYING,
    PAUSED,
    ERROR
};

using PlaybackCompleteCallback = std::function<void()>;

class I2SOutput {
public:
    static I2SOutput& getInstance();

    // Initialization
    bool begin(int sampleRate = SPK_SAMPLE_RATE);
    void end();

    // Playback control
    bool play(const uint8_t* data, size_t length);
    bool playAsync(const uint8_t* data, size_t length);
    void stop();
    void pause();
    void resume();

    // Streaming
    bool startStream(int sampleRate = SPK_SAMPLE_RATE);
    size_t write(const uint8_t* data, size_t length);
    void endStream();

    // Volume control
    void setVolume(float volume);  // 0.0 to 1.0
    float getVolume() const { return _volume; }
    void mute();
    void unmute();
    bool isMuted() const { return _muted; }

    // Status
    PlaybackState getState() const { return _state; }
    bool isPlaying() const { return _state == PlaybackState::PLAYING; }

    // Callbacks
    void onPlaybackComplete(PlaybackCompleteCallback callback);

private:
    I2SOutput() = default;
    ~I2SOutput();
    I2SOutput(const I2SOutput&) = delete;
    I2SOutput& operator=(const I2SOutput&) = delete;

    bool configureI2S(int sampleRate);
    void applyVolume(int16_t* samples, size_t count);

    PlaybackState _state = PlaybackState::IDLE;
    float _volume = DEFAULT_VOLUME;
    bool _muted = false;
    int _currentSampleRate = SPK_SAMPLE_RATE;

    // Async playback
    TaskHandle_t _playbackTask = nullptr;
    const uint8_t* _playbackData = nullptr;
    size_t _playbackLength = 0;
    size_t _playbackPosition = 0;

    PlaybackCompleteCallback _completeCallback = nullptr;

    static void playbackTaskFunc(void* param);
};

} // namespace Audio
} // namespace UEBot

#endif // I2S_OUTPUT_H
```

### i2s_output.cpp

```cpp
#include "i2s_output.h"

namespace UEBot {
namespace Audio {

I2SOutput& I2SOutput::getInstance() {
    static I2SOutput instance;
    return instance;
}

bool I2SOutput::begin(int sampleRate) {
    _currentSampleRate = sampleRate;
    return configureI2S(sampleRate);
}

bool I2SOutput::configureI2S(int sampleRate) {
    // Use I2S_NUM_1 for output (I2S_NUM_0 used for input)
    i2s_config_t i2s_config = {
        .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
        .sample_rate = sampleRate,
        .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
        .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
        .communication_format = I2S_COMM_FORMAT_STAND_I2S,
        .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
        .dma_buf_count = 8,
        .dma_buf_len = 1024,
        .use_apll = false,
        .tx_desc_auto_clear = true,
        .fixed_mclk = 0
    };

    i2s_pin_config_t pin_config = {
        .bck_io_num = I2S_SPK_BCLK_PIN,
        .ws_io_num = I2S_SPK_LRC_PIN,
        .data_out_num = I2S_SPK_DIN_PIN,
        .data_in_num = I2S_PIN_NO_CHANGE
    };

    esp_err_t err = i2s_driver_install(I2S_NUM_1, &i2s_config, 0, NULL);
    if (err != ESP_OK) {
        Serial.printf("Failed to install I2S output driver: %d\n", err);
        return false;
    }

    err = i2s_set_pin(I2S_NUM_1, &pin_config);
    if (err != ESP_OK) {
        Serial.printf("Failed to set I2S output pins: %d\n", err);
        return false;
    }

    // Enable speaker (if SD pin is connected)
    #ifdef I2S_SPK_SD_PIN
    pinMode(I2S_SPK_SD_PIN, OUTPUT);
    digitalWrite(I2S_SPK_SD_PIN, HIGH);
    #endif

    Serial.println("I2S output configured successfully");
    return true;
}

bool I2SOutput::play(const uint8_t* data, size_t length) {
    if (_state == PlaybackState::PLAYING) {
        stop();
    }

    if (_muted) {
        return true;  // Silently succeed
    }

    _state = PlaybackState::PLAYING;

    size_t bytesWritten = 0;
    size_t remaining = length;
    const uint8_t* ptr = data;

    // Process in chunks for volume adjustment
    int16_t buffer[PLAYBACK_BUF_SIZE / 2];

    while (remaining > 0) {
        size_t chunkSize = min(remaining, sizeof(buffer));
        memcpy(buffer, ptr, chunkSize);

        // Apply volume
        applyVolume(buffer, chunkSize / sizeof(int16_t));

        size_t written;
        esp_err_t err = i2s_write(I2S_NUM_1, buffer, chunkSize, &written, portMAX_DELAY);

        if (err != ESP_OK) {
            _state = PlaybackState::ERROR;
            return false;
        }

        ptr += written;
        remaining -= written;
        bytesWritten += written;
    }

    _state = PlaybackState::IDLE;

    if (_completeCallback) {
        _completeCallback();
    }

    return true;
}

bool I2SOutput::playAsync(const uint8_t* data, size_t length) {
    if (_state == PlaybackState::PLAYING) {
        stop();
    }

    _playbackData = data;
    _playbackLength = length;
    _playbackPosition = 0;
    _state = PlaybackState::PLAYING;

    xTaskCreatePinnedToCore(
        playbackTaskFunc,
        "PlaybackTask",
        4096,
        this,
        4,
        &_playbackTask,
        1
    );

    return true;
}

void I2SOutput::playbackTaskFunc(void* param) {
    I2SOutput* output = static_cast<I2SOutput*>(param);

    int16_t buffer[PLAYBACK_BUF_SIZE / 2];

    while (output->_playbackPosition < output->_playbackLength &&
           output->_state == PlaybackState::PLAYING) {

        size_t remaining = output->_playbackLength - output->_playbackPosition;
        size_t chunkSize = min(remaining, sizeof(buffer));

        memcpy(buffer, output->_playbackData + output->_playbackPosition, chunkSize);

        if (!output->_muted) {
            output->applyVolume(buffer, chunkSize / sizeof(int16_t));
        } else {
            memset(buffer, 0, chunkSize);
        }

        size_t written;
        i2s_write(I2S_NUM_1, buffer, chunkSize, &written, portMAX_DELAY);

        output->_playbackPosition += written;

        // Handle pause
        while (output->_state == PlaybackState::PAUSED) {
            vTaskDelay(10);
        }
    }

    output->_state = PlaybackState::IDLE;

    if (output->_completeCallback) {
        output->_completeCallback();
    }

    output->_playbackTask = nullptr;
    vTaskDelete(NULL);
}

void I2SOutput::stop() {
    _state = PlaybackState::IDLE;

    if (_playbackTask) {
        vTaskDelete(_playbackTask);
        _playbackTask = nullptr;
    }

    i2s_zero_dma_buffer(I2S_NUM_1);
}

void I2SOutput::setVolume(float volume) {
    _volume = constrain(volume, 0.0f, 1.0f);
}

void I2SOutput::applyVolume(int16_t* samples, size_t count) {
    for (size_t i = 0; i < count; i++) {
        samples[i] = (int16_t)(samples[i] * _volume);
    }
}

void I2SOutput::mute() {
    _muted = true;
}

void I2SOutput::unmute() {
    _muted = false;
}

// Streaming methods
bool I2SOutput::startStream(int sampleRate) {
    if (_currentSampleRate != sampleRate) {
        end();
        begin(sampleRate);
    }
    _state = PlaybackState::PLAYING;
    return true;
}

size_t I2SOutput::write(const uint8_t* data, size_t length) {
    if (_state != PlaybackState::PLAYING) {
        return 0;
    }

    int16_t* buffer = (int16_t*)malloc(length);
    if (!buffer) return 0;

    memcpy(buffer, data, length);

    if (!_muted) {
        applyVolume(buffer, length / sizeof(int16_t));
    } else {
        memset(buffer, 0, length);
    }

    size_t written;
    i2s_write(I2S_NUM_1, buffer, length, &written, portMAX_DELAY);

    free(buffer);
    return written;
}

void I2SOutput::endStream() {
    _state = PlaybackState::IDLE;
    i2s_zero_dma_buffer(I2S_NUM_1);
}

} // namespace Audio
}
```

---

## ✅ Acceptance Criteria

- [ ] I2S output driver initializes correctly
- [ ] Audio plays without distortion
- [ ] Volume control works smoothly
- [ ] Mute/unmute functions properly
- [ ] Async playback doesn't block main loop
- [ ] Streaming mode works for TTS
- [ ] No audio clicks or pops on start/stop
- [ ] Works alongside I2S input (microphone)

---

## 🧪 Testing

### Test 1: Basic Playback

```cpp
// Generate a simple sine wave
int16_t sineWave[1000];
for (int i = 0; i < 1000; i++) {
    sineWave[i] = (int16_t)(sin(2 * PI * 440 * i / 22050) * 10000);
}

I2SOutput::getInstance().begin();
I2SOutput::getInstance().play((uint8_t*)sineWave, sizeof(sineWave));
```

### Test 2: Volume Control

- Play audio at 100%, 50%, 25% volume
- Verify smooth volume transitions

### Test 3: TTS Streaming

- Stream audio data in chunks
- Verify no gaps or glitches

---

## 📚 References

- [MAX98357A Datasheet](https://www.analog.com/media/en/technical-documentation/data-sheets/max98357a-max98357b.pdf)
- [ESP32 I2S Output](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/peripherals/i2s.html)

---

## 📝 Notes

- Use I2S_NUM_1 for output (I2S_NUM_0 reserved for microphone input)
- MAX98357A auto-detects sample rate from BCLK
- SD pin can be used to enable/disable amplifier for power saving
- Consider adding fade in/out to prevent audio clicks
