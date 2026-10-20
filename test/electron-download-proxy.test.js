'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const { createRequire } = require('node:module');
const { once } = require('node:events');
const test = require('node:test');

test('electron-builder download proxy routes HTTP requests and honors NO_PROXY', async () => {
  // Exercise the actual downloader used by builder, not Electron's newer downloader.
  // Node's test runner isolates this file so bootstrap cannot affect other tests.
  const builderRequire = createRequire(require.resolve('app-builder-lib'));
  const downloader = builderRequire('@electron/get');
  const proxyRequests = [];
  const proxy = http.createServer((request, response) => {
    proxyRequests.push(request.url);
    response.end('proxied');
  });
  const direct = http.createServer((request, response) => response.end('direct'));
  proxy.listen(0, '127.0.0.1');
  direct.listen(0, '127.0.0.1');
  await Promise.all([once(proxy, 'listening'), once(direct, 'listening')]);
  try {
    process.env.GLOBAL_AGENT_HTTP_PROXY = `http://127.0.0.1:${proxy.address().port}`;
    process.env.GLOBAL_AGENT_NO_PROXY = '127.0.0.1';
    downloader.initializeProxy();
    const get = (url) => new Promise((resolve, reject) => {
      const request = http.get(url, (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => { body += chunk; });
        response.on('end', () => resolve(body));
      });
      request.setTimeout(5000, () => request.destroy(new Error('request timeout')));
      request.on('error', reject);
    });
    assert.equal(await get('http://electron-download.invalid/artifact.zip'), 'proxied');
    assert.deepEqual(proxyRequests, ['http://electron-download.invalid/artifact.zip']);
    assert.equal(await get(`http://127.0.0.1:${direct.address().port}/`), 'direct');
    assert.equal(proxyRequests.length, 1);
  } finally {
    proxy.closeAllConnections();
    direct.closeAllConnections();
    await Promise.all([
      new Promise((resolve) => proxy.close(resolve)),
      new Promise((resolve) => direct.close(resolve)),
    ]);
  }
});
