import fs from 'node:fs';
import tls from 'node:tls';

// Fixture-only mail sink, reachable solely within the owned loopback namespace.
const server = tls.createServer({ key: fs.readFileSync('/fixture/key.pem'), cert: fs.readFileSync('/fixture/ca.pem') }, (socket) => {
  let input = '', stage = 'command', mail = '';
  socket.setTimeout(10000, () => socket.destroy());
  socket.write('220 fixture.local ESMTP\r\n');
  socket.on('error', () => {});
  socket.on('data', (chunk) => {
    input += chunk.toString('ascii');
    if (input.length > 65536) { socket.destroy(); return; }
    while (input.includes('\r\n')) {
      const end = input.indexOf('\r\n'); const line = input.slice(0, end); input = input.slice(end + 2);
      if (stage === 'data') {
        if (line !== '.') { mail += `${line}\r\n`; continue; }
        fs.appendFileSync('/fixture/mail.jsonl', `${JSON.stringify(mail)}\n`, { mode: 0o600 });
        mail = ''; stage = 'command'; socket.write('250 queued\r\n');
      } else if (stage === 'user') { stage = 'password'; socket.write('334 UGFzc3dvcmQ6\r\n'); }
      else if (stage === 'password') { stage = 'command'; socket.write('235 authenticated\r\n'); }
      else if (line.startsWith('EHLO ')) socket.write('250-fixture.local\r\n250 AUTH LOGIN\r\n');
      else if (line === 'AUTH LOGIN') { stage = 'user'; socket.write('334 VXNlcm5hbWU6\r\n'); }
      else if (line.startsWith('MAIL FROM:') || line.startsWith('RCPT TO:')) socket.write('250 ok\r\n');
      else if (line === 'DATA') { stage = 'data'; socket.write('354 send\r\n'); }
      else socket.write('500 unsupported\r\n');
    }
  });
});
server.on('error', () => { process.stderr.write('fixture:smtp_failed\n'); process.exit(1); });
server.listen(2465, '::', () => process.stdout.write('fixture:smtp_ready\n'));
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => server.close(() => process.exit(0)));
