# Reference palette and contrast constraints

The supplied image explicitly labels RGB values 97/108/140, 86/140/135, 178/213/155, 242/222/121, and 217/95/24. These map to `#616c8c`, `#568c87`, `#b2d59b`, `#f2de79`, and `#d95f18` respectively. The owner confirmed a dark Terminal.

Calculated WCAG contrast ratios against candidate dark backgrounds:

| Foreground | `#111923` canvas | `#18232e` shell | `#22313d` upper surface |
| --- | ---: | ---: | ---: |
| Slate blue `#616c8c` | 3.40 | 3.06 | 2.56 |
| Teal `#568c87` | 4.63 | 4.17 | 3.49 |
| Soft green `#b2d59b` | 10.85 | 9.77 | 8.18 |
| Yellow `#f2de79` | 13.06 | 11.75 | 9.84 |
| Orange `#d95f18` | 4.72 | 4.25 | 3.56 |
| Derived teal `#86aaa5` | 7.00 | 6.30 | 5.28 |
| Derived orange `#e88749` | 6.73 | 6.06 | 5.08 |
| Suggested body `#e1e8df` | 14.16 | 12.75 | 10.67 |
| Suggested muted `#a5b5b3` | 8.31 | 7.48 | 6.26 |

Ratios were calculated with the WCAG relative luminance formula. Source blue is suitable as a visible structural edge, not body text. Source teal and orange need brighter foreground variants on raised surfaces. Source green/yellow can serve direct text accents and filled controls with dark text.
