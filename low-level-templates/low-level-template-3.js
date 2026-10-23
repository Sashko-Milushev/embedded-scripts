/**
*   @deviceIp relay: RELAY
*     @description "The relay for the lights"
*
*   @deviceMac motionSensor: MOTION_SENSOR
*     @description "Motion sensor"
*
*   @param holdOffTime = 1
*     @label "Hold Off Time"
*     @description "Minutes before turning off after no motion detected"
*/

let NO_MOTION_OFF_DELAY_MS = ${holdOffTime} * 60 * 1000;
let FORCE_NO_MOTION_TIMEOUT_MS = 90000;
let WATCHDOG_INTERVAL_MS = 5000;
let switchId = 0;
let motionSensorMac = ${motionSensor};

let motionState = "unknown";
let lastSeenMs = 0;
let offTimer = null;

function motionStateParser(payload) {
  if (!payload || payload.length < 2)
    return null;

  let bytes = [];

  for (let i = 0; i < payload.length; i++)
    bytes.push(payload.charCodeAt(i) & 0xff);

  for (let i = bytes.length - 2; i >= 0; i--) {
    if (bytes[i] !== 0x21)
      continue;

    switch (bytes[i + 1]) {
      case 0x01:
        return "motion";

      case 0x00:
        return "no_motion";
    }
  }

  return null;
}

function cancelOffTimer() {
  if (offTimer !== null) {
    Timer.clear(offTimer);
    offTimer = null;
  }
}

function onOffTimer() {
  offTimer = null;
  if (motionState !== "no_motion")
    return;

  Shelly.call("Switch.Set", { id: switchId, on: false });
}

function startOffTimer() {
  cancelOffTimer();

  offTimer = Timer.set(NO_MOTION_OFF_DELAY_MS, false, onOffTimer);
}

function handleStateChange(newState) {
  if (newState === motionState)
    return;

  motionState = newState;
  if (motionState === "motion") {
    cancelOffTimer();
    Shelly.call("Switch.Set", { id: switchId, on: true });
    return;
  }

  if (motionState === "no_motion")
    startOffTimer();
}

function bleScanCallback(event, result) {
  if (event !== BLE.Scanner.SCAN_RESULT)
    return;

  if (!result.addr || result.addr !== motionSensorMac)
    return;

  let payload = "";
  if (result.service_data && result.service_data.fcd2)
    payload = result.service_data.fcd2;

  let parsedState = motionStateParser(payload);
  lastSeenMs = Date.now();
  if (parsedState === null)
    return;

  if (motionState === "unknown") {
    motionState = parsedState;

    if (motionState === "motion")
      Shelly.call("Switch.Set", { id: switchId, on: true });

    return;
  }

  handleStateChange(parsedState);
}

function onWatchdog() {
  if (lastSeenMs === 0)
    return;

  if (Date.now() - lastSeenMs > FORCE_NO_MOTION_TIMEOUT_MS) {
    if (motionState !== "no_motion")
      handleStateChange("no_motion");
  }
}

BLE.Scanner.Start({ duration_ms: BLE.Scanner.INFINITE_SCAN, active: true });
BLE.Scanner.Subscribe(bleScanCallback);
Timer.set(WATCHDOG_INTERVAL_MS, true, onWatchdog);
