# Lights On via Presence Detection

## Description

This scenario keeps a light on as long as someone is nearby, and turns it off automatically after a configurable period of no detected presence.

When the motion sensor broadcasts a BLE signal, the light turns on and a countdown timer starts. Each new signal resets the timer. If no signal is received within the hold-off period, the light turns off automatically.

The automation logic runs entirely on the device controlling the light. Communication between the motion sensor and the device is handled through BLE (Bluetooth Low Energy), meaning no cloud connectivity, Wi-Fi, or HTTP requests are required.

---

# Embedded JavaScript

This approach uses an embedded Shelly script running locally on the device itself.  
The script listens for BLE advertisements from the motion sensor and keeps the light on as long as presence is detected.

```javascript
let PRESENCE_TIMEOUT_MS = 1 * 60 * 1000;
let switchId = 0;
let motionSensorMac = ${motionSensor};

let lastSeenMs = 0;
let offTimer = null;

function setRelay(on) {
  Shelly.call("Switch.Set", { id: switchId, on: on });
}

function onOffTimer() {
  offTimer = null;

  if (Date.now() - lastSeenMs >= PRESENCE_TIMEOUT_MS)
    setRelay(false);
}

function resetTimer() {
  if (offTimer !== null) {
    Timer.clear(offTimer);
    offTimer = null;
  }

  offTimer = Timer.set(PRESENCE_TIMEOUT_MS, false, onOffTimer);
}

function bleScanCallback(event, result) {
  if (event !== BLE.Scanner.SCAN_RESULT)
    return;

  if (!result.addr || result.addr !== motionSensorMac)
    return;

  lastSeenMs = Date.now();
  setRelay(true);
  resetTimer();
}

BLE.Scanner.Start({ duration_ms: BLE.Scanner.INFINITE_SCAN, active: true });
BLE.Scanner.Subscribe(bleScanCallback);
```

# Shelly Cloud Scripting

This alternative approach uses the Shelly Cloud Scripting environment to create the same automation scenario in a more abstracted and simplified form.

```javascript
var relay = Shelly.getDevice(${relay});
var motionSensor = Shelly.getDevice(${motionSensor});

Shelly.setTriggerWithHoldOff(motionSensor, "motion", "1m", () => {
  relay.o1On = true;
});

Shelly.setTriggerOnce(motionSensor, "noMotion", () => {
  relay.o1On = false;
});
```

