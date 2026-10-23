/**
 *   @deviceIp light: RELAY
 *     @description "Light relay to blink"
 *
 *   @deviceMac button: BUTTON
 *     @description "Bluetooth button"
 *
 *   @param blinks = 10
 *     @label "Blinks Count"
 *     @description "Number of times the light blinks when button is pressed"
 */

let switchId = 0;
let buttonMacAddr = ${button};

let BLINKS = ${blinks};
let BLINK_INTERVAL_MS = 300;

function getEvent(payload) {
  if (!payload || !payload.length)
    return null;

  const events = [null, "single", "double", "triple", "long"];
  return events[payload.charCodeAt(payload.length - 1) & 0xff] || null;
}

function setRelay(on) {
  Shelly.call("Switch.Set", { id: switchId, on: on });
}

function blink() {
  let i = 0;
  function step() {
    if (i >= BLINKS * 2)
      return;

    setRelay(i % 2 === 0);
    i++;
    Timer.set(BLINK_INTERVAL_MS, false, step);
  }

  step();
}

function bleScanCallback(event, result) {
  if (event !== BLE.Scanner.SCAN_RESULT)
    return;

  if (!result.addr || result.addr !== buttonMacAddr)
    return;

  if (!result.service_data || !result.service_data.fcd2)
    return;

  let press = getEvent(result.service_data.fcd2);
  if (press !== "single")
    return;

  blink();
}

BLE.Scanner.Start({ duration_ms: BLE.Scanner.INFINITE_SCAN, active: true });
BLE.Scanner.Subscribe(bleScanCallback);

