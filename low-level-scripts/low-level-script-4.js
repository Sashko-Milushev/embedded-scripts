let MOTION_MAC = "b0:c7:de:41:b3:0c";

let MAX_ILLUMINANCE = 100;
let switchId = 0;

function parsePayload(payload){
  if(!payload || payload.length < 2)
      return null;

  let bytes = [];

  for(let i = 0; i < payload.length; i++){
    bytes.push(payload.charCodeAt(i) & 0xff);
  }

  let state = {
    motion: null,
    illuminance: null
  };

  for(let i = bytes.length - 2; i >= 0; i--){
    if(bytes[i] === 0x21){
      if(bytes[i + 1] === 0x01) state.motion = "motion";
      if(bytes[i + 1] === 0x00) state.motion = "no_motion";
    }
  }

  for(let i = 1; i < bytes.length; ){
    let id = bytes[i++];

    if(id === 0x05){
      state.illuminance =
        (bytes[i] | (bytes[i + 1] << 8) | (bytes[i + 2] << 16)) / 100.0;
      i += 3;
      continue;
    }

    if(id === 0x00 || id === 0x01){
      i += 1;
      continue;
    }

    if(id === 0x3f){
      i += 2;
      continue;
    }

    if(id === 0x21){
      i += 1;
      continue;
    }

    break;
  }

  return state;
}

BLE.Scanner.Start({duration_ms: BLE.Scanner.INFINITE_SCAN, active: true});

BLE.Scanner.Subscribe(function(event, result){
  if(event !== BLE.Scanner.SCAN_RESULT)
      return;

  if(!result.addr || result.addr !== MOTION_MAC)
      return;

  if(!result.service_data || !result.service_data.fcd2)
      return;

  let parsed = parsePayload(result.service_data.fcd2);

  if(!parsed)
      return;

  console.log(parsed.illuminance + " illuminance");

  if(
    parsed.motion === "motion" &&
    parsed.illuminance !== null &&
    parsed.illuminance < MAX_ILLUMINANCE
  ){
    Shelly.call("Switch.Set", { id: switchId, on: true });
  }
});