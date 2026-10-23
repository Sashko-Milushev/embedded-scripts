# Watering Pump Automation via Bluetooth Button

## Description

This scenario controls a watering pump using a Bluetooth button.

When the button is pressed once, the watering pump starts and runs for 15 minutes. After the timeout expires, the pump automatically stops without requiring any additional interaction.

The automation logic is executed directly on the device controlling the watering pump. Communication between the Bluetooth button and the device is handled entirely through BLE (Bluetooth Low Energy) radio communication, meaning no cloud connectivity, Wi-Fi communication, or HTTP requests are required for the automation to function.

---

# Embedded JavaScript

This approach uses an embedded Shelly script running locally on the device itself.  
The script listens for BLE advertisements from the Bluetooth button and reacts immediately when the button is pressed.

```javascript
let BUTTON_MAC = ${waterButton};
let DEBOUNCE_MS = 1500;
let AUTO_OFF_DELAY_MS = 15 * 60 * 1000;
let lastTriggerMs = 0;
let autoOffTimer = null;
let switchId = 0;

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
    console.log("SWITCH ERROR:", errMsg);
    return;
  }

  resetAutoOffTimer();
}

function autoOffErrorHandler(res, errCode, errMsg) {
  if (errCode !== 0) {
    console.log("AUTO OFF ERROR:", errMsg);
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
  console.log("BUTTON SINGLE PRESS");
  Shelly.call("Switch.Set", { id: switchId, on: true }, switchErrorHandler);
}

BLE.Scanner.Start({ duration_ms: BLE.Scanner.INFINITE_SCAN, active: true });
BLE.Scanner.Subscribe(bleScanCallback);

```

# Shelly Cloud Scripting

This alternative approach uses the Shelly Cloud Scripting environment to create the same automation scenario in a more abstracted and simplified form.


```javascript
var waterPump = Shelly.getDevice(${waterPump});
var waterBTButton = Shelly.getDevice(${waterButton});

Shelly.setTriggerOnce(waterBTButton, "o1PressedOnce", () => {
  waterPump.o1On = { value: true, timeout: "15m" };
});
```