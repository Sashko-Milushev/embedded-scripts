/**
 * @device gate: RELAY_ROLLER
 *   @description "Gate relay"
 *
 * @device gateButton: BUTTON
 *   @description "Bluetooth button"
 */

var gate = Shelly.getDevice("${gate}");
var gateButton = Shelly.getDevice("${gateButton}");

function openGate() {
  if (gate.closed) {
    gate.open = true;
  }
}

Shelly.setTriggerOnce(gateButton, "o1PressedOnce", openGate);

