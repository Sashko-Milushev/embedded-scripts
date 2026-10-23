let MOTION_MAC = "b0:c7:de:41:b3:0c";

let NO_MOTION_OFF_DELAY_MS = 60000;
let FORCE_NO_MOTION_TIMEOUT_MS = 90000;
let WATCHDOG_INTERVAL_MS = 5000;

let motionState = "unknown";
let lastSeenMs = 0;
let offTimer = null;
let switchId = 0;

function motionStateParser(payload){
  if(!payload || payload.length < 2)
    return null;

  let bytes = [];
  for(let i = 0; i < payload.length; i++){
    bytes.push(payload.charCodeAt(i) & 0xff);
  }
  for (let i = bytes.length - 2; i >= 0; i--) {
    if (bytes[i] !== 0x21)
      continue;

    switch (bytes[i + 1]) {
      case 0x01:
        return "motion";

      case 0x00:
        return "no_motion";
    }
  }
  return null;
}

function cancelOffTimer(){
  if(offTimer !== null){
    Timer.clear(offTimer);
    offTimer = null;
  }
}

function startOffTimer(){
  cancelOffTimer();

  offTimer = Timer.set(NO_MOTION_OFF_DELAY_MS, false, function(){
    offTimer = null;
    if(motionState !== "no_motion")
      return;

    Shelly.call("Switch.Set", { id: switchId, on: false });
  });
}

function handleStateChange(newState){
  if(newState === motionState)
    return;

  motionState = newState;
  if(motionState === "motion"){
    cancelOffTimer();
    Shelly.call("Switch.Set", { id: switchId, on: true });
    return;
  }

  if(motionState === "no_motion"){
    startOffTimer();
  }
}

BLE.Scanner.Start({duration_ms: BLE.Scanner.INFINITE_SCAN, active: true});
BLE.Scanner.Subscribe(function(event, result){
  if(event !== BLE.Scanner.SCAN_RESULT)
    return;

  if(!result.addr || result.addr !== MOTION_MAC)
    return;

  let payload = "";
  if(result.service_data && result.service_data.fcd2){
    payload = result.service_data.fcd2;
  }

  let parsedState = motionStateParser(payload);
  lastSeenMs = Date.now();

  if(parsedState === null)
    return;

  if(motionState === "unknown"){
    motionState = parsedState;
    if(motionState === "motion"){
      Shelly.call("Switch.Set", { id: switchId, on: true });
    }
    return;
  }

  handleStateChange(parsedState);
});

Timer.set(WATCHDOG_INTERVAL_MS, true, function(){
  if(lastSeenMs === 0)
    return;

  let age = Date.now() - lastSeenMs;
  if(age > FORCE_NO_MOTION_TIMEOUT_MS){
    if(motionState !== "no_motion"){
      handleStateChange("no_motion");
    }
  }
});