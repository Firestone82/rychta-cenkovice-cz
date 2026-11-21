import { PasswordService } from './password.service.js';

describe('PasswordService', () => {
  const passwords = new PasswordService();

  it('hashes with Argon2id at the documented cost, salted per password', async () => {
    const first = await passwords.hash('correct horse battery');
    const second = await passwords.hash('correct horse battery');
    expect(first).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(first).not.toBe(second);
    expect(await passwords.verify('correct horse battery', first)).toBe(true);
    expect(await passwords.verify('correct horse batterx', first)).toBe(false);
  });

  it('still accepts a hash written by the previous API', async () => {
    const previous =
      '$argon2id$v=19$m=19456,t=2,p=1$Or93OYCo/MGLeJ74+D3Yjw$11sBw+2Nx511d/U+px/W5p4QZT4rHkPTjQXZ2Yq7QAY';
    expect(await passwords.verify('correct horse battery', previous)).toBe(true);
    expect(await passwords.verify('something else', previous)).toBe(false);
  });

  it('rejects everything for an unknown account or a damaged hash', async () => {
    expect(await passwords.verify('timing-equalisation-placeholder', undefined)).toBe(false);
    expect(await passwords.verify('anything', 'not-a-hash')).toBe(false);
  });

  it('wants twelve characters, counted as people count them', () => {
    expect(passwords.acceptable('žžžžžžžžžžžž')).toBe(true);
    expect(passwords.acceptable('elevenchars')).toBe(false);
    expect(passwords.acceptable('x'.repeat(257))).toBe(false);
  });
});
