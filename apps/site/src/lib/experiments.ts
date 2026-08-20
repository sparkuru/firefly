import { discoverExperiments, type PublicExperiment } from '@firefly/validate-experiments';

const modulePath = decodeURIComponent(new URL(import.meta.url).pathname);
const siteBoundary = '/apps/site/';
const siteBoundaryIndex = modulePath.lastIndexOf(siteBoundary);
if (siteBoundaryIndex < 0) {
  throw new TypeError('Unable to resolve the repository root from the site module path.');
}
const repositoryRoot = modulePath.slice(0, siteBoundaryIndex + 1);

export async function getPublicExperiments(): Promise<readonly PublicExperiment[]> {
  const { catalog } = await discoverExperiments({ repositoryRoot });
  return catalog;
}
