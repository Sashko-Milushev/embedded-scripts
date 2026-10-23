/**
*   @deviceIp gate: RELAY_ROLLER
*     @description "Gate relay"
*
*   @deviceMac gateButton: BUTTON
*     @description "Bluetooth button"
*/

let switchId = 0;
let buttonMacAddr = ${gateButton};

let lastDirection = null;
let coverState = null;

function getEvent(payload) {
  if (!payload || !payload.length)
    return null;

  const events = [null, "single", "double", "triple", "long"];
  return events[payload.charCodeAt(payload.length - 1) & 0xff] || null;
}

function openCover() {
  Shelly.call("Cover.Open", { id: switchId });
}

function onCoverStatus(e) {
  if (e.component !== "cover:0")
    return;

  if (e.delta.state !== undefined)
    coverState = e.delta.state;

  if (e.delta.last_direction !== undefined)
    lastDirection = e.delta.last_direction;
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

  if (coverState === "opening")
    return;

  if (lastDirection === "close")
    openCover();
}

BLE.Scanner.Start({ duration_ms: BLE.Scanner.INFINITE_SCAN, active: true });
Shelly.addStatusHandler(onCoverStatus);
BLE.Scanner.Subscribe(bleScanCallback);
