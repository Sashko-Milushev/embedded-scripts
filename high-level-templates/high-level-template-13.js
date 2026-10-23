// Toggle a light on/off with a single button press.

/**
 * @device button: BUTTON
 *   @description "Bluetooth button used to toggle the light on or off."
 *
 * @device light: [RELAY, LIGHT, DIMMER]
 *   @description "Relay controlling the light to be toggled."
 */

var button = Shelly.getDevice("${button}"); // ${buttonName}
var light = Shelly.getDevice("${light}"); // ${lightName}

Shelly.setTriggerOnce(button, "o1PressedOnce", () => { light.on = !light.on; });
