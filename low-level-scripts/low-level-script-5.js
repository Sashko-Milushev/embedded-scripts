let SENSOR_MAC = "b0:c7:de:41:b3:0c";

let NO_MOTION_MS = 10 * 60 * 1000;
let WATCHDOG_MS = 5000;

let lastSeen = 0;
let offTimer = null;
let switchId = 0;

function turnOff() {
  Shelly.call("Switch.Set", { id: switchId, on: false });
}

function resetTimer() {
  if (offTimer !== null) {
    Timer.clear(offTimer);
    offTimer = null;
  }

  offTimer = Timer.set(NO_MOTION_MS, false, function () {
    offTimer = null;
    turnOff();
  });
}

function bleCallback(event, result) {
  if (event !== BLE.Scanner.SCAN_RESULT)
      return;

  if (!result.addr || result.addr !== SENSOR_MAC)
      return;

  lastSeen = Date.now();
  resetTimer();
}

BLE.Scanner.Start({ duration_ms: BLE.Scanner.INFINITE_SCAN, active: true });
BLE.Scanner.Subscribe(bleCallback);

Timer.set(WATCHDOG_MS, true, function () {
  if (lastSeen === 0)
      return;

  if (Date.now() - lastSeen > NO_MOTION_MS) {
    turnOff();
  }
});