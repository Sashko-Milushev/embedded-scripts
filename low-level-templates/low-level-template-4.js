/**
*   @deviceIp kidsBathroomLights: RELAY
*     @description "The relay for the kids bathroom lights"
*
*   @deviceMac kidsBathroomMotion: MOTION_SENSOR
*     @description "Kids bathroom motion sensor"
*
*   @param highIlluminanceValue = 100
*     @label "High Illuminance Value"
*     @description "A maximum threshold of the illuminance for the lights to turn on"
*/

let switchId = 0;
let motionSensorMac = ${kidsBathroomMotion};
let MAX_ILLUMINANCE = ${highIlluminanceValue};

function parsePayload(payload) {
  if (typeof payload !== "string" || payload.length < 2)
    return null;

  const skip = {0x00: 1, 0x01: 1, 0x3f: 2};
  const state = {motion: null, illuminance: null};

  for (let i = 1, len = payload.length; i < len; ) {
    const id = payload.charCodeAt(i++);
    if (id === 0x21) {
      state.motion = payload.charCodeAt(i) === 0x01 ? "motion" : "no_motion";
      i += 1;
      continue;
    }

    if (id === 0x05) {
      const b0 = payload.charCodeAt(i);
      const b1 = payload.charCodeAt(i + 1);
      const b2 = payload.charCodeAt(i + 2);
      state.illuminance = (b0 | (b1 << 8) | (b2 << 16)) / 100.0;
      i += 3;
      continue;
    }

    const step = skip[id];
    if (step === undefined)
      break;

    i += step;
  }

  return state;
}

function bleScanCallback(event, result) {
  if (event !== BLE.Scanner.SCAN_RESULT)
    return;

  if (!result.addr || result.addr !== motionSensorMac)
    return;

  if (!result.service_data || !result.service_data.fcd2)
    return;

  let parsed = parsePayload(result.service_data.fcd2);
  if (!parsed)
    return;

  if (
    parsed.motion === "motion" &&
    parsed.illuminance !== null &&
    parsed.illuminance < MAX_ILLUMINANCE
  ) {
    Shelly.call("Switch.Set", { id: switchId, on: true });
  }
}

BLE.Scanner.Start({ duration_ms: BLE.Scanner.INFINITE_SCAN, active: true });
BLE.Scanner.Subscribe(bleScanCallback);
