import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { ChartData, ChartOptions } from 'chart.js';
import { UIChart } from 'primeng/chart';
import { WeekReps } from '../../../core/services/analytics/exercise-analytics';
import { LocalDatePipe } from '../../../shared/pipes/local-date.pipe';
import { CHART_HEIGHT, CHART_THEME } from '../chart-theme';

/** Reps per week: one series of thin columns growing from a single baseline. */
@Component({
  selector: 'app-weekly-reps-chart',
  imports: [TranslocoPipe, UIChart, LocalDatePipe],
  templateUrl: './weekly-reps-chart.html',
  styleUrl: '../chart-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeeklyRepsChart {
  readonly weeks = input.required<readonly WeekReps[]>();
  readonly language = input.required<string>();

  protected readonly height = CHART_HEIGHT;

  protected readonly data = computed<ChartData<'bar'>>(() => {
    const date = new Intl.DateTimeFormat(this.language(), { day: 'numeric', month: 'short' });
    return {
      labels: this.weeks().map((week) => date.format(week.weekStart)),
      datasets: [
        {
          data: this.weeks().map((week) => week.reps),
          backgroundColor: CHART_THEME.mark,
          hoverBackgroundColor: CHART_THEME.mark,
          // Rounded data end, square at the baseline; thin columns leave air in each slot.
          borderRadius: { topLeft: 4, topRight: 4 },
          borderSkipped: 'start',
          maxBarThickness: 24,
        },
      ],
    };
  });

  protected readonly options = computed<ChartOptions<'bar'>>(() => {
    const number = new Intl.NumberFormat(this.language());
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      font: { family: CHART_THEME.font },
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          callbacks: { label: (item) => number.format(item.parsed.y ?? 0) },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: CHART_THEME.grid },
          ticks: { color: CHART_THEME.text, maxRotation: 0, autoSkip: true, maxTicksLimit: 6 },
        },
        y: {
          beginAtZero: true,
          grid: { color: CHART_THEME.grid },
          border: { display: false },
          ticks: { color: CHART_THEME.text, precision: 0, maxTicksLimit: 5 },
        },
      },
    };
  });
}
