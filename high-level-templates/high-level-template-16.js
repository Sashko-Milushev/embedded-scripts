// Send a phone notification when motion is detected.

/**
 * @device motionSensor: MOTION_SENSOR
 *   @description "Motion sensor that triggers a phone notification when motion is detected."
 */

var motionSensor = Shelly.getDevice("${motionSensor}"); // ${motionSensorName}

Shelly.setTriggerOnce(motionSensor, "motion", () => {
  Shelly.sendPhoneStandardNotification("Motion detected");
});
