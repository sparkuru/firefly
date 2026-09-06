# Grep matching performance baseline

## Method

The benchmark imported the built Terminal command directly, constructed the
same public VFS shape used by the runtime, and loaded every Markdown file under
the configured workspace's `posts/` and `pages/` roots. Each case ran three
times in one Node process; the values below are approximate wall-clock samples,
not a test threshold.

Corpus: 153 documents, 27,555 lines, approximately 871,982 characters, maximum
line length 1,360 characters.

## Observed samples before optimization

| Case | Samples |
| --- | --- |
| `grep cat` | 66.6–77.5 ms |
| `grep -w cat` | 680.2–698.4 ms |
| `grep -E 'cat|dog'` | 104.0–106.5 ms |
| `grep -Ew 'cat|dog'` | 700.4–710.5 ms |
| `grep -w zzzzzz` | 677.8–684.3 ms |
| `grep -E zzzzzz` | 47.8–48.0 ms |

The large whole-word delta appears on both matching and absent patterns,
consistent with `test()` doing a complete `matchFromWholeWord()` search from
each character position. The implementation should rerun these exact cases
after the change and record the resulting samples in `evidence.md`.
