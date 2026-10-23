// Close blinds when motion is detected, illuminance is high, and temperature exceeds threshold.

/**
 * @device livingroomTemperature: TEMPERATURE_SENSOR
 *   @description "Temperature sensor in the living room used to monitor ambient temperature."
 *
 * @device livingroomMotion: MOTION_SENSOR
 *   @description "Motion sensor in the living room used to detect presence and measure illuminance."
 *
 * @device blinds: RELAY_ROLLER
 *   @description "Roller blind in the living room, closed automatically when conditions are met."
 *
 * @param illuminanceThreshold = 100
 *   @label "Illuminance Threshold (lux)"
 *   @description "Illuminance level (lux) above which the blinds may be closed."
 *
 * @param temperatureThreshold = 25
 *   @label "Temperature Threshold (°C)"
 *   @description "Temperature (°C) above which the blinds may be closed."
 *
 * @param blindsCloseDelay = "30s"
 *   @label "Blinds Close Delay"
 *   @description "Delay before the blinds are closed after the condition is met."
 */

var livingroomTemperature = Shelly.getDevice("${livingroomTemperature}"); // ${livingroomTemperatureName}
var livingroomMotion = Shelly.getDevice("${livingroomMotion}"); // ${livingroomMotionName}
var blinds = Shelly.getDevice("${blinds}"); // ${blindsName}

function closeBlinds() {
  var condition = livingroomMotion.motion &&
                  livingroomMotion.illuminance > ${illuminanceThreshold} &&
                  livingroomTemperature.temperature > ${temperatureThreshold};

  if (condition) {
    blinds.closeRoller = {
      value: true,
      delay: "${blindsCloseDelay}"
    };
  }
}

Shelly.setTriggerOnce(livingroomMotion, "motion", closeBlinds);
Shelly.setTriggerOnAnyChange(livingroomTemperature, "temperature > ${temperatureThreshold}", closeBlinds);
