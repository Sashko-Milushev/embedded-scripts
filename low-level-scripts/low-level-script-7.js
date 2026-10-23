let BUTTON_MAC = "7c:c6:b6:72:60:82";
let switchId = 0;

let lastDirection = null;

function getEvent(payload) {
  if (!payload || payload.length < 1)
    return null;

  switch (payload.charCodeAt(payload.length - 1) & 0xff) {
    case 1:
        return "single";

    case 2:
        return "double";

    case 3:
        return "triple";

    case 4:
        return "long";

    default:
        return null;
  }
}

function closeCover() {
  Shelly.call("Cover.Close", { id: switchId });
}

Shelly.addStatusHandler(function (e) {
  if (e.component !== "cover:0")
      return;

  if (e.delta.last_direction !== undefined)
      lastDirection = e.delta.last_direction;
});

BLE.Scanner.Start({ duration_ms: BLE.Scanner.INFINITE_SCAN, active: true });
BLE.Scanner.Subscribe(function (event, result) {
  if (event !== BLE.Scanner.SCAN_RESULT)
      return;

  if (!result.addr || result.addr !== BUTTON_MAC)
      return;

  if (!result.service_data || !result.service_data.fcd2)
      return;

  let press = getEvent(result.service_data.fcd2);
  if (press !== "triple")
      return;

  if (lastDirection === "open") {
    closeCover();
  }
});