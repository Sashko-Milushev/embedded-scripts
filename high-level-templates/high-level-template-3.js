// Motion activates the relay for the lights; it switches off after 1 minute of inactivity.

/**
 * @device relay: RELAY
 *   @description "The relay for the lights"
 *
 * @device motionSensor: MOTION_SENSOR
 *   @description "Motion sensor"
 *
 * @param holdOffTime = 1
 *   @label "Hold Off Time"
 *   @description "Time in minutes before turning off the relays after no motion is detected"
 *
 */

var relay = Shelly.getDevice("${relay}"); // ${relayName}
var motionSensor = Shelly.getDevice("${motionSensor}"); // ${motionSensorName}

function turnOnRelay() {
    relay.on = true;
}

function turnOffRelay() {
    relay.on = false;
}

Shelly.setTriggerOnce(motionSensor, "motion",  turnOnRelay);

Shelly.setTriggerWithHoldOff(motionSensor, "noMotion", ${holdOffTime},  turnOffRelay);