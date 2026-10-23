/**
*   @deviceIp relay: RELAY
*     @description "The relay for the lights"
*
*   @deviceMac motionSensor: MOTION_SENSOR
*     @description "Motion sensor"
*
*   @param holdOffTime = 1
*     @label "Hold Off Time"
*     @description "Minutes before turning off after no presence detected"
*/

let PRESENCE_TIMEOUT_MS = ${holdOffTime} * 60 * 1000;
let switchId = 0;
let motionSensorMac = ${motionSensor};

let lastSeenMs = 0;
let offTimer = null;

function setRelay(on) {
  Shelly.call("Switch.Set", { id: switchId, on: on });
}

function onOffTimer() {
  offTimer = null;

  if (Date.now() - lastSeenMs >= PRESENCE_TIMEOUT_MS)
    setRelay(false);
}

function resetTimer() {
  if (offTimer !== null) {
    Timer.clear(offTimer);
    offTimer = null;
  }

  offTimer = Timer.set(PRESENCE_TIMEOUT_MS, false, onOffTimer);
}

function bleScanCallback(event, result) {
  if (event !== BLE.Scanner.SCAN_RESULT)
    return;

  if (!result.addr || result.addr !== motionSensorMac)
    return;

  lastSeenMs = Date.now();
  setRelay(true);
  resetTimer();
}

BLE.Scanner.Start({ duration_ms: BLE.Scanner.INFINITE_SCAN, active: true });
BLE.Scanner.Subscribe(bleScanCallback);

