import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/** Brand navy: also exposed as CSS custom properties in `styles.scss` for the app chrome. */
export const BRAND_NAVY = '#14213D';

/**
 * Aura with an orange primary and navy text on it. Every pairing is WCAG AA or better:
 * navy on orange 500/400/300 = 5.7/7.1/9.5. Hover and active lighten the orange instead of
 * darkening it, because navy on orange 600 drops to 4.49. White text is never placed on orange.
 */
export const JTrainingPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{orange.50}',
      100: '{orange.100}',
      200: '{orange.200}',
      300: '{orange.300}',
      400: '{orange.400}',
      500: '{orange.500}',
      600: '{orange.600}',
      700: '{orange.700}',
      800: '{orange.800}',
      900: '{orange.900}',
      950: '{orange.950}',
    },
    colorScheme: {
      light: {
        primary: {
          color: '{primary.500}',
          contrastColor: BRAND_NAVY,
          hoverColor: '{primary.400}',
          activeColor: '{primary.300}',
        },
        highlight: {
          background: '{primary.50}',
          focusBackground: '{primary.100}',
          color: '{primary.800}',
          focusColor: '{primary.900}',
        },
        text: {
          color: '{surface.800}',
          hoverColor: '{surface.900}',
          mutedColor: '{surface.600}',
          hoverMutedColor: '{surface.700}',
        },
      },
    },
  },
  components: {
    // Aura's danger red 500 with white text is 3.8:1; red 700 is 6.5:1 (outlined: red 700 on white).
    button: {
      colorScheme: {
        light: {
          root: {
            danger: {
              background: '{red.700}',
              hoverBackground: '{red.800}',
              activeBackground: '{red.900}',
              borderColor: '{red.700}',
              hoverBorderColor: '{red.800}',
              activeBorderColor: '{red.900}',
            },
          },
          outlined: {
            danger: { borderColor: '{red.300}', color: '{red.700}' },
          },
          text: {
            danger: { color: '{red.700}' },
          },
        },
      },
    },
    // Used by SelectButton. Aura's unchecked text (slate 500 on slate 100) is 4.3:1, below AA;
    // the checked option was a barely visible white chip. Now: slate 600 (6.9:1) and navy on orange.
    togglebutton: {
      colorScheme: {
        light: {
          root: {
            color: '{surface.600}',
            hoverColor: '{surface.800}',
            checkedColor: BRAND_NAVY,
          },
          content: {
            checkedBackground: '{primary.color}',
          },
        },
      },
    },
  },
});
