import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveContentMarkers,
  supportedContentMarkerIds
} from '../src/lib/content-markers.mjs';

test('the marker registry exposes only the supported featured marker', () => {
  assert.deepEqual(supportedContentMarkerIds, ['featured']);
  assert.ok(Object.isFrozen(supportedContentMarkerIds));
});

test('supported markers resolve to frozen registry descriptors and unknown IDs are no-ops', () => {
  const markers = resolveContentMarkers(['future-marker', 'constructor', 'featured', 'featured']);

  assert.deepEqual(markers, [{ id: 'featured', label: 'Featured', tone: 'accent' }]);
  assert.ok(Object.isFrozen(markers));
  assert.ok(Object.isFrozen(markers[0]));
  assert.deepEqual(resolveContentMarkers(), []);
});
