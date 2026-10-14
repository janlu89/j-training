import { providePrimeNG } from 'primeng/config';
import { JTrainingPreset } from './j-training.preset';

export function provideAppPrimeNG() {
  return providePrimeNG({
    theme: {
      preset: JTrainingPreset,
      // Light only for now: the dark scheme activates solely on this class, which is never set.
      options: { darkModeSelector: '.app-dark' },
    },
  });
}
