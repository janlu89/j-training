/**
 * Colours of the charts. Canvas cannot read CSS custom properties, so the values mirror the theme:
 * one series per chart in orange 600 (3.6:1 on white, validated as a chart mark), recessive
 * hairline grid, axis text in slate 600 (7.6:1).
 */
export const CHART_THEME = {
  mark: '#ea580c',
  surface: '#ffffff',
  grid: '#e2e8f0',
  text: '#475569',
  font: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
} as const;

export const CHART_HEIGHT = '220px';
