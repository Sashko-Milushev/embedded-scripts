# Thermostat — BLE H&T Sensor + Relay

## Description

This scenario automatically keeps a room at a desired temperature by controlling a heater or air conditioner relay based on readings from a nearby Shelly H&T BLE temperature and humidity sensor.

When the temperature drops below the target, the relay turns on. When it rises above the target, the relay turns off. A safety ceiling forces the relay off if the temperature exceeds the configured maximum, regardless of the target. Both heating and cooling modes are supported.

The script runs entirely on the relay device. It listens continuously for BLE advertisements from the H&T sensor and reacts immediately on every temperature report. No Wi-Fi, no cloud connectivity, and no webhook setup is required.

If no temperature data has been received for more than 1 hour, a configurable failsafe state is applied to the relay.

---

# Embedded JavaScript

This approach uses an embedded Shelly script running locally on the relay device.
The script subscribes to BLE advertisements from the H&T sensor and evaluates the temperature on every received packet.

```javascript
let switchId = 0;
let STALE_MS = 3600000;
let WATCHDOG_INTERVAL_MS = 60000;

let TARGET_TEMP = 23;
let TEMP_MIN = 17;
let TEMP_MAX = 25;
let MODE = "heat";
let FAILSAFE_ON = false;

let SENSOR_MAC = ${humidityAndTemperatureSensor};

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

function evaluateTemp(tC) {
  if (tC < TEMP_MIN)
    return;

  if (tC > TEMP_MAX) {
    setRelay(false);
    return;
  }

  switch (MODE) {
    case "heat":
      if (tC < TARGET_TEMP) {
        setRelay(true);
        return;
      }

      if (tC > TARGET_TEMP) {
        setRelay(false);
        return;
      }

      break;

    case "cool":
      if (tC > TARGET_TEMP) {
        setRelay(true);
        return;
      }

      if (tC < TARGET_TEMP) {
        setRelay(false);
        return;
      }

      break;
  }
}

function onWatchdog() {
  if (lastReportMs === 0)
    return;

  if (Date.now() - lastReportMs > STALE_MS)
    setRelay(FAILSAFE_ON);
}

function bleScanCallback(event, result) {
  if (event !== BLE.Scanner.SCAN_RESULT)
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

BLE.Scanner.Start({ duration_ms: BLE.Scanner.INFINITE_SCAN, active: true });
BLE.Scanner.Subscribe(bleScanCallback);
Timer.set(WATCHDOG_INTERVAL_MS, true, onWatchdog);
```

# Shelly Cloud Scripting

This alternative approach uses the Shelly Cloud Scripting environment to define the same automation in a simplified, declarative form.

```javascript
var heater = Shelly.getDevice(${heater});
var humidityAndTemperatureSensor = Shelly.getDevice(${humidityAndTemperatureSensor});

Shelly.setTriggerOnAnyChange(humidityAndTemperatureSensor, "temperature > 25", () => {
    heater.o1On = false;
});

Shelly.setTriggerOnAnyChange(humidityAndTemperatureSensor, "temperature < 18", () => {
    heater.o1On = params.mode === "heat";
});

Shelly.setTriggerOnAnyChange(humidityAndTemperatureSensor, "temperature > 20", () => {
    heater.o1On = params.mode === "cool";
});
```

