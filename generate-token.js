// Test token generator
const header = Buffer.from(JSON.stringify({
  alg: 'HS256',
  typ: 'JWT'
})).toString('base64url');

const now = Math.floor(Date.now() / 1000);
const payload = Buffer.from(JSON.stringify({
  sub: 'test_user_123',
  aud: 'bilardo-skor',
  exp: now + 86400 * 7, // 7 gun gecerli
  email: 'test@3cscore.com',
  name: 'Test Kullanici'
})).toString('base64url');

const sig = 'test_signature_2025';

const token = header + '.' + payload + '.' + sig;

console.log('TOKEN:');
console.log(token);
console.log('');
console.log('TEST URL:');
console.log('https://live.3cscore.com?token=' + token + '&userId=test_user_123');
