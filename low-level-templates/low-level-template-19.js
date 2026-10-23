/**
*   @deviceIp kitchenLight: RELAY
*     @description "Kitchen light relay"
*
*   @deviceIp coffeeMachine: RELAY
*     @description "Coffee machine relay"
*/

let switchId = 0;
let coffeeMachineIp = ${coffeeMachine};

let MORNING_HOUR = 7;
let MORNING_MINUTE = 0;
let MORNING_DAYS = [1, 2, 3, 4, 5];
let morningTimer = null;

function onCoffeeMachineResponse(res, errCode, errMsg) {
  if (errCode !== 0 || !res) {
    print("COFFEE MACHINE ERROR:", errMsg);
  }
}

function turnOnKitchenLight() {
  Shelly.call("Switch.Set", { id: switchId, on: true });
}

function turnOnCoffeeMachine() {
  let url = "http://" + coffeeMachineIp + "/rpc/Switch.Set?id=0&on=true";
  Shelly.call("HTTP.GET", { url: url, timeout: 5 }, onCoffeeMachineResponse);
}

function startMorning() {
  turnOnKitchenLight();
  turnOnCoffeeMachine();
}

function getNextMorningTime(now) {
  let next = new Date(now.getTime());
  next.setSeconds(0, 0);
  next.setHours(MORNING_HOUR, MORNING_MINUTE, 0, 0);

  for (let i = 0; i < 8; i++) {
    if (MORNING_DAYS.indexOf(next.getDay()) !== -1 && next > now)
      return next;

    next.setDate(next.getDate() + 1);
    next.setHours(MORNING_HOUR, MORNING_MINUTE, 0, 0);
  }

  return next;
}

function onMorningTimer() {
  morningTimer = null;
  startMorning();
  scheduleNextMorning();
}

function scheduleNextMorning() {
  if (morningTimer !== null) {
    Timer.clear(morningTimer);
    morningTimer = null;
  }

  let next = getNextMorningTime(new Date());
  let delay = next.getTime() - Date.now();

  if (delay < 1000)
    delay = 1000;

  morningTimer = Timer.set(delay, false, onMorningTimer);
}

scheduleNextMorning();
