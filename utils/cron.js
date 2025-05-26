export function makeEndTime(minutesAhead = 60) {
  const now = new Date();
  now.setMinutes(now.getMinutes() + minutesAhead);
  return now.toISOString();
}
