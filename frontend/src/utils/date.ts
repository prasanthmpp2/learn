export function formatRelativeTime(value: string) {
  const date = new Date(value)
  const diff = date.getTime() - Date.now()
  const minutes = Math.round(diff / 60000)

  if (Math.abs(minutes) < 1) {
    return 'just now'
  }

  if (Math.abs(minutes) < 60) {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      minutes,
      'minute',
    )
  }

  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      hours,
      'hour',
    )
  }

  const days = Math.round(hours / 24)
  return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
    days,
    'day',
  )
}

export function formatClockTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}
