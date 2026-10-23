// Send a phone alert when a button is double-pressed.

/**
 * @device button: BUTTON
 *   @description "Bluetooth button that sends a phone alert when double-pressed, usable as a discreet help signal."
 *
 * @param alertMessage = "Button was double-pressed."
 *   @label "Alert Message"
 *   @description "The message sent as a phone alert when the button is double-pressed."
 */

var button = Shelly.getDevice("${button}"); // ${buttonName}

Shelly.setTriggerOnce(button, "o1PressedTwice", () => {
  Shelly.sendPhoneAlertNotification("${alertMessage}");
});
