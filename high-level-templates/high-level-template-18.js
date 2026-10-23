/**
 * @device curtain: RELAY_ROLLER
 *   @description "The curtain roller to control"
 *
 * @device motionSensor: MOTION_SENSOR
 *   @description "Motion sensor"
 *
 * @param closeAbove = 500.0
 *   @label "Close Above"
 *   @description "Close curtain when motion is detected above this value"
 *
 */

var curtain = Shelly.getDevice("${curtain}"); //${curtainName}
var motionSensor = Shelly.getDevice("${motionSensor}"); //${motionSensorName}

function controlCurtain() {
    if (motionSensor.illuminance > ${closeAbove}) {
        curtain.open = false;
    }
    else if (motionSensor.illuminance < ${closeAbove}) {
        curtain.open = true;
    }
}

Shelly.setTriggerOnce(motionSensor, "motion", controlCurtain);