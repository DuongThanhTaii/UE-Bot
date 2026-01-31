# Task 028: Implement Audio Buffer Management

## 📋 Task Information

| Field        | Value                       |
| ------------ | --------------------------- |
| **Task ID**  | T028                        |
| **Phase**    | Phase 3 - ESP32 Development |
| **Priority** | High                        |
| **Estimate** | 6 hours                     |
| **Status**   | 🔲 Not Started              |

---

## 🎯 Objective

Implement efficient audio buffer management for:

- Collecting audio chunks during recording
- Converting audio formats (PCM to WAV)
- Managing memory efficiently with PSRAM
- Ring buffer for streaming audio

---

## 📝 Requirements

### Functional Requirements

1. **Audio Buffer Class**
   - Dynamic memory allocation (prefer PSRAM)
   - Append audio chunks
   - Export as WAV format
   - Reset/Clear functionality

2. **Ring Buffer**
   - Fixed-size circular buffer
   - Thread-safe read/write
   - Overflow handling

3. **Audio Format Conversion**
   - PCM to WAV header generation
   - Support 16-bit mono @ 16kHz
   - Byte order handling

---

## 📁 Files to Create

```
packages/esp32-firmware/
├── src/
│   └── audio/
│       ├── audio_buffer.h
│       ├── audio_buffer.cpp
│       ├── ring_buffer.h
│       ├── ring_buffer.cpp
│       └── wav_encoder.h
```

---

## 🔧 Implementation Details

### audio_buffer.h

```cpp
#ifndef AUDIO_BUFFER_H
#define AUDIO_BUFFER_H

#include <Arduino.h>
#include "audio_config.h"

namespace UEBot {
namespace Audio {

// WAV Header structure
struct WavHeader {
    // RIFF chunk
    char riff[4] = {'R', 'I', 'F', 'F'};
    uint32_t fileSize;
    char wave[4] = {'W', 'A', 'V', 'E'};

    // fmt chunk
    char fmt[4] = {'f', 'm', 't', ' '};
    uint32_t fmtSize = 16;
    uint16_t audioFormat = 1;  // PCM
    uint16_t numChannels = 1;  // Mono
    uint32_t sampleRate = 16000;
    uint32_t byteRate;         // sampleRate * numChannels * bitsPerSample/8
    uint16_t blockAlign;       // numChannels * bitsPerSample/8
    uint16_t bitsPerSample = 16;

    // data chunk
    char data[4] = {'d', 'a', 't', 'a'};
    uint32_t dataSize;
};

class AudioBuffer {
public:
    AudioBuffer(size_t maxSize = RECORD_BUFFER_SIZE * sizeof(int16_t));
    ~AudioBuffer();

    // Buffer operations
    bool append(const int16_t* samples, size_t count);
    bool append(const uint8_t* data, size_t bytes);
    void clear();

    // Data access
    const uint8_t* getData() const { return _buffer; }
    size_t getSize() const { return _position; }
    size_t getSampleCount() const { return _position / sizeof(int16_t); }
    size_t getCapacity() const { return _maxSize; }
    size_t getAvailable() const { return _maxSize - _position; }
    bool isEmpty() const { return _position == 0; }
    bool isFull() const { return _position >= _maxSize; }

    // Duration
    float getDurationMs() const;
    float getDurationSec() const { return getDurationMs() / 1000.0f; }

    // WAV export
    size_t getWavSize() const;
    bool exportWav(uint8_t* output, size_t* outputSize);
    uint8_t* createWavBuffer(size_t* outSize);

    // Static helper
    static WavHeader createWavHeader(uint32_t dataSize,
                                      uint32_t sampleRate = 16000,
                                      uint16_t channels = 1,
                                      uint16_t bitsPerSample = 16);

private:
    uint8_t* _buffer;
    size_t _maxSize;
    size_t _position;
    bool _usePsram;
};

} // namespace Audio
} // namespace UEBot

#endif // AUDIO_BUFFER_H
```

### ring_buffer.h

```cpp
#ifndef RING_BUFFER_H
#define RING_BUFFER_H

#include <Arduino.h>
#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>

namespace UEBot {
namespace Audio {

template<typename T, size_t SIZE>
class RingBuffer {
public:
    RingBuffer() {
        _mutex = xSemaphoreCreateMutex();
        clear();
    }

    ~RingBuffer() {
        if (_mutex) {
            vSemaphoreDelete(_mutex);
        }
    }

    // Write operations
    bool write(const T& item) {
        if (xSemaphoreTake(_mutex, portMAX_DELAY) != pdTRUE) {
            return false;
        }

        if (isFull()) {
            // Overwrite oldest item
            _readIndex = (_readIndex + 1) % SIZE;
            _count--;
        }

        _buffer[_writeIndex] = item;
        _writeIndex = (_writeIndex + 1) % SIZE;
        _count++;

        xSemaphoreGive(_mutex);
        return true;
    }

    size_t write(const T* items, size_t count) {
        size_t written = 0;
        for (size_t i = 0; i < count; i++) {
            if (write(items[i])) {
                written++;
            }
        }
        return written;
    }

    // Read operations
    bool read(T& item) {
        if (xSemaphoreTake(_mutex, portMAX_DELAY) != pdTRUE) {
            return false;
        }

        if (isEmpty()) {
            xSemaphoreGive(_mutex);
            return false;
        }

        item = _buffer[_readIndex];
        _readIndex = (_readIndex + 1) % SIZE;
        _count--;

        xSemaphoreGive(_mutex);
        return true;
    }

    size_t read(T* items, size_t maxCount) {
        size_t readCount = 0;
        while (readCount < maxCount && read(items[readCount])) {
            readCount++;
        }
        return readCount;
    }

    // Peek without removing
    bool peek(T& item) const {
        if (isEmpty()) return false;
        item = _buffer[_readIndex];
        return true;
    }

    // Status
    bool isEmpty() const { return _count == 0; }
    bool isFull() const { return _count >= SIZE; }
    size_t size() const { return _count; }
    size_t capacity() const { return SIZE; }
    size_t available() const { return SIZE - _count; }

    // Clear
    void clear() {
        if (xSemaphoreTake(_mutex, portMAX_DELAY) == pdTRUE) {
            _readIndex = 0;
            _writeIndex = 0;
            _count = 0;
            xSemaphoreGive(_mutex);
        }
    }

private:
    T _buffer[SIZE];
    size_t _readIndex = 0;
    size_t _writeIndex = 0;
    size_t _count = 0;
    SemaphoreHandle_t _mutex;
};

// Specialized audio ring buffer
class AudioRingBuffer {
public:
    AudioRingBuffer(size_t sizeInSamples);
    ~AudioRingBuffer();

    size_t write(const int16_t* samples, size_t count);
    size_t read(int16_t* samples, size_t maxCount);

    size_t available() const { return _count; }
    size_t freeSpace() const { return _size - _count; }
    void clear();

private:
    int16_t* _buffer;
    size_t _size;
    size_t _readIndex;
    size_t _writeIndex;
    size_t _count;
    SemaphoreHandle_t _mutex;
};

} // namespace Audio
} // namespace UEBot

#endif // RING_BUFFER_H
```

### audio_buffer.cpp

```cpp
#include "audio_buffer.h"
#include <esp_heap_caps.h>

namespace UEBot {
namespace Audio {

AudioBuffer::AudioBuffer(size_t maxSize) : _maxSize(maxSize), _position(0) {
    // Try to allocate from PSRAM first
    _buffer = (uint8_t*)heap_caps_malloc(maxSize, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT);

    if (_buffer) {
        _usePsram = true;
        Serial.printf("AudioBuffer: Allocated %d bytes from PSRAM\n", maxSize);
    } else {
        // Fallback to internal RAM
        _buffer = (uint8_t*)malloc(maxSize);
        _usePsram = false;
        Serial.printf("AudioBuffer: Allocated %d bytes from internal RAM\n", maxSize);
    }

    if (!_buffer) {
        Serial.println("AudioBuffer: Failed to allocate memory!");
        _maxSize = 0;
    }
}

AudioBuffer::~AudioBuffer() {
    if (_buffer) {
        if (_usePsram) {
            heap_caps_free(_buffer);
        } else {
            free(_buffer);
        }
    }
}

bool AudioBuffer::append(const int16_t* samples, size_t count) {
    return append((const uint8_t*)samples, count * sizeof(int16_t));
}

bool AudioBuffer::append(const uint8_t* data, size_t bytes) {
    if (!_buffer || _position + bytes > _maxSize) {
        return false;
    }

    memcpy(_buffer + _position, data, bytes);
    _position += bytes;
    return true;
}

void AudioBuffer::clear() {
    _position = 0;
}

float AudioBuffer::getDurationMs() const {
    // Duration = samples / sampleRate * 1000
    size_t samples = _position / sizeof(int16_t);
    return (float)samples / SAMPLE_RATE * 1000.0f;
}

WavHeader AudioBuffer::createWavHeader(uint32_t dataSize,
                                        uint32_t sampleRate,
                                        uint16_t channels,
                                        uint16_t bitsPerSample) {
    WavHeader header;
    header.numChannels = channels;
    header.sampleRate = sampleRate;
    header.bitsPerSample = bitsPerSample;
    header.byteRate = sampleRate * channels * bitsPerSample / 8;
    header.blockAlign = channels * bitsPerSample / 8;
    header.dataSize = dataSize;
    header.fileSize = 36 + dataSize;  // 36 = header size - 8
    return header;
}

size_t AudioBuffer::getWavSize() const {
    return sizeof(WavHeader) + _position;
}

bool AudioBuffer::exportWav(uint8_t* output, size_t* outputSize) {
    if (!output || !outputSize || *outputSize < getWavSize()) {
        return false;
    }

    WavHeader header = createWavHeader(_position, SAMPLE_RATE, 1, 16);

    // Copy header
    memcpy(output, &header, sizeof(WavHeader));

    // Copy audio data
    memcpy(output + sizeof(WavHeader), _buffer, _position);

    *outputSize = getWavSize();
    return true;
}

uint8_t* AudioBuffer::createWavBuffer(size_t* outSize) {
    size_t wavSize = getWavSize();

    // Try PSRAM first
    uint8_t* wavBuffer = (uint8_t*)heap_caps_malloc(wavSize, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT);
    if (!wavBuffer) {
        wavBuffer = (uint8_t*)malloc(wavSize);
    }

    if (!wavBuffer) {
        return nullptr;
    }

    if (!exportWav(wavBuffer, &wavSize)) {
        free(wavBuffer);
        return nullptr;
    }

    *outSize = wavSize;
    return wavBuffer;
}

// AudioRingBuffer implementation
AudioRingBuffer::AudioRingBuffer(size_t sizeInSamples)
    : _size(sizeInSamples), _readIndex(0), _writeIndex(0), _count(0) {
    _buffer = (int16_t*)heap_caps_malloc(sizeInSamples * sizeof(int16_t),
                                          MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT);
    if (!_buffer) {
        _buffer = (int16_t*)malloc(sizeInSamples * sizeof(int16_t));
    }
    _mutex = xSemaphoreCreateMutex();
}

AudioRingBuffer::~AudioRingBuffer() {
    if (_buffer) free(_buffer);
    if (_mutex) vSemaphoreDelete(_mutex);
}

size_t AudioRingBuffer::write(const int16_t* samples, size_t count) {
    if (!_buffer || !xSemaphoreTake(_mutex, portMAX_DELAY)) {
        return 0;
    }

    size_t written = 0;
    for (size_t i = 0; i < count && _count < _size; i++) {
        _buffer[_writeIndex] = samples[i];
        _writeIndex = (_writeIndex + 1) % _size;
        _count++;
        written++;
    }

    xSemaphoreGive(_mutex);
    return written;
}

size_t AudioRingBuffer::read(int16_t* samples, size_t maxCount) {
    if (!_buffer || !xSemaphoreTake(_mutex, portMAX_DELAY)) {
        return 0;
    }

    size_t readCount = 0;
    while (readCount < maxCount && _count > 0) {
        samples[readCount] = _buffer[_readIndex];
        _readIndex = (_readIndex + 1) % _size;
        _count--;
        readCount++;
    }

    xSemaphoreGive(_mutex);
    return readCount;
}

void AudioRingBuffer::clear() {
    if (xSemaphoreTake(_mutex, portMAX_DELAY)) {
        _readIndex = 0;
        _writeIndex = 0;
        _count = 0;
        xSemaphoreGive(_mutex);
    }
}

} // namespace Audio
}
```

---

## ✅ Acceptance Criteria

- [ ] AudioBuffer allocates from PSRAM when available
- [ ] Can store at least 10 seconds of 16kHz 16-bit audio
- [ ] WAV export produces valid WAV files
- [ ] RingBuffer is thread-safe
- [ ] No memory leaks
- [ ] Works correctly with I2S input/output

---

## 🧪 Testing

### Test 1: Memory Allocation

```cpp
AudioBuffer buffer;
Serial.printf("Capacity: %d bytes\n", buffer.getCapacity());
Serial.printf("Using PSRAM: %s\n", buffer.usePsram() ? "Yes" : "No");
```

### Test 2: WAV Export

```cpp
// Record audio
AudioBuffer buffer;
// ... append audio data ...

// Export WAV
size_t wavSize;
uint8_t* wav = buffer.createWavBuffer(&wavSize);
// Send over serial or WebSocket
```

### Test 3: Ring Buffer Thread Safety

- Write from one task, read from another
- Verify no data corruption

---

## 📚 References

- [WAV File Format](http://soundfile.sapp.org/doc/WaveFormat/)
- [ESP32 PSRAM](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/system/mem_alloc.html)

---

## 📝 Notes

- ESP32-S3 has 8MB PSRAM - plenty for audio buffers
- WAV format is required for Whisper API
- Ring buffer useful for streaming scenarios
