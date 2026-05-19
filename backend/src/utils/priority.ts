const priorityMap: Record<string, number> = {
  high: 1,
  medium: 2,
  med: 2,
  low: 3,
};

export function normalizePriorityInput(value: unknown) {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim().toLowerCase();
  return priorityMap[normalized] ?? value;
}
