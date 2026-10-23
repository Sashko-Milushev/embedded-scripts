/**
*   @deviceIp curtain: RELAY_ROLLER
*     @description "The curtain roller to control."
*
*   @deviceMac motionSensor: MOTION_SENSOR
*     @description "Motion sensor that triggers curtain control based on illuminance."
*
*   @param closeAbove = 500.0
*     @label "Close Above"
*     @description "Close curtain when illuminance is above this value; open when below."
*/

let switchId = 0;
let motionSensorMac = ${motionSensor};
let closeAbove = ${closeAbove};

function openCurtain() {
  Shelly.call("Cover.Open", { id: switchId });
}

function closeCurtain() {
  Shelly.call("Cover.Close", { id: switchId });
}

function bleScanCallback(event, result) {
  if (event !== BLE.Scanner.SCAN_RESULT)
    return;

  if (!result.addr || result.addr !== motionSensorMac)
    return;

  if (!result.service_data || !result.service_data.illuminance)
    return;

  let lux = result.service_data.illuminance;

  if (lux > closeAbove)
    closeCurtain();
  else if (lux < closeAbove)
    openCurtain();
}

BLE.Scanner.Start({ duration_ms: BLE.Scanner.INFINITE_SCAN, active: true });
BLE.Scanner.Subscribe(bleScanCallback);
