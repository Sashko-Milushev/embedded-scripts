/**
 * @device kitchenLight: RELAY
 *   @description "The kitchen light"
 *
 * @device coffeeMachine: RELAY
 *   @description "The coffee machine relay"
 *
 */

var kitchenLight = Shelly.getDevice("${kitchenLight}"); // ${kitchenLightName}
var coffeeMachine = Shelly.getDevice("${coffeeMachine}"); // ${coffeeMachineName}

function startMorning() {
    kitchenLight.on = true;
    coffeeMachine.on = true;
}
Shelly.setScheduleTrigger("07:00", [1,2,3,4,5], startMorning);
