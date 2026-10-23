/**
 *   @deviceIp heater: RELAY
 *     @description "Heating actuator relay (holds the script)"
 *
 *   @deviceIp humidityAndTemperatureSensor: TH_SENSOR
 *     @description "H&T G3 temperature sensor IP (used for webhook setup)"
 *
 *   @param targetTemp = 23
 *     @label "Target Temperature"
 *     @description "Desired temperature in Celsius"
 *
 *   @param tempMin = 5
 *     @label "Minimum Temperature"
 *     @description "Safety minimum — relay not controlled below this value"
 *
 *   @param tempMax = 35
 *     @label "Maximum Temperature"
 *     @description "Safety maximum — relay forced OFF above this value"
 *
 *   @param mode = ["heat", "cool"]
 *     @label "Mode"
 *     @description "Thermostat mode: 'heat' turns relay ON when cold, 'cool' turns relay ON when hot"
 *
 *   @param failsafeOn = ["off", "on"]
 *     @label "Failsafe Relay State"
 *     @description "Relay state when sensor data is missing or stale"
 */

let switchId = 0;
let POLL_INTERVAL_MS = 60000;
let WEBHOOK_RETRY_MS = 300000; // 5 minutes

let TARGET_TEMP = ${targetTemp};
let HYSTERESIS = 1.0;
let TEMP_MIN = ${tempMin};
let TEMP_MAX = ${tempMax};
let MODE = "${mode}";
let FAILSAFE_ON = "${failsafeOn}" === "on";

let HT_IP = ${humidityAndTemperatureSensor};
let RELAY_IP = ${heater};

let ACTIVE_TIME = ${activeTime};
let isActive = false;
let pollTimer = null;
let timerId = null;

let relayState = null;
let lastReportMs = 0;
let webhookReady = false;
let webhookRetryTimer = null;

function setRelay(on) {
    print("SET RELAY:", on ? "ON" : "OFF");
    relayState = on;
    Shelly.call("Switch.Set", {id: switchId, on: on});
}

//========ACTIVE TIME=========

function ATisAlwaysActive() {
    return !ACTIVE_TIME || Object.keys(ACTIVE_TIME).length === 0;
}

function ATparseTime(timeStr) {
    let p = timeStr.split(":");
    return {h: parseInt(p[0], 10), m: parseInt(p[1], 10)};
}

function ATgetLocalDayStart(ts) {
    let d = new Date(ts);
    return ts -
        d.getHours() * 3600000 -
        d.getMinutes() * 60000 -
        d.getSeconds() * 1000 -
        d.getMilliseconds();
}

function ATbuildTime(dayStartTs, hours, minutes) {
    return dayStartTs + hours * 3600000 + minutes * 60000;
}

function ATgetCurrentWindowEnd(now) {
    if (ATisAlwaysActive())
        return null;

    if (typeof now !== "number")
        now = now.getTime();

    let today = new Date(now).getDay();
    let time = ATparseTime(ACTIVE_TIME.start);

    for (let day of ACTIVE_TIME.days) {
        let daysBack = (today - day + 7) % 7;
        let startBase = ATgetLocalDayStart(now) - daysBack * 86400000;
        let start = ATbuildTime(startBase, time.h, time.m);
        let end = start + ACTIVE_TIME.duration * 60000;

        if (now >= start && now < end)
            return end;
    }

    return null;
}

function ATgetInitialState() {
    return ATisAlwaysActive() || ATgetCurrentWindowEnd(Date.now()) !== null;
}

function ATgetNextTransition(active) {
    if (ATisAlwaysActive())
        return null;

    let now = Date.now();
    let today = new Date(now).getDay();
    let time = ATparseTime(ACTIVE_TIME.start);
    let baseDay = ATgetLocalDayStart(now);

    if (active) {
        let end = ATgetCurrentWindowEnd(now);
        if (end === null)
            return null;

        return {time: end, active: false};
    }

    let nextStart = null;

    for (let day of ACTIVE_TIME.days) {
        let daysAhead = (day - today + 7) % 7;
        let startBase = baseDay + daysAhead * 86400000;
        let start = ATbuildTime(startBase, time.h, time.m);

        if (start <= now)
            start += 7 * 86400000;

        if (nextStart === null || start < nextStart)
            nextStart = start;
    }

    if (nextStart === null)
        return null;

    return {time: nextStart, active: true};
}

function ATstartPolling() {
    if (pollTimer !== null)
        return true;

    pollTimer = Timer.set(POLL_INTERVAL_MS, true, checkTemp);
    return pollTimer !== null;
}

function ATstopPolling() {
    if (pollTimer === null)
        return true;

    Timer.clear(pollTimer);
    pollTimer = null;
    return true;
}

function ATsetActiveState(active) {
    isActive = active;

    if (active) {
        ATstartPolling();
        checkTemp();
        return;
    }

    ATstopPolling();
    cancelWebhookRetry();
}

function ATscheduleNext(active) {
    if (ATisAlwaysActive())
        return;

    if (timerId !== null) {
        Timer.clear(timerId);
        timerId = null;
    }

    let next = ATgetNextTransition(active);
    if (!next || next.time === null) {
        print("ACTIVE TIME ERROR: no next transition");
        return;
    }

    let delay = next.time - Date.now();
    if (delay < 1000)
        delay = 1000;

    timerId = Timer.set(delay, false, function () {
        timerId = null;
        ATnextStep(next.active);
    });
}

function ATnextStep(active) {
    ATsetActiveState(active);
    ATscheduleNext(active);
}

//===== END OF ACTIVE TIME ======

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
    if (!isActive)
        return;

    print("CHECK TEMP - reading KVS key 'temp'");

    Shelly.call("KVS.Get", {key: "temp"}, function (res, errCode, errMsg) {
        if (!isActive)
            return;

        if (errCode !== 0 || !res) {
            print("KVS ERROR:", errCode, errMsg, "- no data from H&T yet");

            if (!webhookReady && lastReportMs === 0) {
                ensureWebhook();
            }

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
        webhookReady = true;
        evaluateTemp(tC);
    });
}

function ensureWebhook() {
    if (!isActive || webhookReady) {
        return;
    }

    print("WEBHOOK CHECK - calling Webhook.List on H&T:", HT_IP);

    Shelly.call(
        "HTTP.GET",
        {url: "http://" + HT_IP + "/rpc/Webhook.List", timeout: 5},
        function (res, errCode, errMsg) {
            if (!isActive || webhookReady) {
                return;
            }

            if (errCode !== 0 || !res || !res.body) {
                print("WEBHOOK CHECK FAILED (errCode:", errCode, ") - H&T likely asleep, scheduling retry in", WEBHOOK_RETRY_MS / 60000, "min");
                scheduleWebhookRetry();
                return;
            }

            let body = res.body;

            if (body === "Not Found" || body.indexOf("{") !== 0) {
                print("WEBHOOK LIST: device not ready (sleep or RPC not available)");
                scheduleWebhookRetry();
                return;
            }

            let data;
            try {
                data = JSON.parse(body);
            } catch (e) {
                print("WEBHOOK LIST: invalid JSON response ->", body);
                scheduleWebhookRetry();
                return;
            }

            print("WEBHOOK LIST RECEIVED - scanning for relay IP:", RELAY_IP);

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
    if (!isActive || webhookReady) {
        return;
    }

    print("CREATING WEBHOOK on H&T:", HT_IP, "-> pointing to relay:", RELAY_IP);

    let body = JSON.stringify({
        enable: true,
        cid: 0,
        event: "temperature.change",
        urls: ["http://" + RELAY_IP + "/rpc/KVS.Set?key=temp&value=${ev.tC}"]
    });

    Shelly.call(
        "HTTP.POST",
        {url: "http://" + HT_IP + "/rpc/Webhook.Create", body: body, timeout: 5},
        function (res, errCode, errMsg) {
            if (!isActive || webhookReady) {
                return;
            }

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

function cancelWebhookRetry() {
    if (webhookRetryTimer !== null) {
        Timer.clear(webhookRetryTimer);
        webhookRetryTimer = null;
    }
}

function scheduleWebhookRetry() {
    if (!isActive || webhookReady) {
        return;
    }

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

// Start active time, webhook setup and temp polling
ATnextStep(ATgetInitialState());