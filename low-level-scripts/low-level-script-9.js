let switchId = 0;

let PRESENCE_TIMEOUT_MS = 180000;

let lastSeenMs = 0;
let offTimer = null;

function setRelay(on) {
  Shelly.call("Switch.Set", { id: switchId, on: on });
}

function resetTimer() {
  if (offTimer !== null) {
    Timer.clear(offTimer);
  }

  offTimer = Timer.set(PRESENCE_TIMEOUT_MS, false, function () {
    offTimer = null;

    if (Date.now() - lastSeenMs >= PRESENCE_TIMEOUT_MS) {
      setRelay(false);
    }
  });
}

BLE.Scanner.Start({
  duration_ms: BLE.Scanner.INFINITE_SCAN,
  active: true
});

BLE.Scanner.Subscribe(function (event, result) {
  if (event !== BLE.Scanner.SCAN_RESULT)
    return;

  // accept ANY BLE presence signal
  if (!result.service_data && !result.rssi)
    return;

  lastSeenMs = Date.now();

  setRelay(true);
  resetTimer();
});