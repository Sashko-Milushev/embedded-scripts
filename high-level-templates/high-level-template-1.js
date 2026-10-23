// Pressing the Bluetooth button turns on the water pump for a limited amount of time.

/**
 * @device waterPump: RELAY
 *   @description "Water pump relay"
 *
 * @device waterButton: BUTTON
 *   @description "Bluetooth button"
 *
 * @param timeout = 15m
 *   @label "Pump Timeout"
 *   @description "Time before the water pump automatically turns off"
 *
 */

var waterPump = Shelly.getDevice("${waterPump}"); // ${waterPumpName}
var waterButton = Shelly.getDevice("${waterButton}"); // ${waterButtonName}

Shelly.setTriggerOnce(waterButton, "o1PressedOnce", () => {
    waterPump.o1On = { value: true, timeout: "${timeout}" };
});