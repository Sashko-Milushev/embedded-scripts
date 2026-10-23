/**
*   @deviceIp kidsBathroomLights: RELAY
*     @description "The relay for the kids bathroom lights"
*
*   @deviceMac kidsBathroomMotion: MOTION_SENSOR
*     @description "Kids bathroom motion sensor"
*
*   @param holdOff = 10
*     @label "Hold Off Time"
*     @description "Minutes of no motion before the lights turn off"
*/

let motionSensorMac = ${kidsBathroomMotion};
let NO_MOTION_MS = ${holdOff} * 60 * 1000;
let WATCHDOG_MS = 5000;
let switchId = 0;

let lastSeen = 0;
let offTimer = null;

function turnOff() {
  Shelly.call("Switch.Set", { id: switchId, on: false });
}

function onOffTimer() {
  offTimer = null;
  turnOff();
}

function resetTimer() {
  if (offTimer !== null) {
    Timer.clear(offTimer);
    offTimer = null;
  }

  offTimer = Timer.set(NO_MOTION_MS, false, onOffTimer);
}

function bleCallback(event, result) {
  if (event !== BLE.Scanner.SCAN_RESULT)
    return;

  if (!result.addr || result.addr !== motionSensorMac)
    return;

  lastSeen = Date.now();
  resetTimer();
}

function onWatchdog() {
  if (lastSeen === 0)
    return;

  if (Date.now() - lastSeen > NO_MOTION_MS)
    turnOff();
}

BLE.Scanner.Start({ duration_ms: BLE.Scanner.INFINITE_SCAN, active: true });
BLE.Scanner.Subscribe(bleCallback);
Timer.set(WATCHDOG_MS, true, onWatchdog);
