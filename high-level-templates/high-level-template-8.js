// Blink a light a set number of times when a button is pressed.

/**
 * @device light: RELAY
 *   @description "Relay controlling the light that blinks when the button is pressed."
 *
 * @device button: BUTTON
 *   @description "Bluetooth button that triggers the blink sequence on a single press."
 *
 * @param blinks = 10
 *   @label "Blink Count"
 *   @description "Number of times the light blinks when the button is pressed."
 */

var light = Shelly.getDevice("${light}"); // ${lightName}
var button = Shelly.getDevice("${button}"); // ${buttonName}

function blink() {
  let i = 0;

  function step() {
    if (i >= ${blinks} * 2)
      return;

    light.o1On = (i % 2 === 0);
    i++;
    Timer.set(300, false, step);
  }

  step();
}

Shelly.setTriggerOnce(button, "o1PressedOnce", blink);
