// Opening the door turns on the relay for a limited amount of time. The relay can also be turned off, using the BT Button.


/**
 * @device doorSensor: DW_SENSOR
 *   @description "Door sensor"
 *
 * @device relay: RELAY
 *   @description "Relay"
 *
 *   @device stairsButton: BUTTON
 *    @description "Bluetooth button"
 *
 * @param timeout = 3m
 *   @label "Relay Timeout"
 *   @description "Time before the relay automatically turn off"
 *
 */

var relay = Shelly.getDevice("${relay}"); // ${relayName}
var doorSensor = Shelly.getDevice("${doorSensor}"); // ${doorSensorName}
var stairsButton = Shelly.getDevice("${stairsButton}"); // ${stairsButtonName}

function turnOnRelay() {

    relay.o1On = { value: true, timeout: "${timeout}" };

}

Shelly.setTriggerOnAnyChange(doorSensor, "open",  turnOnRelay);
Shelly.setTriggerOnce(stairsButton, "o1PressedLong", () => {relay.o1On = false});