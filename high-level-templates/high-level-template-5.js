/**
 * @device kidsBathroomLights: RELAY
 *   @description "The relay for the kids bathroom lights"
 *
 * @device kidsBathroomMotion: MOTION_SENSOR
 *   @description "Kids bathroom motion sensor"
 *
 * @param holdOff = 10
 *   @label "Hold Off Time"
 *   @description "Minutes of no motion before the lights turn off"
 */

var kidsBathroomLights = Shelly.getDevice("${kidsBathroomLights}"); // ${kidsBathroomLightsName}
var kidsBathroomMotion = Shelly.getDevice("${kidsBathroomMotion}"); // ${kidsBathroomMotionName}

function kidsBathroomLightsOff() {
  if (kidsBathroomLights.o1On) {
    kidsBathroomLights.o1On = false;
  }
}

Shelly.setTriggerWithHoldOff(kidsBathroomMotion, "noMotion", ${holdOff}, kidsBathroomLightsOff);

