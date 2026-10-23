# Thermostat Build Rules

> These rules apply **in addition to** the general `build-rules.md`.
> All general rules (formatting, naming, placeholders, etc.) still apply.

---

## 1. Overview

A thermostat script:
- Reads temperature from a BLE/local sensor
- Compares it to a target temperature with hysteresis
- Controls a relay (actuator) to heat or cool

---

## 2. Mode: Heat vs Cool

| Scene field | Meaning |
|---|---|
| `"type": "heat"` | System is heating — relay ON = heating |
| `"type": "cool"` | System is cooling — relay ON = cooling |

**Rule:** The script must have a `MODE` variable:
```js
let MODE = "heat"; // or "cool"
```

---

## 3. Actuator Output Logic

Determined by `tocool` / `toheat` → `set` in the scene JSON.

| Config | heatAction | coolAction |
|---|---|---|
| `toheat.set = "on"` | relay ON | relay OFF |
| `toheat.set = "off"` | relay OFF | relay ON |

**Rule:** derive two variables:
```js
let HEAT_RELAY_STATE = true;  // true = ON, false = OFF
let COOL_RELAY_STATE = false;
```

---

## 4. Temperature Limits

Scene fields: `C.heat.min`, `C.heat.max` (or `C.cool.min/max`)

**Rule:** user always provides values in Celsius. Convert to Fahrenheit in script:
```js
let TARGET_TEMP  = ${targetTemp};                        // C
let TEMP_MIN     = ${tempMin};                           // C
let TEMP_MAX     = ${tempMax};                           // C
let TARGET_TEMP_F = TARGET_TEMP * 9 / 5 + 32;
let TEMP_MIN_F    = TEMP_MIN * 9 / 5 + 32;
let TEMP_MAX_F    = TEMP_MAX * 9 / 5 + 32;
```

---

## 5. Hysteresis

Scene field: `"ths": "1.00"`

**Rule:** named variable, value in degrees C:
```js
let HYSTERESIS = ${hysteresis};
```

**Control logic:**
- Heating mode:
  - `temp < TARGET_TEMP - HYSTERESIS` → relay ON
  - `temp > TARGET_TEMP + HYSTERESIS` → relay OFF
- Cooling mode: inverted

---

## 6. Device IDs

| Scene field | Meaning | Script variable |
|---|---|---|
| `relay_id` (hex) or `dev:DECIMAL:r1` | actuator relay | `switchId = 0` |
| `tschem.r = "dev:ID:tmp"` | temperature sensor device | `@deviceMac` or local sensor |

**Rule:** both are always named variables, never hardcoded inline.

---

## 7. Sensor Type

H&T sensors are battery-powered — HTTP polling won't work. Use **push via webhook + KVS**:

- H&T configured via `Webhook.Create` RPC to push temp to relay's KVS on each temperature change
- Relay script reads KVS on a timer and evaluates

---

### Webhook Setup — Preferred UX Flow

The H&T device sleeps most of the time (~15 min cycles, awake for ~2-5s per cycle).
`Webhook.Create` must reach H&T while it is awake — otherwise connection is refused.

**Reliable setup flow (user-driven):**
1. User presses the physical wake button on H&T → LED flashes → device is awake ~5-10s
2. User immediately clicks **CREATE** in the UI (or runs the script setup command)
3. `Webhook.Create` call succeeds within the wake window

> Do NOT rely on the retry-only approach as the primary path — timing is unpredictable.
> The retry logic in the script is a **fallback** (auto-heals if webhook is missing/deleted later).

**Automatic retry (fallback, built into thermostat script):**
- On startup, script calls `Webhook.List` on H&T
- If webhook missing → tries `Webhook.Create`
- If H&T is sleeping → schedules retry every `WEBHOOK_RETRY_MS` (default 5 min)
- Retries until webhook is confirmed created

---

**One-time manual setup — run this PowerShell while H&T is awake:**
```powershell
Invoke-WebRequest -Uri "http://<ht_ip>/rpc/Webhook.Create" -Method POST -ContentType "application/json" -Body '{"enable":true,"cid":0,"event":"temperature.change","urls":["http://<relay_ip>/rpc/KVS.Set?key=temp&value=${ev.tC}"]}'
```

**Verify KVS received data:**
```
http://<relay_ip>/rpc/KVS.Get?key=temp
```

**Supported H&T webhook events** (from `Webhook.ListSupported`):
- `temperature.change` → attrs: `tC`, `tF`
- `humidity.change` → attrs: `rh`

**Rule:** sensor declared as `@deviceIp` in template header — user provides H&T IP for webhook setup.

**Rule:** `STALE_MS = 3600000` (1 hour) — failsafe applied if no KVS update received within this time.

---

## 8. Polling

**Rule:** KVS is read on a 60s timer:
```js
let POLL_INTERVAL_MS = 60000;
```

---

## 9. Failsafe

Scene field: `"failsafe": "toheat"` — what to do on sensor error.

**Rule:** on sensor read failure, apply the failsafe action (relay ON or OFF depending on config). Named variable:
```js
let FAILSAFE_ON = true; // true = relay ON on error
```

---

## 10. Open Questions (TODO)

- [ ] How to handle scheduled intervals (scene `intervals` field)? — **skipped for now**
- [ ] How to handle `fix` functions (temp offset correction)? — **skipped for now**
- [ ] Multi-relay actuators? — **single relay only for now**
