/**
 * @deviceIp heater: RELAY
 *   @description "Relay device that holds the script and controls the heater or cooler"
 *
 * @deviceMac humidityAndTemperatureSensor: TH_SENSOR
 *   @description "BLE H&T sensor MAC address"
 *
 * @param targetTemp = 23
 *   @label "Target Temperature"
 *   @description "Desired temperature in Celsius"
 *
 * @param hysteresis = 1
 *   @label "Hysteresis"
 *   @description "Temperature buffer around the target value"
 *
 * @param tempMin = 5
 *   @label "Minimum Temperature"
 *   @description "Safety minimum — relay not controlled below this value"
 *
 * @param tempMax = 35
 *   @label "Maximum Temperature"
 *   @description "Safety maximum — relay forced OFF above this value"
 *
 * @param mode = ["heat", "cool"]
 *   @label "Mode"
 *   @description "Thermostat mode: 'heat' turns relay ON when cold, 'cool' turns relay ON when hot"
 *
 * @param failsafeOn = ["off", "on"]
 *   @label "Failsafe Relay State"
 *   @description "Relay state when sensor data is missing or stale"
 */

let switchId = 0;
let WATCHDOG_INTERVAL_MS = 60000;

let TARGET_TEMP = ${targetTemp};
let HYSTERESIS = ${hysteresis};
let TEMP_MIN = ${tempMin};
let TEMP_MAX = ${tempMax};
let MODE = "${mode}";
let FAILSAFE_ON = "${failsafeOn}" === "on";

let SENSOR_MAC = ${humidityAndTemperatureSensor};

let ACTIVE_TIME = ${activeTime};
let isActive = false;
let scannerRunning = false;
let timerId = null;

let lastReportMs = 0;

function toBytes(str) {
  let out = [];

  for (let i = 0; i < str.length; i++) {
    out.push(str.charCodeAt(i) & 0xff);
  }

  return out;
}

function decodeTemp(lo, hi) {
  switch (hi) {
    case 0:
      return lo / 10.0;

    case 1:
      return (lo + 255) / 10.0;

    case 255:
      return -(256 - lo) / 10.0;

    default:
      return null;
  }
}

function decode(b) {
  return {
    battery: b[4],
    humidity: b[6],
    temperature: decodeTemp(b[b.length - 2], b[b.length - 1])
  };
}

function setRelay(on) {
  Shelly.call("Switch.Set", { id: switchId, on: on });
}

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

function evaluateTemp(tC) {
  if (tC < TEMP_MIN || tC > TEMP_MAX) {
    setRelay(FAILSAFE_ON);
    return;
  }

  switch (MODE) {
    case "heat":
      if (tC < TARGET_TEMP - HYSTERESIS) {
        setRelay(true);
        return;
      }

      if (tC > TARGET_TEMP + HYSTERESIS) {
        setRelay(false);
        return;
      }

      break;

    case "cool":
      if (tC > TARGET_TEMP + HYSTERESIS) {
        setRelay(true);
        return;
      }

      if (tC < TARGET_TEMP - HYSTERESIS) {
        setRelay(false);
        return;
      }

      break;
  }
}

function onWatchdog() {
  if (!isActive)
    return;

  if (lastReportMs === 0)
    return;

}

function bleScanCallback(event, result) {
  if (event !== BLE.Scanner.SCAN_RESULT)
    return;

  if (!isActive)
    return;

  if (!result.addr || result.addr !== SENSOR_MAC)
    return;

  if (!result.service_data || !result.service_data.fcd2)
    return;

  let b = toBytes(result.service_data.fcd2);

  if (!b || b.length < 10) {
    print("BLE ERROR - payload too short:", b ? b.length : 0, "bytes");
    return;
  }

  let data = decode(b);

  if (data.temperature === null) {
    print("BLE ERROR - could not decode temperature from bytes:", b[b.length - 2], b[b.length - 1]);
    return;
  }

  lastReportMs = Date.now();
  evaluateTemp(data.temperature);
}

BLE.Scanner.Subscribe(bleScanCallback);
ATnextStep(ATgetInitialState());
Timer.set(WATCHDOG_INTERVAL_MS, true, onWatchdog);