// Thermostat script - runs on relay device (Shelly Gen2/3)
// Automatically configures the H&T sensor webhook on first run.
// H&T sensor IP must be set in HT_IP below.

let switchId = 0;
let POLL_INTERVAL_MS = 60000;
let STALE_MS = 3600000;
let WEBHOOK_RETRY_MS = 300000; // 5 minutes

let TARGET_TEMP = 19;
let HYSTERESIS = 1.0;
let TEMP_MIN = 17;
let TEMP_MAX = 20;
let MODE = "heat";
let FAILSAFE_ON = false;

let HT_IP = "192.168.10.107";
let RELAY_IP = "192.168.10.100";

let relayState = null;
let lastReportMs = 0;
let webhookReady = false;
let webhookRetryTimer = null;

function setRelay(on) {

  print("SET RELAY:", on ? "ON" : "OFF");
  relayState = on;
  Shelly.call("Switch.Set", { id: switchId, on: on });
}

function evaluateTemp(tC) {
  print("EVALUATE TEMP:", tC, "| MODE:", MODE, "| TARGET:", TARGET_TEMP, "| HYSTERESIS:", HYSTERESIS, "| MIN:", TEMP_MIN, "| MAX:", TEMP_MAX);

  if (tC < TEMP_MIN || tC > TEMP_MAX) {
    print("TEMP OUT OF GUARDRAILS - applying failsafe:", FAILSAFE_ON);
    setRelay(FAILSAFE_ON);
    return;
  }

  if (MODE === "heat") {

    if (tC < TARGET_TEMP - HYSTERESIS) {
      print("TEMP TOO LOW - turning relay ON to heat");
      setRelay(true);
      return;
    }

    if (tC > TARGET_TEMP + HYSTERESIS) {
      print("TEMP TOO HIGH - turning relay OFF");
      setRelay(false);
      return;
    }

  } else {

    if (tC > TARGET_TEMP + HYSTERESIS) {
      print("TEMP TOO HIGH - turning relay ON to cool");
      setRelay(true);
      return;
    }

    if (tC < TARGET_TEMP - HYSTERESIS) {
      print("TEMP TOO LOW - turning relay OFF");
      setRelay(false);
      return;
    }
  }

  print("TEMP IN RANGE - no action");
}

function checkTemp() {
  print("CHECK TEMP - reading KVS key 'temp'");

  if (lastReportMs > 0 && Date.now() - lastReportMs > STALE_MS) {
    print("STALE DATA - last update was over", STALE_MS / 60000, "min ago - applying failsafe:", FAILSAFE_ON);
    setRelay(FAILSAFE_ON);
    return;
  }

  Shelly.call("KVS.Get", { key: "temp" }, function (res, errCode, errMsg) {
    if (errCode !== 0 || !res) {
      print("KVS ERROR:", errCode, errMsg, "- no data from H&T yet");
      if (lastReportMs > 0) {
        print("APPLYING FAILSAFE:", FAILSAFE_ON);
        setRelay(FAILSAFE_ON);
      } else {
        print("NO DATA YET - waiting for first H&T report, relay unchanged");
      }
      return;
    }

    let tC = parseFloat(res.value);
    print("KVS VALUE:", res.value, "-> parsed:", tC);

    if (isNaN(tC)) {
      print("INVALID TEMP VALUE - applying failsafe:", FAILSAFE_ON);
      setRelay(FAILSAFE_ON);
      return;
    }

    lastReportMs = Date.now();
    evaluateTemp(tC);
  });
}

function ensureWebhook() {
  print("WEBHOOK CHECK - calling Webhook.List on H&T:", HT_IP);

  Shelly.call(
    "HTTP.GET",
    { url: "http://" + HT_IP + "/rpc/Webhook.List", timeout: 5 },
    function (res, errCode, errMsg) {
      if (errCode !== 0 || !res || !res.body) {
        print("WEBHOOK CHECK FAILED (errCode:", errCode, ") - H&T likely asleep, scheduling retry in", WEBHOOK_RETRY_MS / 60000, "min");
        scheduleWebhookRetry();
        return;
      }

      print("WEBHOOK LIST RECEIVED - scanning for relay IP:", RELAY_IP);
      let data = JSON.parse(res.body);

      if (data && data.hooks) {
        print("HOOKS FOUND:", data.hooks.length);

        for (let i = 0; i < data.hooks.length; i++) {
          let urls = data.hooks[i].urls;

          if (urls && urls.length > 0 && urls[0].indexOf(RELAY_IP) !== -1) {
            print("WEBHOOK OK - relay webhook already exists, no action needed");
            webhookReady = true;
            return;
          }
        }

        print("NO MATCHING WEBHOOK FOUND - will create one");
      } else {
        print("NO HOOKS ON H&T - will create webhook");
      }

      createWebhook();
    }
  );
}

function createWebhook() {
  print("CREATING WEBHOOK on H&T:", HT_IP, "-> pointing to relay:", RELAY_IP);

  let body = JSON.stringify({
    enable: true,
    cid: 0,
    event: "temperature.change",
    urls: ["http://" + RELAY_IP + "/rpc/KVS.Set?key=temp&value=${ev.tC}"]
  });

  Shelly.call(
    "HTTP.POST",
    { url: "http://" + HT_IP + "/rpc/Webhook.Create", body: body, timeout: 5 },
    function (res, errCode, errMsg) {
      if (errCode !== 0 || !res) {
        print("WEBHOOK CREATE FAILED (errCode:", errCode, ") - H&T likely asleep, scheduling retry in", WEBHOOK_RETRY_MS / 60000, "min");
        scheduleWebhookRetry();
        return;
      }

      print("WEBHOOK CREATED OK - H&T will now push temp to relay KVS on every change");
      webhookReady = true;
    }
  );
}

function scheduleWebhookRetry() {
  if (webhookRetryTimer !== null) {
    print("RETRY ALREADY SCHEDULED - skipping");
    return;
  }

  print("SCHEDULING WEBHOOK RETRY in", WEBHOOK_RETRY_MS / 60000, "min");
  webhookRetryTimer = Timer.set(WEBHOOK_RETRY_MS, false, function () {
    webhookRetryTimer = null;
    ensureWebhook();
  });
}

// Start webhook setup and temp polling
ensureWebhook();
checkTemp();
Timer.set(POLL_INTERVAL_MS, true, checkTemp);
