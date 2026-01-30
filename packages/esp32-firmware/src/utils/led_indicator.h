#ifndef LED_INDICATOR_H
#define LED_INDICATOR_H

#include <Arduino.h>

namespace UEBot {
namespace Utils {

enum class LEDPattern {
    OFF,
    ON,
    BLINK_SLOW,
    BLINK_FAST,
    PULSE,
    DOUBLE_BLINK
};

class LEDIndicator {
public:
    LEDIndicator(uint8_t pin, bool activeLow = false);

    void begin();
    void loop();

    void setPattern(LEDPattern pattern);
    void on();
    void off();
    void toggle();

private:
    uint8_t _pin;
    bool _activeLow;
    LEDPattern _pattern;
    bool _ledState;
    unsigned long _lastUpdate;
    int _blinkPhase;

    void applyState(bool state);
};

} // namespace Utils
} // namespace UEBot

#endif // LED_INDICATOR_H
