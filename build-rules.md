# Build Rules: High-Level → Low-Level Template Conversion

## Goal
Convert user-friendly high-level templates into compact, device-ready low-level templates for Shelly devices.

---

## Placeholder Format
- Both high-level and low-level templates use: `${paramName}`
- Params must be listed in the template header comment with defaults
- The same program that loads high-level templates will load low-level templates

---

## Template Header (required in every file)
JSDoc-style block at the top. Same format for both high-level and low-level templates.

```js
/**
*   @deviceMac paramName: BUTTON
*     @description "..."
*
*   @param paramName = defaultValue
*     @label "..."
*     @description "..."
*/
```

**Annotation types:**
| Annotation | Maps to | Value type |
|---|---|---|
| `@deviceIp` | Any device with an IP — including the host relay | IP address string |
| `@deviceMac` | BLE device — identified by MAC address | string `"xx:xx:xx:xx:xx:xx"` |
| `@param` | Generic user param | string / number |

> Every device in a low-level template must use either `@deviceIp` or `@deviceMac` — bare `@device` is not allowed.
> The script holder (relay/roller) always uses `@deviceIp` even in BLE-only scripts where the IP is not used at runtime.

**Switch channel ID:**
- Always declare `let switchId = 0;` as a variable in the script body — never hardcode `0` directly in `Shelly.call`
- Use `switchId` everywhere: `{ id: switchId, on: true }`
- Value is always `0` for now — kept as a variable for future flexibility

**Energy meter channel ID:**
- Always declare `let energyMeterId = 0;` as a variable — never hardcode `0` in `EM.GetStatus`
- Use `energyMeterId`: `{ id: energyMeterId }`

**General rule:** any device channel ID (`id:`) must be declared as a named variable, never inlined.

**No inline placeholder values:**
- MAC addresses, switch IDs, IP addresses, and any other device-specific values must be declared as named variables
- The placeholder `${param}` is assigned to a variable at the top — never used inline in function calls or conditions
- Examples:
  - `let buttonMacAddr = ${waterButton};` → used as `result.addr !== buttonMacAddr`
  - `let switchId = 0;` → used as `{ id: switchId, on: true }`

**Placeholder quoting rule:**
- Never wrap a placeholder in quotes — `"${param}"` is wrong
- All param values (strings, IPs, MACs, booleans, numbers) are substituted as-is by the processor — already correctly typed
- Correct: `let HT_IP = ${humidityAndTemperatureSensor};`
- Wrong: `let HT_IP = "${humidityAndTemperatureSensor}";`

**First device rule:**
- The **first** device in **both high-level and low-level templates** is always the host device (the one running the script)
- Must be a `RELAY`, `RELAY_ROLLER`, or `EMETER` type
- In low-level templates: always annotated as `@deviceIp` — even in BLE-only scripts where the IP is not used at runtime
- All other devices follow after it in the header

---

## Conversion Rules

### 1. Variable Declarations
- Keep `let` — Shelly mJS supports it
- Remove unused variables

### 1b. Code Formatting
- No surplus comments — header only
- One action per line — no `{ action; return; }` inline blocks
- Single-statement `if` → no braces, statement indented on next line
- Multi-statement `if` → always use braces
- Blank line after every `return;` inside a function body
- Blank line between variable declaration group and first function
- Blank line between each function
- Blank line after timer/null-check blocks before the next statement
- Space before `(` in `if`, `for`, `while`, `function`
- Space before `{` in function and block declarations

### 2. Logging
- Remove all `console.log(...)` and `print(...)` — except inside error handlers
- Error handlers must keep a `print(...)` call so failures are visible on-device
- Example: `if(errCode !== 0){ print("ERROR:", errMsg); return; }`

### 3. Timers
- High-level: `setTimeout`, `setInterval`
- Low-level: `Timer.set(interval_ms, repeat_bool, callback)`

### 4. Active Time
- Low-level templates may use the processor-provided `${activeTime}` value:
  ```js
  let ACTIVE_TIME = ${activeTime};
  ```
- Do **not** declare `activeTime` in the template header as `@param`
- `activeTime` is injected by the template processor and is available even though it is not listed in the JSDoc block
- Treat an empty object (`{}`) or missing value as always active
- Backend validation guarantees populated active-time objects include `start`, `duration`, and `days`
- For BLE-triggered templates, active time should control BLE scanner start/stop
- Track scanner state with a `scannerRunning` variable
- Before calling `BLE.Scanner.Stop()`, check `scannerRunning`; do not stop an already-stopped scanner
- Normal active-time transitions should not log; only active-time errors should use `print(...)`

### 5. Timeout / Duration Params
- High-level param is in **minutes** with optional `m` suffix (e.g. `timeout = 15m` or `timeout = 15`)
- Low-level formula: `${timeout} * 60 * 1000`
- No quotes around the placeholder — processor substitutes a bare number, no conversion needed
- The `m` suffix is stripped by the template processor before substitution
- Do NOT pre-compute — keep the formula in the template so the value stays readable

### 6. Delay Params _(placeholder rule — no examples yet)_
- High-level param may use unit suffix: `delay = 1s` (seconds) or `delay = 1m` (minutes)
- `parseFloat("${delay}")` strips the suffix safely
- Multiplier depends on unit: `* 1000` for seconds, `* 60 * 1000` for minutes
- **TODO:** define unit detection logic when first real delay example is added

### 7. Debounce
- Hardcoded as `1500` ms in all templates for now
- Will become a global setting later — do not expose as a param yet

### 8. Device → Concrete Params
| High-level device type | Annotation | Low-level value |
|---|---|---|
| `BUTTON` (BLE) | `@deviceMac` | BLE MAC address string |
| `RELAY` (local, script holder) | `@deviceIp` | IP address — `let switchId = 0;` in script body |
| `RELAY_ROLLER` (local, script holder) | `@deviceIp` | IP address — `let switchId = 0;` in script body |
| `DW_SENSOR` (BLE) | `@deviceMac` | BLE MAC address string |
| `MOTION_SENSOR` (BLE) | `@deviceMac` | BLE MAC address string |
| `E_METER` (local, script holder) | `@deviceIp` | IP address — `let energyMeterId = 0;` in script body |
| `TH_SENSOR` (Wi-Fi) | `@deviceIp` | IP address — used for webhook/KVS calls |

**Roller-specific rule:**
- `open`, `closed`, `stop`, and other roller/blind properties are **only valid on `RELAY_ROLLER`** devices
- Never use roller properties on a plain `RELAY` — it will fail at runtime
- Low-level equivalent: `Shelly.call("Cover.Open", { id: switchId }, callback)` / `Cover.Close` / `Cover.Stop`

### 9. Device & Param Naming
- Device and param names in the low-level template **must exactly match** the names used in the high-level template
- The same template processor loads both — mismatched names will cause substitution to fail

### 10. HTTP Requests
- High-level: `fetch(...)`
- Low-level: `Shelly.call("HTTP.GET", { url: "..." }, callback)`

### 11. Events / Hooks
- High-level: `on("event", handler)`
- Low-level: `Shelly.addEventHandler(handler)` + filter inside handler

### 12. Shelly RPC Calls
- High-level: `shelly.call(method, params)`
- Low-level: `Shelly.call(method, params, callback)`

### 13. Code Size
- Collapse short error handlers to one line
- Remove all comments except the header
- No whitespace-only lines

---

## Notes
- Shelly scripting: mJS (subset of ES5/ES6)
- No `Promise`, no `async/await`, no `require`
- Max script size varies by model — keep scripts lean
- Add new rules here as patterns are discovered
