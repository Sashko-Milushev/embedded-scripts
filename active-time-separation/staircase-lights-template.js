/**
*   @deviceIp relay: RELAY
*     @description "Relay"
*
*   @deviceMac doorSensor: DW_SENSOR
*     @description "Door/window BLE sensor"
*
*   @deviceMac stairsButton: BUTTON
*     @description "Bluetooth button (long press turns off relay)"
*
*   @param timeout = 3
*     @label "Relay Timeout"
*     @description "Time before the relay automatically turns off (minutes)"
*/
let OFF_DELAY_MS = ${timeout} * 60 * 1000;
let WATCHDOG_INTERVAL_MS = 5000;
let switchId = 0;
let doorSensorMac = ${doorSensor};
let buttonMacAddr = ${stairsButton};
let lastSeenMs = 0;
let offTimer = null;

let scannerRunning = false;
let isActive = true;

function ATapplyActiveState(active) {
  isActive = active;
}

function ATsetInitialActiveState() {
  if (typeof ATstart === "function") {
    ATstart();
  }
}

function ATstartScanner() {
  if (scannerRunning)
    return true;

  let res = BLE.Scanner.Start({ duration_ms: BLE.Scanner.INFINITE_SCAN, active: true });
  if (res === null) {
    print("BLE SCAN START FAILED");
    return false;
  }

  scannerRunning = true;
  return true;
}

function ATstopScanner() {
  let res = BLE.Scanner.Stop();
  if (!res) {
    print("BLE SCAN STOP FAILED");
    return false;
  }

  scannerRunning = false;
  return true;
}

function parseDoorState(payload) {
  if (typeof payload !== "string" || payload.length < 3)
    return null;

  const skip = {0x00: 1, 0x01: 1, 0x3f: 2, 0x05: 3};

  for (let i = 1, len = payload.length; i < len; ) {
    const id = payload.charCodeAt(i++);

    if (id === 0x2d)
      return payload.charCodeAt(i) === 1 ? "OPEN" : "CLOSED";

    const step = skip[id];

    if (step === undefined)
      break;

    i += step;
  }

  return null;
}

function getEvent(payload) {
  if (!payload || !payload.length)
    return null;

  const events = [null, "single", "double", "triple", "long"];

  return events[payload.charCodeAt(payload.length - 1) & 0xff] || null;
}

function turnOn() {
  Shelly.call("Switch.Set", { id: switchId, on: true });
}

function turnOff() {
  Shelly.call("Switch.Set", { id: switchId, on: false });
}

function cancelOffTimer() {
  if (offTimer !== null) {
    Timer.clear(offTimer);
    offTimer = null;
  }
}

function onOffTimer() {
  offTimer = null;
  if (Date.now() - lastSeenMs < OFF_DELAY_MS)
    return;

  turnOff();
}

function resetOffTimer() {
  cancelOffTimer();

  offTimer = Timer.set(OFF_DELAY_MS, false, onOffTimer);
}

function bleScanCallback(event, result) {
  if (event !== BLE.Scanner.SCAN_RESULT)
    return;

  if (!isActive)
    return;

  if (!result.addr)
    return;

  if (result.addr === doorSensorMac) {
    lastSeenMs = Date.now();

    if (!result.service_data || !result.service_data.fcd2)
      return;

    let door = parseDoorState(result.service_data.fcd2);

    if (door === null)
      return;

    if (door !== "OPEN")
      return;

    turnOn();
    resetOffTimer();
    return;
  }

  if (result.addr === buttonMacAddr) {
    if (!result.service_data || !result.service_data.fcd2)
      return;

    let btn = getEvent(result.service_data.fcd2);
    if (btn === null)
      return;

    if (btn === "long") {
      cancelOffTimer();
      turnOff();
    }

    return;
  }
}

function onWatchdog() {
  if (!isActive)
    return;

  if (lastSeenMs === 0)
    return;

  if (Date.now() - lastSeenMs > OFF_DELAY_MS)
    turnOff();
}

BLE.Scanner.Subscribe(bleScanCallback);
if (typeof ATstart === "function") {
  ATstart();
}
Timer.set(WATCHDOG_INTERVAL_MS, true, onWatchdog);