import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FireflyPluginRegistry,
  type FireflyConfig,
  type FireflyPlugin
} from '../src/index.js';

const manifest = {
  id: 'fixture',
  version: '1.0.0',
  configNamespace: 'fixture',
  capabilities: ['site-post-extension', 'publication'] as const
};

function fixturePlugin(calls: string[], enabled: boolean): FireflyPlugin {
  return {
    manifest,
    isEnabled: () => enabled,
    site: {
      loadBuildData: () => {
        calls.push('load');
        return { value: 'build-only' };
      },
      postExtension: ({ buildData }) => {
        calls.push('extension');
        return buildData;
      }
    },
    publication: {
      contribute: async () => ({ pluginId: 'fixture', schemaVersion: 1, metadata: { enabled: true } })
    }
  };
}

const config: FireflyConfig = { fixture: { enabled: true } };
const document = { id: 'posts/fixture.md', route: '/posts/fixture/', collection: 'posts' as const, presentation: 'semantic' };

test('disabled plugins are not asked to load build data or contribute extensions', async () => {
  const calls: string[] = [];
  const registry = new FireflyPluginRegistry().register(fixturePlugin(calls, false));
  const siteData = await registry.loadSiteData({ config, documents: [document], privateInput: 'must-not-be-read' });
  assert.deepEqual(siteData, []);
  assert.deepEqual(registry.postExtensions({ document, buildData: null }, config, siteData), []);
  assert.deepEqual(await registry.publicationContributions({ config, repositoryRoot: '/repo', siteOutput: '/repo/dist', privateInput: 'must-not-be-read' }), []);
  assert.deepEqual(calls, []);
});

test('enabled plugins receive generic document data and publication contributions', async () => {
  const calls: string[] = [];
  const registry = new FireflyPluginRegistry().register(fixturePlugin(calls, true));
  const siteData = await registry.loadSiteData({ config, documents: [document] });
  assert.equal(siteData.length, 1);
  assert.deepEqual(registry.postExtensions({ document, buildData: null }, config, siteData), [{ value: 'build-only' }]);
  assert.deepEqual(await registry.publicationContributions({ config, repositoryRoot: '/repo', siteOutput: '/repo/dist' }), [
    { pluginId: 'fixture', schemaVersion: 1, metadata: { enabled: true } }
  ]);
  assert.deepEqual(calls, ['load', 'extension']);
});

test('post extensions never run for page documents', async () => {
  const calls: string[] = [];
  const registry = new FireflyPluginRegistry().register(fixturePlugin(calls, true));
  const siteData = await registry.loadSiteData({ config, documents: [] });
  assert.deepEqual(registry.postExtensions({ document: { ...document, collection: 'pages' }, buildData: null }, config, siteData), []);
  assert.deepEqual(calls, ['load']);
});
