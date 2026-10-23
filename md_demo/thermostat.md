# Thermostat — H&T Sensor + Relay

## Description

This scenario automatically keeps a room at a desired temperature by controlling a heater or air conditioner relay based on readings from a Shelly H&T G3 temperature and humidity sensor.

When the temperature drops below the target (minus hysteresis), the relay turns on. When it rises above the target (plus hysteresis), the relay turns off. A safety ceiling forces the relay off if the temperature exceeds the configured maximum, regardless of the target. Both heating and cooling modes are supported.

The script runs entirely on the relay device. The H&T sensor communicates by pushing temperature updates via a webhook to the relay's local key-value store. The relay reads this value every 60 seconds and acts accordingly. No cloud connectivity is required.

If no temperature data has been received for more than 1 hour, a configurable failsafe state is applied to the relay.

---

> **NOTE:** The Shelly H&T G3 is a battery-powered device that sleeps most of the time. Before starting the embedded script in the UI for the first time, **press the physical button on the H&T sensor** to wake it up. This gives the script a window to create the webhook on the sensor. If the button is not pressed in time, the script will automatically retry every 5 minutes until it succeeds — but pressing the button ensures immediate setup.

---

# Embedded JavaScript

This approach uses an embedded Shelly script running locally on the relay device.
The script automatically configures the H&T sensor webhook on startup, then polls the key-value store every 60 seconds to evaluate and control the relay.

```javascript
let switchId = 0;
let POLL_INTERVAL_MS = 60000;
let STALE_MS = 3600000;
let WEBHOOK_RETRY_MS = 300000;

let TARGET_TEMP = 19;
let HYSTERESIS = 1.0;
let TEMP_MIN = 5;
let TEMP_MAX = 35;
let MODE = "heat";
let FAILSAFE_ON = false;

let HT_IP = ${humidityAndTemperatureSensor};
let RELAY_IP = ${heater};

let kvsSetUrl = "http://" + RELAY_IP + "/rpc/KVS.Set?key=temp&value=${ev.tC}";
let webhookListUrl = "http://" + HT_IP + "/rpc/Webhook.List";
let webhookCreateUrl = "http://" + HT_IP + "/rpc/Webhook.Create";
let webhookListOptions = {url: webhookListUrl, timeout: 5};

let lastReportMs = 0;
let webhookRetryTimer = null;

function setRelay(on) {
  Shelly.call("Switch.Set", { id: switchId, on: on });
}

function evaluateTemp(tC) {
  if (tC < TEMP_MIN || tC > TEMP_MAX) {
    setRelay(FAILSAFE_ON);
    return;
  }

  switch (MODE) {
    case "heat":
      if (tC < TARGET_TEMP - HYSTERESIS) { setRelay(true); return; }
      if (tC > TARGET_TEMP + HYSTERESIS) { setRelay(false); return; }
      break;

    case "cool":
      if (tC > TARGET_TEMP + HYSTERESIS) { setRelay(true); return; }
      if (tC < TARGET_TEMP - HYSTERESIS) { setRelay(false); return; }
      break;
  }
}

function handleKvsTempResponse(res, errCode, errMsg) {
  if (errCode !== 0 || !res) {
    print("KVS ERROR:", errCode, errMsg);
    if (lastReportMs > 0) setRelay(FAILSAFE_ON);
    return;
  }

  let tC = parseFloat(res.value);

  if (isNaN(tC)) {
    print("INVALID TEMP VALUE");
    setRelay(FAILSAFE_ON);
    return;
  }

  lastReportMs = Date.now();
  evaluateTemp(tC);
}

function checkTemp() {
  if (lastReportMs > 0 && Date.now() - lastReportMs > STALE_MS) {
    setRelay(FAILSAFE_ON);
    return;
  }

  Shelly.call("KVS.Get", { key: "temp" }, handleKvsTempResponse);
}

function handleWebhookList(res, errCode, errMsg) {
  if (errCode !== 0 || !res || !res.body) {
    print("WEBHOOK CHECK FAILED - H&T asleep, will retry");
    scheduleWebhookRetry();
    return;
  }

  let hooks = JSON.parse(res.body).hooks || [];

  for (let i = 0; i < hooks.length; i++) {
    let urls = hooks[i].urls;
    if (urls && urls.length > 0 && urls[0].indexOf(RELAY_IP) !== -1)
      return;
  }

  createWebhook();
}

function handleWebhookCreate(res, errCode, errMsg) {
  if (errCode !== 0 || !res) {
    print("WEBHOOK CREATE FAILED - H&T asleep, will retry");
    scheduleWebhookRetry();
  }
}

function ensureWebhook() {
  Shelly.call("HTTP.GET", webhookListOptions, handleWebhookList);
}

function createWebhook() {
  let body = JSON.stringify({
    enable: true,
    cid: 0,
    event: "temperature.change",
    urls: [kvsSetUrl]
  });

  let webhookCreateOptions = { url: webhookCreateUrl, body: body, timeout: 5 };
  Shelly.call("HTTP.POST", webhookCreateOptions, handleWebhookCreate);
}

function onWebhookRetryTimer() {
  webhookRetryTimer = null;
  ensureWebhook();
}

function scheduleWebhookRetry() {
  if (webhookRetryTimer !== null)
    return;

  webhookRetryTimer = Timer.set(WEBHOOK_RETRY_MS, false, onWebhookRetryTimer);
}

ensureWebhook();
checkTemp();
Timer.set(POLL_INTERVAL_MS, true, checkTemp);
```

# Shelly Cloud Scripting

This alternative approach uses the Shelly Cloud Scripting environment to define the same automation in a simplified, declarative form.

```javascript
var heater = Shelly.getDevice(${heater});
var humidityAndTemperatureSensor = Shelly.getDevice(${humidityAndTemperatureSensor});

Shelly.setTriggerOnAnyChange(humidityAndTemperatureSensor, "temperature > 35", () => {
    heater.o1On = false;
});

Shelly.setTriggerOnAnyChange(humidityAndTemperatureSensor, "temperature < 18", () => {
    heater.o1On = params.mode === "heat";
});

Shelly.setTriggerOnAnyChange(humidityAndTemperatureSensor, "temperature > 20", () => {
    heater.o1On = params.mode === "cool";
});
```

