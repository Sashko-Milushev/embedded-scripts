let BUTTON_MAC = "7c:c6:b6:72:60:82";
let switchId = 0;

let BLINKS = 3;
let BLINK_ON_MS = 300;
let BLINK_OFF_MS = 300;

function bytes(str) {
  let out = [];
  for (let i = 0; i < str.length; i++) {
    out.push(str.charCodeAt(i) & 0xff);
  }
  return out;
}

function parseButtonEvent(payload) {
  let b = bytes(payload);

  // last byte is event type (based on observed behavior)
  let type = b[b.length - 1];

  if (type === 1) return "single";
  if (type === 2) return "double";
  if (type === 3) return "triple";
  if (type === 4) return "long";

  return null;
}

function setRelay(on) {
  Shelly.call("Switch.Set", { id: switchId, on: on });
}

function blink() {
  let i = 0;

  function step() {
    if (i >= BLINKS * 2) return;

    setRelay(i % 2 === 0);

    i++;
    Timer.set(BLINK_OFF_MS, false, step);
  }

  step();
}

BLE.Scanner.Start({
  duration_ms: BLE.Scanner.INFINITE_SCAN,
  active: true
});

BLE.Scanner.Subscribe(function (event, result) {
  if (event !== BLE.Scanner.SCAN_RESULT)
    return;

  if (!result.addr || result.addr !== BUTTON_MAC)
    return;

  if (!result.service_data || !result.service_data.fcd2)
    return;

  let press = parseButtonEvent(result.service_data.fcd2);

  if (press === "single") {
    blink();
  }
});