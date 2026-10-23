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
let timerId = null;

let scannerRunning = false;

let ACTIVE_TIME = ${activeTime};
let isActive = false;

//========ACTIVE TIME=========

function ATisAlwaysActive() {
  return !ACTIVE_TIME || Object.keys(ACTIVE_TIME).length === 0;
}

function ATparseTime(timeStr) {
  let p = timeStr.split(":");
  return { h: parseInt(p[0], 10), m: parseInt(p[1], 10) };
}

function ATgetLocalDayStart(ts) {
  let d = new Date(ts);
  return ts -
    d.getHours() * 3600000 -
    d.getMinutes() * 60000 -
    d.getSeconds() * 1000 -
    d.getMilliseconds();
}

function ATbuildTime(dayStartTs, hours, minutes) {
  return dayStartTs + hours * 3600000 + minutes * 60000;
}

function ATgetCurrentWindowEnd(now) {
  if (ATisAlwaysActive())
    return null;

  if (typeof now !== "number")
    now = now.getTime();

  let today = new Date(now).getDay();
  let time = ATparseTime(ACTIVE_TIME.start);

  for (let day of ACTIVE_TIME.days) {
    let daysBack = (today - day + 7) % 7;
    let startBase = ATgetLocalDayStart(now) - daysBack * 86400000;
    let start = ATbuildTime(startBase, time.h, time.m);
    let end = start + ACTIVE_TIME.duration * 60000;

    if (now >= start && now < end)
      return end;
  }

  return null;
}

function ATgetInitialState() {
  return ATisAlwaysActive() || ATgetCurrentWindowEnd(Date.now()) !== null;
}

function ATgetNextTransition(active) {
  if (ATisAlwaysActive())
    return null;

  let now = Date.now();
  let today = new Date(now).getDay();
  let time = ATparseTime(ACTIVE_TIME.start);
  let baseDay = ATgetLocalDayStart(now);

  if (active) {
    let end = ATgetCurrentWindowEnd(now);
    if (end === null)
      return null;

    return { time: end, active: false };
  }

  let nextStart = null;

  for (let day of ACTIVE_TIME.days) {
    let daysAhead = (day - today + 7) % 7;
    let startBase = baseDay + daysAhead * 86400000;
    let start = ATbuildTime(startBase, time.h, time.m);

    if (start <= now)
      start += 7 * 86400000;

    if (nextStart === null || start < nextStart)
      nextStart = start;
  }

  if (nextStart === null)
    return null;

  return { time: nextStart, active: true };
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
  if (!scannerRunning)
    return true;

  let res = BLE.Scanner.Stop();
  if (!res) {
    print("BLE SCAN STOP FAILED");
    return false;
  }

  scannerRunning = false;
  return true;
}

function ATsetActiveState(active) {
  if (active) {
    isActive = ATstartScanner();
    return;
  }

  isActive = false;
  ATstopScanner();
}

function ATscheduleNext(active) {
  if (ATisAlwaysActive())
    return;

  if (timerId !== null) {
    Timer.clear(timerId);
    timerId = null;
  }

  let next = ATgetNextTransition(active);
  if (!next || next.time === null) {
    print("ACTIVE TIME ERROR: no next transition");
    return;
  }

  let delay = next.time - Date.now();
  if (delay < 1000)
    delay = 1000;

  timerId = Timer.set(delay, false, function () {
    timerId = null;
    ATnextStep(next.active);
  });
}

function ATnextStep(active) {
  ATsetActiveState(active);
  ATscheduleNext(active);
}

//===== END OF ACTIVE TIME ======

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
  if (lastSeenMs === 0)
    return;

  if (Date.now() - lastSeenMs > OFF_DELAY_MS)
    turnOff();
}

BLE.Scanner.Subscribe(bleScanCallback);
ATnextStep(ATgetInitialState());
Timer.set(WATCHDOG_INTERVAL_MS, true, onWatchdog);
