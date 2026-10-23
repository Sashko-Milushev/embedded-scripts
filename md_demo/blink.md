# Light Blink via Bluetooth Button

## Description

This scenario makes a light blink a set number of times when a Bluetooth button is pressed once.

When the button is pressed once, the light turns on and off repeatedly — the number of blinks is configurable. Each blink cycle takes 300ms on and 300ms off. After the last blink the light turns off automatically.

The automation logic runs entirely on the device controlling the light. Communication between the Bluetooth button and the device is handled through BLE (Bluetooth Low Energy), meaning no cloud connectivity, Wi-Fi, or HTTP requests are required.

---

# Embedded JavaScript

This approach uses an embedded Shelly script running locally on the device itself.  
The script listens for BLE advertisements from the Bluetooth button and starts the blink sequence immediately when the button is pressed once.

```javascript
let switchId = 0;
let buttonMacAddr = ${button};

let BLINKS = 10;
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
```

# Shelly Cloud Scripting

This alternative approach uses the Shelly Cloud Scripting environment to create the same automation scenario in a more abstracted and simplified form.

```javascript
var light = Shelly.getDevice(${light});
var button = Shelly.getDevice(${button});

Shelly.setTriggerOnce(button, "o1PressedOnce", () => {
  light.blink({ count: 10, interval: 300 });
});
```

