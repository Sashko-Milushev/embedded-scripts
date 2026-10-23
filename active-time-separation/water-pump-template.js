/**
*   @deviceIp waterPump: RELAY
*     @description "Water pump relay"
*
*   @deviceMac waterButton: BUTTON
*     @description "Bluetooth button"
*
*   @param timeout = 15
*     @label "Pump Timeout"
*     @description "Time before the water pump automatically turns off (minutes)"
*/
let isActive = true;

let scannerRunning = false;
let BUTTON_MAC = ${waterButton};
let DEBOUNCE_MS = 1500;
let AUTO_OFF_DELAY_MS = ${timeout} * 60 * 1000;

let lastTriggerMs = 0;
let autoOffTimer = null;
let switchId = 0;
// ==========asdasdsadsa
......
// ==============
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
    return;

  let res = BLE.Scanner.Start({ duration_ms: BLE.Scanner.INFINITE_SCAN, active: true });
  if (res === null) {
    print("BLE SCAN START FAILED");
    return;
  }

  scannerRunning = true;
}

function ATstopScanner() {
  let res = BLE.Scanner.Stop();
  if (!res) {
    print("BLE SCAN STOP FAILED");
    return;
  }

  scannerRunning = false;
}

function parseButtonEvent(payload) {
  if (!payload || payload.length < 2)
    return null;

  let i = 1;
  while (i < payload.length) {
    let id = payload.charCodeAt(i++) & 0xff;

    switch (id) {
      case 0x3a:
        return payload.charCodeAt(i) & 0xff;

      case 0x00:
      case 0x01:
        i += 1;
        continue;

      default:
        return null;
    }
  }

  return null;
}

function switchErrorHandler(res, errCode, errMsg) {
  if (errCode !== 0) {
    print("SWITCH ERROR:", errMsg);
    return;
  }

  resetAutoOffTimer();
}

function autoOffErrorHandler(res, errCode, errMsg) {
  if (errCode !== 0) {
    print("AUTO OFF ERROR:", errMsg);
  }
}

function resetAutoOffTimer() {
  if (autoOffTimer !== null) {
    Timer.clear(autoOffTimer);
    autoOffTimer = null;
  }

  autoOffTimer = Timer.set(AUTO_OFF_DELAY_MS, false, function () {
    autoOffTimer = null;
    Shelly.call("Switch.Set", { id: switchId, on: false }, autoOffErrorHandler);
  });
}

function bleScanCallback(event, result) {
  if (event !== BLE.Scanner.SCAN_RESULT)
    return;

  if (!isActive)
    return;

  if (!result.addr || result.addr !== BUTTON_MAC)
    return;

  if (!result.service_data || !result.service_data.fcd2)
    return;

  let btn = parseButtonEvent(result.service_data.fcd2);

  if (btn !== 0x01)
    return;

  let now = Date.now();

  if (now - lastTriggerMs < DEBOUNCE_MS)
    return;

  lastTriggerMs = now;
  print("BUTTON SINGLE PRESS");

  Shelly.call("Switch.Set", { id: switchId, on: true }, switchErrorHandler);
}

BLE.Scanner.Subscribe(bleScanCallback);
if (typeof ATstart === "function") {
  ATstart();
}