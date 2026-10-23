
/**
 *
 * @device kidsBathroomLights : RELAY
 *   @description "The relay for the kids bathroom lights"
 *
 * @device kidsBathroomMotion : MOTION_SENSOR
 *   @description "Kids bathroom motion sensor"
 *
 * @param highIlluminanceValue = 100
 *   @label "highIlluminanceValue"
 *   @description "A maximum threshold of the illuminance for the lights to turn on"
 */

var kidsBathroomLights = Shelly.getDevice("${kidsBathroomLights}"); // ${kidsBathroomLightsName}
var kidsBathroomMotion = Shelly.getDevice("${kidsBathroomMotion}"); // ${kidsBathroomMotionName}

function kidsBathroomLightsOn() {
  if (kidsBathroomMotion.illuminance < ${highIlluminanceValue}) {
    kidsBathroomLights.on = true
  }
}
Shelly.setTriggerOnce(kidsBathroomMotion, "motion", kidsBathroomLightsOn);