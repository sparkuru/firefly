import assert from 'node:assert/strict';
import test from 'node:test';
import { SitePluginRegistry } from '../src/lib/site-plugin-registry.mjs';

const document = {
  id: 'posts/fixture.md',
  route: '/posts/fixture/',
  collection: 'posts',
  presentation: 'firefly'
};

function fixturePlugin(calls, enabled) {
  return {
    manifest: { id: 'fixture' },
    isEnabled: () => enabled,
    loadBuildData: ({ preparedInput }) => {
      calls.push('load');
      return preparedInput;
    },
    postExtension: ({ buildData }) => {
      calls.push('extension');
      return buildData;
    }
  };
}

test('disabled site plugins do not read prepared build data or emit extensions', async () => {
  const calls = [];
  const registry = new SitePluginRegistry().register(fixturePlugin(calls, false));
  const config = { enabled: false };

  const siteData = await registry.loadBuildData({
    config,
    documents: [document],
    preparedInput: { value: 'build-only' }
  });

  assert.deepEqual(siteData, []);
  assert.deepEqual(registry.postExtensions({ document, buildData: null }, config, siteData), []);
  assert.deepEqual(calls, []);
});

test('enabled site plugins load build data and emit post-only extensions', async () => {
  const calls = [];
  const registry = new SitePluginRegistry().register(fixturePlugin(calls, true));
  const config = { enabled: true };
  const preparedInput = { value: 'build-only' };
  const siteData = await registry.loadBuildData({
    config,
    documents: [document],
    preparedInput
  });

  assert.equal(siteData.length, 1);
  assert.deepEqual(
    registry.postExtensions({ document, buildData: null }, config, siteData),
    [preparedInput]
  );
  assert.deepEqual(
    registry.postExtensions({ document: { ...document, collection: 'pages' }, buildData: null }, config, siteData),
    []
  );
  assert.deepEqual(calls, ['load', 'extension']);
});

test('site registration rejects publication and service host members', () => {
  assert.throws(
    () => new SitePluginRegistry().register({
      ...fixturePlugin([], true),
      publication: { contribute: async () => ({}) }
    }),
    /Site plugins require/u
  );
  assert.throws(
    () => new SitePluginRegistry().register({
      ...fixturePlugin([], true),
      service: { start: async () => {} }
    }),
    /Site plugins require/u
  );
});
