#include "led_indicator.h"

namespace UEBot {
namespace Utils {

LEDIndicator::LEDIndicator(uint8_t pin, bool activeLow)
    : _pin(pin)
    , _activeLow(activeLow)
    , _pattern(LEDPattern::OFF)
    , _ledState(false)
    , _lastUpdate(0)
    , _blinkPhase(0) {
}

void LEDIndicator::begin() {
    pinMode(_pin, OUTPUT);
    applyState(false);
}

void LEDIndicator::loop() {
    unsigned long now = millis();

    switch (_pattern) {
        case LEDPattern::OFF:
            applyState(false);
            break;

        case LEDPattern::ON:
            applyState(true);
            break;

        case LEDPattern::BLINK_SLOW:
            if (now - _lastUpdate > 1000) {
                _lastUpdate = now;
                toggle();
            }
            break;

        case LEDPattern::BLINK_FAST:
            if (now - _lastUpdate > 200) {
                _lastUpdate = now;
                toggle();
            }
            break;

        case LEDPattern::PULSE:
            // Simple pulse using PWM would be better, but this is basic
            if (now - _lastUpdate > 50) {
                _lastUpdate = now;
                toggle();
            }
            break;

        case LEDPattern::DOUBLE_BLINK:
            if (now - _lastUpdate > (_blinkPhase < 4 ? 100 : 500)) {
                _lastUpdate = now;
                toggle();
                _blinkPhase = (_blinkPhase + 1) % 6;
            }
            break;
    }
}

void LEDIndicator::setPattern(LEDPattern pattern) {
    _pattern = pattern;
    _lastUpdate = 0;
    _blinkPhase = 0;
}

void LEDIndicator::on() {
    _pattern = LEDPattern::ON;
    applyState(true);
}

void LEDIndicator::off() {
    _pattern = LEDPattern::OFF;
    applyState(false);
}

void LEDIndicator::toggle() {
    _ledState = !_ledState;
    applyState(_ledState);
}

void LEDIndicator::applyState(bool state) {
    _ledState = state;
    digitalWrite(_pin, _activeLow ? !state : state);
}

} // namespace Utils
} // namespace UEBot
