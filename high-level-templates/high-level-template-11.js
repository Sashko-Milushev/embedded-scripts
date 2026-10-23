// Track high-power consumption peaks across devices; query count via button; reset daily with email report.

/**
 * @device officeClima: RELAY
 *   @description "Relay controlling the office air conditioning unit, monitored for power peaks."
 *
 * @device washingMachine: RELAY
 *   @description "Relay controlling the washing machine, monitored for power peaks."
 *
 * @device hydrophorePump: RELAY
 *   @description "Relay controlling the hydrophore pump, monitored for power peaks."
 *
 * @device clima: RELAY
 *   @description "Relay controlling the main climate system, monitored for power peaks."
 *
 * @device bluetoothButton: BUTTON
 *   @description "Bluetooth button used to query the current peak consumption count."
 *
 * @param peakPowerThreshold = 1500
 *   @label "Peak Power Threshold (W)"
 *   @description "Power consumption (watts) above which a device is considered to be in a peak state."
 *
 * @param holdOff = 1
 *   @label "Peak Hold-Off (min)"
 *   @description "Minutes a device must stay above the threshold before the peak is counted."
 */

const params = {
  resetScheduleTime: "23:59",
  resetScheduleDays: [1, 2, 3, 4, 5, 6, 7]
};

var officeClima = Shelly.getDevice("${officeClima}"); // ${officeClimaName}
var washingMachine = Shelly.getDevice("${washingMachine}"); // ${washingMachineName}
var hydrophorePump = Shelly.getDevice("${hydrophorePump}"); // ${hydrophorePumpName}
var clima = Shelly.getDevice("${clima}"); // ${climaName}
var bluetoothButton = Shelly.getDevice("${bluetoothButton}"); // ${bluetoothButtonName}

function peaksIncrement() {
  if (global.consumptionPeaks === undefined) {
    global.consumptionPeaks = 0;
  }

  global.consumptionPeaks++;

  Shelly.sendPhoneStandardNotification(
    "Peaks incremented to " + global.consumptionPeaks,
    "0"
  );
}

Shelly.setTriggerWithHoldOff(officeClima, "o1PowerConsumption > ${peakPowerThreshold}", ${holdOff}, peaksIncrement);
Shelly.setTriggerWithHoldOff(washingMachine, "o1PowerConsumption > ${peakPowerThreshold}", ${holdOff}, peaksIncrement);
Shelly.setTriggerWithHoldOff(hydrophorePump, "o1PowerConsumption > ${peakPowerThreshold}", ${holdOff}, peaksIncrement);
Shelly.setTriggerWithHoldOff(clima, "o1PowerConsumption > ${peakPowerThreshold}", ${holdOff}, peaksIncrement);

function getPeaksValue() {
  if (global.consumptionPeaks === undefined) {
    Shelly.sendPhoneStandardNotification("Value is 0", "0");
  } else {
    Shelly.sendPhoneStandardNotification(
      "Value is " + global.consumptionPeaks,
      "0"
    );
  }
}

Shelly.setTriggerOnce(bluetoothButton, "o1PressedTwice", getPeaksValue);

function clearPeaksCount() {
  var value;

  if (global.consumptionPeaks === undefined) {
    value = 0;
  } else {
    value = global.consumptionPeaks;
  }

  Shelly.sendEmailNotification(
    "Peaks value will be cleared. Value before reset: " + value,
    "0"
  );

  global.consumptionPeaks = 0;
}

Shelly.setScheduleTrigger(params.resetScheduleTime, params.resetScheduleDays, clearPeaksCount);
