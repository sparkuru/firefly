import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from '/app/apps/site/node_modules/@playwright/test/index.mjs';

let browser;
try {
  const reading = process.argv[2] === 'read';
  browser = await chromium.launch({ args: ['--no-proxy-server'] });
  const untrusted = await browser.newContext({ javaScriptEnabled: false });
  const untrustedPage = await untrusted.newPage();
  let rejectedCertificate = false;
  try { await untrustedPage.goto('https://localhost:8443/memos/'); }
  catch (error) { rejectedCertificate = error instanceof Error && error.message.includes('ERR_CERT_AUTHORITY_INVALID'); }
  if (!rejectedCertificate) throw new Error();
  await browser.close();
  browser = undefined;
  const trustDirectory = path.join(process.env.HOME, '.pki/nssdb');
  fs.mkdirSync(trustDirectory, { recursive: true, mode: 0o700 });
  execFileSync('certutil', ['-N', '--empty-password', '-d', 'sql:' + trustDirectory], { stdio: 'ignore' });
  execFileSync('certutil', ['-A', '-d', 'sql:' + trustDirectory, '-n', 'memo-fixture-ca', '-t', 'C,,', '-i', '/fixture-ca.pem'], { stdio: 'ignore' });
  browser = await chromium.launch({ args: ['--no-proxy-server'] });
  for (const [index, viewport] of [{ width: 1440, height: 900 }, { width: 390, height: 844 }].entries()) {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport });
    const page = await context.newPage();
    await page.goto('https://localhost:8443/memos/');
    if (reading) {
      if (await page.locator('.memo-list article').count() !== 2 || await page.locator('.memo-list script').count() !== 0) throw new Error();
      for (const note of [0, 1]) if (!(await page.getByText(`Approved native note ${note} <script>plainText()</script>`, { exact: true }).isVisible())) throw new Error();
      await page.screenshot({ path: `/fixture/approved-${index}.png`, fullPage: true });
      await context.close();
      continue;
    }
    if (await page.locator('[name="consent"]').isChecked()) throw new Error();
    await page.getByLabel('Display name', { exact: true }).fill(`Native visitor ${index}`);
    await page.getByLabel('Private verification email').fill(`native-private-${index}@example.invalid`);
    await page.getByLabel('Your note (plain text)').fill(`Approved native note ${index} <script>plainText()</script>`);
    await page.getByLabel('I agree to publish').check();
    await Promise.all([page.waitForURL('**/v1/memos/submissions'), page.getByRole('button', { name: 'Send verification email' }).click()]);
    if (!(await page.getByText('If your submission is accepted', { exact: false }).isVisible())) throw new Error();
    await page.screenshot({ path: `/fixture/native-${index}.png`, fullPage: true });
    await page.getByRole('link', { name: 'Return to memos' }).click();
    if (!page.url().endsWith('/memos/')) throw new Error();
    await context.close();
  }
  fs.writeFileSync(`/fixture/browser-${reading ? 'read' : 'post'}.json`, JSON.stringify({ projects: ['desktop', 'mobile'], javaScriptEnabled: false, nativePost: !reading, approvedStaticRead: reading, untrustedCertificateRejected: true, fixtureCertificateTrusted: true }), { mode: 0o600 });
  process.stdout.write(`fixture:native_browser_${reading ? 'read' : 'post'}_passed\n`);
} catch { process.stderr.write('fixture:native_browser_failed\n'); process.exitCode = 1; }
finally { await browser?.close(); }
