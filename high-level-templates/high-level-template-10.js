// Turn off washing machine on flood detection; notify when cycle is done; remind to clean after N cycles.

/**
 * @device washingMachine: RELAY
 *   @description "Relay controlling the washing machine power outlet."
 *
 * @device floodSensor: FLOOD_SENSOR
 *   @description "Flood sensor placed under the washing machine to detect water leaks."
 *
 * @param floodHoldOff = 3
 *   @label "Flood Hold-Off (min)"
 *   @description "Minutes of continuous flood detection before the washing machine is turned off."
 *
 * @param idlePowerThreshold = 50
 *   @label "Idle Power Threshold (W)"
 *   @description "Power consumption (watts) below which the washing machine is considered done."
 *
 * @param idleHoldOff = 10
 *   @label "Idle Hold-Off (min)"
 *   @description "Minutes the power must stay below the threshold before sending the done notification."
 *
 * @param cleaningCycleCount = 30
 *   @label "Cleaning Reminder Cycle Count"
 *   @description "Number of completed wash cycles before a cleaning reminder notification is sent."
 *
 * @param cleaningScheduleTime = "9:00"
 *   @label "Cleaning Check Time"
 *   @description "Time of day (HH:MM) when the cleaning cycle counter is checked."
 *
 * @param cleaningScheduleDays = [6]
 *   @label "Cleaning Check Days"
 *   @description "Days of the week (0=Sun … 6=Sat) on which the cleaning check runs."
 */

var washingMachine = Shelly.getDevice("${washingMachine}"); // ${washingMachineName}
var floodSensor = Shelly.getDevice("${floodSensor}"); // ${floodSensorName}

if (global.cycleCounter === undefined) {
  global.cycleCounter = 0;
}

function cleaningWashingMachine() {
  if (global.cycleCounter >= ${cleaningCycleCount}) {
    Shelly.sendPhoneStandardNotification("Clean the Washing machine!", "0");
    global.cycleCounter = 0;
  }
}

Shelly.setTriggerWithHoldOff(floodSensor, "flood", ${floodHoldOff}, () => { washingMachine.o1On = false; });
Shelly.setTriggerWithHoldOff(washingMachine, "o1PowerConsumption < ${idlePowerThreshold}", ${idleHoldOff}, () => {
  Shelly.sendPhoneStandardNotification("Washing machine is done.", "0");
  global.cycleCounter++;
});

Shelly.setScheduleTrigger("${cleaningScheduleTime}", ${cleaningScheduleDays}, cleaningWashingMachine);
