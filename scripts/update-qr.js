#!/usr/bin/env node
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = args[i + 1];
    if (next && !next.startsWith('--')) {
      options[key] = next;
      i += 1;
    } else {
      options[key] = true;
    }
  }
  return options;
}

function detectLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254')) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

function buildTargetUrl(opts) {
  if (opts.url) {
    return opts.url;
  }
  const host = opts.host || opts.ip || detectLocalIp();
  const protocol = opts.protocol || 'http';
  const port = typeof opts.port !== 'undefined' ? opts.port : '3000';
  const portSegment = port ? `:${port}` : '';
  return `${protocol}://${host}${portSegment}`;
}

function downloadFile(fileUrl, destination) {
  return new Promise((resolve, reject) => {
    https.get(fileUrl, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`QR servisinden beklenmedik yanıt: ${response.statusCode}`));
        response.resume();
        return;
      }
      const fileStream = fs.createWriteStream(destination);
      response.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close(resolve);
      });
    }).on('error', reject);
  });
}

async function main() {
  try {
    const options = parseArgs();
    const targetUrl = buildTargetUrl(options);
    const size = options.size || '360';
    const outputPath = path.resolve(process.cwd(), options.output || 'public/qr-current.png');
    const chartUrl = `https://quickchart.io/qr?size=${size}&text=${encodeURIComponent(targetUrl)}`;

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    console.log(`🔗 Hedef URL: ${targetUrl}`);
    console.log(`🖼️  QR kaydı: ${outputPath}`);

    await downloadFile(chartUrl, outputPath);

    console.log('✅ QR görseli başarıyla güncellendi.');
  } catch (error) {
    console.error('❌ QR oluşturma sırasında hata oluştu:', error.message);
    process.exitCode = 1;
  }
}

main();
