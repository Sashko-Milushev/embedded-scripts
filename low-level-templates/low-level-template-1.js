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
let ACTIVE_TIME = ${activeTime};
let scannerRunning = false;

let BUTTON_MAC = ${waterButton};
let DEBOUNCE_MS = 1500;
let AUTO_OFF_DELAY_MS = ${timeout} * 60 * 1000;

let lastTriggerMs = 0;
let autoOffTimer = null;
let switchId = 0;
let timerId = null;

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
  if (ATisAlwaysActive()) {
    return null;
  }

  if (typeof now !== "number") {
    now = now.getTime();
  }

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
  if (ATisAlwaysActive()) {
    return null;
  }

  let now = Date.now();
  let today = new Date(now).getDay();
  let time = ATparseTime(ACTIVE_TIME.start);
  let baseDay = ATgetLocalDayStart(now);

  if (active) {
    let end = ATgetCurrentWindowEnd(now);
    if (end === null) {
      return null;
    }
    return { time: end, active: false };
  }

  let nextStart = null;

  for (let day of ACTIVE_TIME.days) {
    let daysAhead = (day - today + 7) % 7;
    let startBase = baseDay + daysAhead * 86400000;
    let start = ATbuildTime(startBase, time.h, time.m);

    if (start <= now) {
      start += 7 * 86400000;
    }

    if (nextStart === null || start < nextStart) {
      nextStart = start;
    }
  }

  if (nextStart === null) {
    return null;
  }

  return { time: nextStart, active: true };
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
  if (!scannerRunning)
    return;

  let res = BLE.Scanner.Stop();
  if (!res) {
    print("BLE SCAN STOP FAILED");
    return;
  }

  scannerRunning = false;
}

function ATsetActiveState(active) {
  if (active) {
    ATstartScanner();
  } else {
    ATstopScanner();
  }
}

function ATscheduleNext(active) {
  if (ATisAlwaysActive()) {
    return;
  }

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
  if (delay < 1000) {
    delay = 1000;
  }

  timerId = Timer.set(delay, false, function () {
    timerId = null;
    ATnextStep(next.active);
  });
}

function ATnextStep(active) {
  ATsetActiveState(active);
  ATscheduleNext(active);
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

  Shelly.call("Switch.Set", { id: switchId, on: true }, switchErrorHandler);
}

BLE.Scanner.Subscribe(bleScanCallback);
ATnextStep(ATgetInitialState());
