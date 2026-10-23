# High-Level Template Build Rules

> These rules apply **in addition to** the general `build-rules.md`.
> All general rules (formatting, naming, placeholders, etc.) still apply.

---

## 1. Overview

A high-level template script:
- Declares one or more devices using `@device` annotations
- Declares zero or more configurable parameters using `@param` annotations
- Wires device events to actions using Shelly trigger functions

---

## 2. File Header

Every template must start with a single-line comment describing what the script does:

```js
// Brief description of what the script does.
```

Followed immediately by the JSDoc block.

---

## 3. JSDoc Block Structure

```js
/**
 * @device <varName>: <DEVICE_TYPE>
 *   @description "<Human-readable description>"
 *
 * @param <paramName> = <defaultValue>
 *   @label "<Human-readable label>"
 *   @description "<Human-readable description>"
 */
```

**Rules:**
- Every `@device` must have a `@description`.
- Every `@param` must have a `@label` and a `@description`.
- Device variable names use **camelCase**.
- Device types are always one of the allowed types (see Section 4).
- Parameters use **camelCase** names.
- Default values for time-based params may use duration suffixes (e.g. `15m`, `3m`) or plain numbers (e.g. `1`, `10`).

---

## 4. Allowed Device Types

| Type | Description |
|---|---|
| `RELAY` | A standard on/off relay (lights, pumps, etc.) |
| `RELAY_ROLLER` | A roller/shutter relay with open/close state |
| `MOTION_SENSOR` | A motion sensor with `motion` / `noMotion` events and optional `illuminance` property |
| `DW_SENSOR` | A door/window sensor with `open` event |
| `BUTTON` | A Bluetooth button with press events |
| `FLOOD_SENSOR` | A flood/water leak sensor with a `flood` event |
| `TEMPERATURE_SENSOR` | A temperature sensor with a `temperature` property |

---

## 5. Device Variable Declaration

Each device declared in the JSDoc must be assigned at the top of the script body:

```js
var <varName> = Shelly.getDevice("${<varName>}"); // ${<varName>Name}
```

**Rules:**
- Use `var` (not `let` or `const`) for device variables.
- The placeholder `"${<varName>}"` is the device ID substitution.
- The inline comment `// ${<varName>Name}` is the device name substitution — always include it.
- Devices with no `@param` block (templates 6, 7) may omit the inline comment.
- Device declarations come before any function definitions.

---

## 6. Parameter Usage

Parameters declared with `@param` are referenced in the script body as `${paramName}`:

```js
relay.o1On = { value: true, timeout: "${timeout}" };
Shelly.setTriggerWithHoldOff(sensor, "noMotion", ${holdOffTime}, callback);
```

**Rules:**
- String-context params (e.g. timeout values passed as object properties) are wrapped in quotes: `"${timeout}"`.
- Numeric-context params (e.g. hold-off durations, thresholds) are used bare: `${holdOffTime}`.

---

## 7. Trigger Functions

Use only the following Shelly trigger functions:

| Function | When to use |
|---|---|
| `Shelly.setTriggerOnce(device, event, callback)` | Fire callback once when event occurs |
| `Shelly.setTriggerOnAnyChange(device, condition, callback)` | Fire callback whenever a condition becomes true |
| `Shelly.setTriggerWithHoldOff(device, event, holdOff, callback)` | Fire callback after event persists for `holdOff` minutes |
| `Shelly.setRepeatedTrigger(device, condition, callback)` | Fire callback every time the condition is true (repeated evaluation) |
| `Shelly.setScheduleTrigger(time, days, callback)` | Fire callback on a cron-like schedule (time as `"HH:MM"`, days as array) |

**Rules:**
- Prefer named functions over inline arrow functions for non-trivial logic.
- Simple one-liners may use inline arrow functions: `() => { relay.o1On = false }`.

---

## 8. Active Time

**Rule:** `Shelly.setActiveTime(...)` is **never** included in a template. Active time is configured by the user after the template is chosen and all parameter values are populated. Do not add `setActiveTime` calls or active-time parameters to any template.

---

## 9. Hardcoded Script-Level Constants (`const params`)

When a value is intentionally fixed (not user-configurable) but still needs a named reference in the script, declare it in a `const params` block placed immediately after the JSDoc block and before device declarations:

```js
const params = {
  resetScheduleTime: "23:59",
  resetScheduleDays: [1, 2, 3, 4, 5, 6, 7]
};
```

**Rules:**
- Do **not** add these values as `@param` entries in the JSDoc.
- Reference them in the script as `params.<name>`.
- Use this pattern only for values that should not be exposed to the user as configurable parameters.

---

## 10. Button Press Events

| Event name | Meaning |
|---|---|
| `"o1PressedOnce"` | Single press |
| `"o1PressedTwice"` | Double press |
| `"o1PressedLong"` | Long press |
| `"o1PressedThreeTimes"` | Triple press |

---

## 11. Motion Sensor Events & Properties

| Event / Property | Meaning |
|---|---|
| `"motion"` | Motion detected |
| `"noMotion"` | No motion detected |
| `sensor.illuminance` | Current illuminance value (lux) |

---

## 12. Relay Control

| Expression | Effect |
|---|---|
| `relay.on = true` | Turn relay on |
| `relay.on = false` | Turn relay off |
| `relay.o1On = true` | Turn relay output 1 on |
| `relay.o1On = false` | Turn relay output 1 off |
| `relay.o1On = { value: true, timeout: "${timeout}" }` | Turn on with auto-off timeout |

---

## 13. Roller Relay Control

| Expression | Effect |
|---|---|
| `gate.open = true` | Open the roller/gate |
| `gate.open = false` | Close the roller/gate |
| `gate.closed` | Boolean — true if fully closed |
| `gate.open` (read) | Boolean — true if fully open |
| `roller.closeRoller = { value: true, delay: "${delay}" }` | Close roller with an optional delay |

**Rule:** Always guard roller actions with a state check:
```js
if (gate.closed) { gate.open = true; }
if (gate.open)   { gate.open = false; }
```

---

## 14. Notification Functions

| Function | When to use |
|---|---|
| `Shelly.sendPhoneStandardNotification(message)` | Send a standard push notification to the user's phone |
| `Shelly.sendPhoneAlertNotification(message)` | Send a high-priority alert push notification to the user's phone |
| `Shelly.sendEmailNotification(message, "0")` | Send an email notification |

---

## 15. Timer Usage

Use `Timer.set(ms, repeat, callback)` for delayed or repeating actions:

```js
Timer.set(300, false, step); // one-shot, 300ms delay
```

**Rule:** Use `false` for one-shot timers, `true` for repeating timers.

---

## 16. Behavioral Patterns (Reference)

The following patterns cover all current templates:

### Pattern A — Button triggers relay with timeout
> Template 1: Button press → relay ON for a fixed duration.
```js
Shelly.setTriggerOnce(button, "o1PressedOnce", () => {
    relay.o1On = { value: true, timeout: "${timeout}" };
});
```

### Pattern B — Sensor event triggers relay with timeout + button override
> Template 2: Door open → relay ON for a fixed duration; long-press button → relay OFF.
```js
Shelly.setTriggerOnAnyChange(doorSensor, "open", turnOnRelay);
Shelly.setTriggerOnce(stairsButton, "o1PressedLong", () => { relay.o1On = false });
```

### Pattern C — Motion ON / hold-off OFF
> Templates 3, 9: Motion → relay ON; no motion for N minutes → relay OFF.
```js
Shelly.setTriggerOnce(motionSensor, "motion", turnOnRelay);
Shelly.setTriggerWithHoldOff(motionSensor, "noMotion", ${holdOffTime}, turnOffRelay);
```

### Pattern D — Motion ON with illuminance guard
> Template 4: Motion → relay ON only if illuminance is below threshold.
```js
function lightsOn() {
  if (sensor.illuminance < ${highIlluminanceValue}) {
    relay.on = true;
  }
}
Shelly.setTriggerOnce(motionSensor, "motion", lightsOn);
```

### Pattern E — Hold-off OFF only
> Template 5: No motion for N minutes → relay OFF (if currently on).
```js
function lightsOff() {
  if (relay.o1On) { relay.o1On = false; }
}
Shelly.setTriggerWithHoldOff(motionSensor, "noMotion", ${holdOff}, lightsOff);
```

### Pattern F — Button triggers roller relay (open/close)
> Templates 6, 7: Button press → open or close gate, guarded by current state.
```js
Shelly.setTriggerOnce(gateButton, "o1PressedOnce", openGate);
Shelly.setTriggerOnce(gateButton, "o1PressedThreeTimes", closeGate);
```

### Pattern G — Button triggers blink effect
> Template 8: Button press → relay blinks N times using a recursive timer.
```js
function blink() {
  let i = 0;
  function step() {
    if (i >= params.blinks * 2) return;
    light.o1On = (i % 2 === 0);
    i++;
    Timer.set(300, false, step);
  }
  step();
}
Shelly.setTriggerOnce(button, "o1PressedOnce", blink);
```

### Pattern H — Flood sensor cuts power + idle power detects cycle end + schedule reminder
> Template 10: Flood → turn off device; idle power hold-off → done notification + counter; schedule → cleaning reminder every N cycles.
```js
Shelly.setTriggerWithHoldOff(floodSensor, "flood", ${floodHoldOff}, () => { washingMachine.o1On = false; });
Shelly.setTriggerWithHoldOff(washingMachine, "o1PowerConsumption < ${idlePowerThreshold}", ${idleHoldOff}, onCycleDone);
Shelly.setScheduleTrigger("${cleaningScheduleTime}", ${cleaningScheduleDays}, checkCleaningReminder);
```

### Pattern I — Multiple devices share same trigger; button queries global counter; schedule resets with email
> Template 11: Multiple relays trigger `peaksIncrement` on high power; button double-press queries count; daily schedule resets counter with email.
```js
Shelly.setTriggerWithHoldOff(device, "o1PowerConsumption > ${peakPowerThreshold}", ${holdOff}, peaksIncrement);
Shelly.setTriggerOnce(bluetoothButton, "o1PressedTwice", getPeaksValue);
Shelly.setScheduleTrigger(params.resetScheduleTime, params.resetScheduleDays, clearPeaksCount);
```

### Pattern J — Repeated trigger cuts power when threshold exceeded
> Template 12: Repeated evaluation of active power — turns off a device whenever threshold is exceeded.
```js
Shelly.setRepeatedTrigger(powerMeter, "aPower >= ${powerThreshold}", () => { boiler.off = true; });
```

### Pattern K — Button toggles relay on/off
> Template 13: Single button press toggles a relay between on and off.
```js
Shelly.setTriggerOnce(button, "o1PressedOnce", () => { light.on = !light.on; });
```

### Pattern M — Multi-sensor condition closes roller blind
> Template 15: Motion + high illuminance + high temperature → close roller blind with delay. Two triggers (motion event and temperature change) both evaluate the same multi-condition function.
```js
function closeBlinds() {
  var condition = livingroomMotion.motion &&
                  livingroomMotion.illuminance > ${illuminanceThreshold} &&
                  livingroomTemperature.temperature > ${temperatureThreshold};
  if (condition) {
    blinds.closeRoller = { value: true, delay: "${blindsCloseDelay}" };
  }
}
Shelly.setTriggerOnce(livingroomMotion, "motion", closeBlinds);
Shelly.setTriggerOnAnyChange(livingroomTemperature, "temperature > ${temperatureThreshold}", closeBlinds);
```

### Pattern L — Sensor property threshold triggers notification
> Template 14: Monitor a sensor property (e.g. battery) and send a notification when it drops below a threshold.
```js
Shelly.setTriggerOnAnyChange(motionSensor, "battery < ${batteryThreshold}", () => {
  Shelly.sendEmailNotification("Motion sensor battery is " + motionSensor.battery + "%");
});
```

### Pattern N — Button double-press sends phone alert
> Template 17: Double-press a button to send a high-priority phone alert, usable as a discreet help signal.
```js
Shelly.setTriggerOnce(button, "o1PressedTwice", () => {
  Shelly.sendPhoneAlertNotification("${alertMessage}");
});
```

### Pattern O — Motion-triggered illuminance-based roller control
> Template 18: On motion, open or close a curtain/roller based on whether illuminance is above or below a threshold.
```js
function controlCurtain() {
  if (motionSensor.illuminance > ${closeAbove}) {
    curtain.open = false;
  } else if (motionSensor.illuminance < ${closeAbove}) {
    curtain.open = true;
  }
}
Shelly.setTriggerOnce(motionSensor, "motion", controlCurtain);
```
