export function formatTo12Hour(time: string): string {
  if (!time) return '';

  const [hourStr, minute] = time.split(':');
  let hour = parseInt(hourStr, 10);

  const period = hour >= 12 ? 'PM' : 'AM';

  if (hour === 0) hour = 12;
  else if (hour > 12) hour -= 12;

  return `${hour}:${minute} ${period}`;
}
