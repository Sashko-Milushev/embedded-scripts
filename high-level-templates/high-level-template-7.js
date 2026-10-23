/**
 * @device gate: RELAY_ROLLER
 *   @description "Gate relay"
 *
 * @device gateButton: BUTTON
 *   @description "Bluetooth button"
 */

var gate = Shelly.getDevice("${gate}");
var gateButton = Shelly.getDevice("${gateButton}");

function closeGate() {
  if (gate.open) {
    gate.open = false;
  }
}

Shelly.setTriggerOnce(gateButton, "o1PressedThreeTimes", closeGate);

