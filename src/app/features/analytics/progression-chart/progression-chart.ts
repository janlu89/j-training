import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { ChartData, ChartOptions } from 'chart.js';
import { UIChart } from 'primeng/chart';
import { ProgressionPoint } from '../../../core/services/analytics/exercise-analytics';
import { LocalDatePipe } from '../../../shared/pipes/local-date.pipe';
import { LocalNumberPipe } from '../../../shared/pipes/local-number.pipe';
import { CHART_HEIGHT, CHART_THEME } from '../chart-theme';

/** Load at equal reps over time: a single series, so the title names it and no legend is shown. */
@Component({
  selector: 'app-progression-chart',
  imports: [TranslocoPipe, UIChart, LocalDatePipe, LocalNumberPipe],
  templateUrl: './progression-chart.html',
  styleUrl: '../chart-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressionChart {
  readonly points = input.required<readonly ProgressionPoint[]>();
  readonly reps = input.required<number>();
  /** Translated load unit ("kg", "kg per braccio"). */
  readonly unit = input.required<string>();
  readonly language = input.required<string>();

  protected readonly height = CHART_HEIGHT;

  protected readonly data = computed<ChartData<'line'>>(() => {
    const date = new Intl.DateTimeFormat(this.language(), { day: 'numeric', month: 'short' });
    return {
      labels: this.points().map((point) => date.format(point.date)),
      datasets: [
        {
          data: this.points().map((point) => point.kg),
          borderColor: CHART_THEME.mark,
          backgroundColor: CHART_THEME.mark,
          // No area fill: the axis does not start at zero, so a filled area would exaggerate.
          fill: false,
        },
      ],
    };
  });

  protected readonly options = computed<ChartOptions<'line'>>(() => {
    const number = new Intl.NumberFormat(this.language(), { maximumFractionDigits: 2 });
    const unit = this.unit();
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      // The crosshair finds the date: the pointer does not have to land on the point.
      interaction: { mode: 'index', intersect: false },
      font: { family: CHART_THEME.font },
      elements: {
        line: { borderWidth: 2, tension: 0, borderCapStyle: 'round', borderJoinStyle: 'round' },
        point: {
          radius: 4,
          hoverRadius: 6,
          hitRadius: 12,
          borderWidth: 2,
          borderColor: CHART_THEME.surface,
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          callbacks: { label: (item) => `${number.format(item.parsed.y ?? 0)} ${unit}` },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: CHART_THEME.grid },
          ticks: { color: CHART_THEME.text, maxRotation: 0, autoSkip: true, maxTicksLimit: 6 },
        },
        y: {
          grace: '10%',
          grid: { color: CHART_THEME.grid },
          border: { display: false },
          ticks: {
            color: CHART_THEME.text,
            maxTicksLimit: 5,
            callback: (value) => number.format(+value),
          },
        },
      },
    };
  });
}
