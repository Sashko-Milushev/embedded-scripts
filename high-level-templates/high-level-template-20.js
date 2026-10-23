
/**
 * @device door: DW_SENSOR
 *   @description "The door sensor to monitor"
 *
 * @param notification = Door activity today
 *   @label "Notification"
 *   @description "Notification message with the daily door activity count"
 *
 */

if (global.doorOpenCount === undefined) {
    global.doorOpenCount = 0;
}
if (global.doorCloseCount === undefined) {
    global.doorCloseCount = 0;
}

var door = Shelly.getDevice("${door}"); // ${doorName}

function resetDoorCounts() {
    Shelly.sendPhoneStandardNotification(
        "${notification}" +
        ": opened " + global.doorOpenCount +
        " times, closed " + global.doorCloseCount + " times"
    );

    global.doorOpenCount = 0;
    global.doorCloseCount = 0;
}

function countDoorOpen() {
    global.doorOpenCount = global.doorOpenCount + 1;

}

function countDoorClose() {
        global.doorCloseCount = global.doorCloseCount + 1;
}

Shelly.setScheduleTrigger("00:00", [1,2,3,4,5,6,7], resetDoorCounts);
Shelly.setTriggerOnAnyChange(door, "open", countDoorOpen);
Shelly.setTriggerOnAnyChange(door, "closed", countDoorClose);
