/**
 * @device heater: RELAY
 *   @description "Heating actuator relay (holds the script)"
 *
 * @device humidityAndTemperatureSensor: TH_SENSOR
 *   @description "H&T G3 sensor"
 *
 * @param targetTemp = 23
 *   @label "Target Temperature"
 *   @description "Desired temperature in Celsius"
 *
 * @param hysteresis = 1
 *   @label "Hysteresis"
 *   @description "Temperature buffer around target to prevent rapid switching"
 *
 * @param tempMin = 5
 *   @label "Minimum Temperature"
 *   @description "Safety minimum — relay not controlled below this value"
 *
 * @param tempMax = 35
 *   @label "Maximum Temperature"
 *   @description "Safety maximum — relay forced OFF above this value"
 *
 * @param mode = ["heat", "cool"]
 *   @label "Mode"
 *   @description "Thermostat mode: 'heat' turns relay ON when cold, 'cool' turns relay ON when hot"
 *
 * @param failsafeOn = ["off", "on"]
 *   @label "Failsafe Relay State"
 *   @description "Relay state when sensor data is missing or stale"
 */

var heater = Shelly.getDevice("${heater}"); // ${heaterName}
var humidityAndTemperatureSensor = Shelly.getDevice("${humidityAndTemperatureSensor}"); // ${humidityAndTemperatureSensorName}
var failsafe = "${failsafeOn}" === "on";

var lowTarget = ${targetTemp} - ${hysteresis};
var highTarget = ${targetTemp} + ${hysteresis};

function onLowTarget() {
    if ("${mode}" === "heat")
        heater.o1On = true;
    else if ("${mode}" === "cool")
        heater.o1On = false;
}

function onHighTarget() {
    if ("${mode}" === "heat")
        heater.o1On = false;
    else if ("${mode}" === "cool")
        heater.o1On = true;
}

Shelly.setTriggerOnAnyChange(humidityAndTemperatureSensor, "temperature < " + ${tempMin}, () => {heater.o1On = failsafe;});

Shelly.setTriggerOnAnyChange(humidityAndTemperatureSensor, "temperature > " + ${tempMax}, () => {heater.o1On = failsafe;});

Shelly.setTriggerOnAnyChange(humidityAndTemperatureSensor, "temperature < " + lowTarget, onLowTarget);

Shelly.setTriggerOnAnyChange(humidityAndTemperatureSensor, "temperature > " + highTarget, onHighTarget);