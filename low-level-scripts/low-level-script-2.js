let SENSOR_MAC = "b0:c7:de:3e:d4:41";
let BUTTON_MAC = "7c:c6:b6:72:60:82";

let OFF_DELAY_MS = 180000;
let WATCHDOG_INTERVAL_MS = 5000;

let lastSeenMs = 0;
let offTimer = null;
let switchId = 0;

function parseDoorState(payload) {
  if (!payload || payload.length < 2)
    return null;

  let i = 1;

  while (i < payload.length) {
    let id = payload.charCodeAt(i++) & 0xff;

    switch (id) {
      case 0x2d:
        return (payload.charCodeAt(i) & 0xff) === 1 ? "OPEN" : "CLOSED";

      case 0x00:
      case 0x01:
        i += 1;
        continue;

      case 0x3f:
        i += 2;
        continue;

      case 0x05:
        i += 3;
        continue;

      default:
        return null;
    }
  }

  return null;
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

function turnOn() {
  console.log("RELAY ON");
  Shelly.call("Switch.Set", { id: switchId, on: true });
}

function turnOff() {
  console.log("RELAY OFF");
  Shelly.call("Switch.Set", { id: switchId, on: false });
}

function cancelOffTimer() {
  if (offTimer !== null) {
    Timer.clear(offTimer);
    offTimer = null;
  }
}

function resetOffTimer() {
  cancelOffTimer();

  offTimer = Timer.set(OFF_DELAY_MS, false, function () {
    offTimer = null;

    if (Date.now() - lastSeenMs < OFF_DELAY_MS)
      return;

    turnOff();
  });
}

BLE.Scanner.Start({ duration_ms: BLE.Scanner.INFINITE_SCAN, active: true });
BLE.Scanner.Subscribe(function (event, result) {
  if (event !== BLE.Scanner.SCAN_RESULT)
    return;

  if (!result.addr)
    return;

  if (result.addr === SENSOR_MAC) {
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

  if (result.addr === BUTTON_MAC) {
    if (!result.service_data || !result.service_data.fcd2)
      return;

    let btn = parseButtonEvent(result.service_data.fcd2);

    if (btn === null)
      return;

    if (btn === 0x04) {
      cancelOffTimer();
      turnOff();
    }

    return;
  }
});

Timer.set(WATCHDOG_INTERVAL_MS, true, function () {
  if (lastSeenMs === 0)
    return;

  if (Date.now() - lastSeenMs > OFF_DELAY_MS)
    turnOff();
});