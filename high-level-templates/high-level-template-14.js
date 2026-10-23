// Notify when motion sensor battery drops below a threshold.

/**
 * @device motionSensor: MOTION_SENSOR
 *   @description "Motion sensor monitored for low battery level."
 *
 * @param batteryThreshold = 20.0
 *   @label "Battery Threshold (%)"
 *   @description "Battery level (%) below which a low-battery email notification is sent."
 */

var motionSensor = Shelly.getDevice("${motionSensor}"); // ${motionSensorName}

Shelly.setTriggerOnAnyChange(motionSensor, "battery < ${batteryThreshold}", () => {
  Shelly.sendEmailNotification("Motion sensor battery is " + motionSensor.battery + "%");
});
