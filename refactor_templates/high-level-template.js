/* Monitors if the washing machine has been consuming over 500W in the last 10 minutes and sends a notification.
/**
 * @device washingMachine: E_METER
 *   @description "The washing machine energy meter"
 *
 * @param powerThreshold = 500.0
 *   @label "Power Threshold (W)"
 *   @description "Power consumption threshold in watts"
 */

const params = {
    holdOff: 10
}
var washingMachine = Shelly.getDevice("${washingMachine}"); // ${washingMachineName}

var notification = "Washing machine is consuming over " + ${powerThreshold} + "W for 10 minutes!";

Shelly.setTriggerWithHoldOff(washingMachine, "powerConsumption > " + ${powerThreshold}), params.holdOff, () => Shelly.sendPhoneStandardNotification(notification));
