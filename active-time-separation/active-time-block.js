// ======== START ACTIVE TIME ===========
function ATisAlwaysActive() {
  return !ACTIVE_TIME || Object.keys(ACTIVE_TIME).length === 0;
}

function ATparseTime(timeStr) {
  let p = timeStr.split(":");
  return { h: parseInt(p[0], 10), m: parseInt(p[1], 10) };
}

function ATgetLocalDayStart(ts) {
  let d = new Date(ts);
  return ts -
    d.getHours() * 3600000 -
    d.getMinutes() * 60000 -
    d.getSeconds() * 1000 -
    d.getMilliseconds();
}

function ATbuildTime(dayStartTs, hours, minutes) {
  return dayStartTs + hours * 3600000 + minutes * 60000;
}

function ATgetCurrentWindowEnd(now) {
  if (ATisAlwaysActive())
    return null;

  if (typeof now !== "number")
    now = now.getTime();

  let today = new Date(now).getDay();
  let time = ATparseTime(ACTIVE_TIME.start);

  for (let day of ACTIVE_TIME.days) {
    let daysBack = (today - day + 7) % 7;
    let startBase = ATgetLocalDayStart(now) - daysBack * 86400000;
    let start = ATbuildTime(startBase, time.h, time.m);
    let end = start + ACTIVE_TIME.duration * 60000;

    if (now >= start && now < end)
      return end;
  }

  return null;
}

function ATgetInitialState() {
  return ATisAlwaysActive() || ATgetCurrentWindowEnd(Date.now()) !== null;
}

function ATgetNextTransition(active) {
  if (ATisAlwaysActive())
    return null;

  let now = Date.now();
  let today = new Date(now).getDay();
  let time = ATparseTime(ACTIVE_TIME.start);
  let baseDay = ATgetLocalDayStart(now);

  if (active) {
    let end = ATgetCurrentWindowEnd(now);
    if (end === null)
      return null;

    return { time: end, active: false };
  }

  let nextStart = null;

  for (let day of ACTIVE_TIME.days) {
    let daysAhead = (day - today + 7) % 7;
    let startBase = baseDay + daysAhead * 86400000;
    let start = ATbuildTime(startBase, time.h, time.m);

    if (start <= now)
      start += 7 * 86400000;

    if (nextStart === null || start < nextStart)
      nextStart = start;
  }

  if (nextStart === null)
    return null;

  return { time: nextStart, active: true };
}

function ATstart() {
  if (ATisAlwaysActive()) {
    isActive = true;
    ATstartScanner();
    return;
  }

  ATnextStep(ATgetInitialState());
}

function ATscheduleNext(active) {
  if (ATisAlwaysActive())
    return;

  if (timerId !== null) {
    Timer.clear(timerId);
    timerId = null;
  }

  let next = ATgetNextTransition(active);
  if (!next || next.time === null) {
    print("ACTIVE TIME ERROR: no next transition");
    return;
  }

  let delay = next.time - Date.now();
  if (delay < 1000)
    delay = 1000;

  timerId = Timer.set(delay, false, function () {
    timerId = null;
    ATnextStep(next.active);
  });
}

function ATnextStep(active) {
  isActive = active;
  if (active) {
    ATstartScanner();
  } else {
    ATstopScanner();
  }
  ATscheduleNext(active);
}
// ======== END ACTIVE TIME ===========