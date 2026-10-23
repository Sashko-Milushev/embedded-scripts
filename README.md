# Shelly Automation Script Examples

A collection of real-world automation scenarios for Shelly Gen2/Gen3 devices, each shown in two forms: a low-level embedded script and a high-level Infinno script.

---

## Two Approaches, One Result

Every example in this repo solves the same automation problem in two different ways.

### Embedded JavaScript (low-level)
- Runs directly on the Shelly device
- No internet, no cloud, no Wi-Fi required in most cases
- Uses the Shelly scripting API (`BLE.Scanner`, `Timer`, `Shelly.call`, etc.)
- More verbose — you control every detail
- Works fully offline, even in remote or offline environments

### Infinno Scripting (high-level)
- Written using the Infinno API — shorter, more readable
- Abstracts away BLE parsing, timers, debounce, and error handling
- Easier to write and maintain
- Requires the Infinno platform to compile and deploy

Both approaches produce the same behavior on the device.

---

## Examples

### 1. Watering Pump via Bluetooth Button
Pressing a BLE button once starts the water pump. It stops automatically after a configurable timeout.

- Trigger: BLE button single press
- Action: relay ON → auto-off after N minutes
- Communication: BLE only — no Wi-Fi needed

→ [View example](md_demo/example.md)

---

### 2. Staircase Light via Door Sensor + Button
Opening a door turns on the relay. A long press on a BLE button turns it off immediately. Auto-off timer resets on each door opening.

- Trigger: door/window BLE sensor open event
- Override: BLE button long press → immediate off
- Action: relay ON → auto-off after N minutes

---

### 3. Motion-Activated Lights
Motion detected → lights on. No motion for a configurable hold-off period → lights off. Includes a watchdog that forces lights off if the sensor goes silent.

- Trigger: BLE motion sensor
- Action: relay ON while motion present, OFF after hold-off

---

### 4 & 5. Smart Bathroom Lights (Motion + Illuminance)
Only turns lights on if it is dark enough. Turns lights off after a hold-off period of no motion.

- Trigger: BLE motion sensor + illuminance reading
- Guard: lights only activate below a light threshold
- Action: relay ON on motion in the dark, OFF after hold-off

---

### 6. Gate Opener via Bluetooth Button
Single press on a BLE button opens the gate — but only if the gate is not already opening and was last closed.

- Trigger: BLE button single press
- Action: `Cover.Open`

---

### 7. Gate Closer via Bluetooth Button
Triple press on a BLE button closes the gate — only if it was last opened.

- Trigger: BLE button triple press
- Action: `Cover.Close`

---

### 8. Thermostat — H&T Sensor + Relay
Automatically keeps a room at the desired temperature. Supports heating and cooling modes. Runs entirely on the relay — no hub, no cloud.

- Sensor: Shelly H&T G3 (battery-powered, BLE/Wi-Fi)
- Action: relay ON/OFF based on temperature vs target with hysteresis
- Safety: forced OFF above max temperature, failsafe state on missing data
- Self-configuring: script automatically creates the webhook on the H&T sensor

> **Note:** Before starting the script for the first time, press the physical button on the H&T sensor to wake it up. This gives the script a window to register the webhook. If the button is not pressed in time, the script retries automatically every 5 minutes.

→ [View example](md_demo/thermostat.md)

---

## How to Read the Examples

Each example document contains:

1. **Description** — what the automation does, in plain language
2. **Embedded JavaScript** — the full low-level script, ready to paste into the Shelly scripting UI
3. **Infinno scripting** — the same automation written with the Infinno API

---

## Device Compatibility

All scripts target **Shelly Gen2 and Gen3** devices with scripting support.

| Device type | Used for |
|---|---|
| Shelly Plus/Pro relay | Switch control (`Switch.Set`) |
| Shelly Plus/Pro roller | Cover control (`Cover.Open`, `Cover.Close`) |
| Shelly BLU Button | BLE button events |
| Shelly BLU DW (door/window) | Door open/close events |
| Shelly BLU Motion | Motion + illuminance events |
| Shelly H&T G3 | Temperature + humidity (webhook push) |

---

## BLE Communication

BLE-based scripts use the BTHome protocol. The device holding the script listens continuously for BLE advertisements — no pairing required. This means the automation works with no Wi-Fi and no cloud.

---

## License

MIT

