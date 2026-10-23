// Cut power to boiler when total active power exceeds a set threshold.

/**
 * @device powerMeter: RELAY
 *   @description "Power meter device used to monitor total active power consumption."
 *
 * @device boiler: RELAY
 *   @description "Relay controlling the boiler, turned off when power exceeds the threshold."
 *
 * @param powerThreshold = 3000
 *   @label "Power Threshold (W)"
 *   @description "Active power (watts) at or above which the boiler is turned off."
 */

var powerMeter = Shelly.getDevice("${powerMeter}"); // ${powerMeterName}
var boiler = Shelly.getDevice("${boiler}"); // ${boilerName}

Shelly.setTriggerOnce(powerMeter, "aPower >= ${powerThreshold}", () => { boiler.off = true; });
