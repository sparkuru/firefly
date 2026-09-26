import assert from 'node:assert/strict';
import test from 'node:test';
import { HOME_BROWSE_HISTORY_KEY, homeBrowseHref, homeBrowseState } from '../src/lib/home-browse-history.ts';

const directories = new Set(['/pages/', '/lab/', '/posts/', '/posts/nested/']);

test('browse history restores only versioned registered public directories or root', () => {
  for (const href of ['/', ...directories]) {
    assert.equal(homeBrowseHref(homeBrowseState(null, href), directories), href);
  }
  for (const state of [null, 1, [], {}, { [HOME_BROWSE_HISTORY_KEY]: '/posts/' },
    { [HOME_BROWSE_HISTORY_KEY]: { version: 2, href: '/posts/' } },
    { [HOME_BROWSE_HISTORY_KEY]: { version: 1, href: '/posts/stale/' } },
    { [HOME_BROWSE_HISTORY_KEY]: { version: 1, href: '/posts/', query: 'private query' } },
    { [HOME_BROWSE_HISTORY_KEY]: { version: 1, href: 'https://example.test/' } }]) {
    assert.equal(homeBrowseHref(state, directories), '/');
  }
});

test('browse writes preserve unrelated history without mutating it or persisting queries', () => {
  const original = { otherComponent: { value: 7 }, [HOME_BROWSE_HISTORY_KEY]: { version: 1, href: '/pages/' } };
  const result = homeBrowseState(original, '/posts/nested/');
  assert.deepEqual(result, { otherComponent: { value: 7 }, [HOME_BROWSE_HISTORY_KEY]: { version: 1, href: '/posts/nested/' } });
  assert.equal(original[HOME_BROWSE_HISTORY_KEY].href, '/pages/');
  assert.deepEqual(homeBrowseState([], '/'), { [HOME_BROWSE_HISTORY_KEY]: { version: 1, href: '/' } });
});
