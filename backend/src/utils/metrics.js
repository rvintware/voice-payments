const counters = Object.create(null);
export function inc(name) {
  counters[name] = (counters[name] || 0) + 1;
}
export function metricsText() {
  return Object.entries(counters)
    .map(([k, v]) => `${k} ${v}`)
    .join('\n');
} 