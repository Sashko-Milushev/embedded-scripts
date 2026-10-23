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
var motion = Shelly.getDevice("${motionSensor}");
var relay = Shelly.getDevice("${relay}");

Shelly.setTriggerWithHoldOff(motion, "motion", params.holdOffTime, relay.o1On = true);
Shelly.setTriggerOnce(motion, "noMotion", relay.o1On = false);