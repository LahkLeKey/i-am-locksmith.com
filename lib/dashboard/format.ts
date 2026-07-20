export function formatUsd(value: number): string {
  return new Intl
      .NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      })
      .format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatTimeLabel(isoDate: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    const [year, month, day] = isoDate.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
}

export function formatSchedule(isoDate: string|null): string {
  if (!isoDate) {
    return 'Unscheduled';
  }

  const date = new Date(isoDate);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
