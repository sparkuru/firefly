import { createServer } from 'node:http';

createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const supported = /^\/v1\/comments\/(?:submissions|verify\/fixture|control\/fixture(?:\/delete)?|admin\/(?:comments|export))$/u.test(pathname);
  response.writeHead(supported ? request.method === 'OPTIONS' ? 204 : 200 : 404, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  response.end(request.method === 'HEAD' || request.method === 'OPTIONS' ? undefined : JSON.stringify({ fixture: supported }));
}).listen(8787, '127.0.0.1');
