import { isPublicAddress } from './address.util.js';

describe('isPublicAddress', () => {
  it('accepts addresses on the internet', () => {
    expect(['93.184.216.34', '8.8.8.8', '2606:4700:4700::1111'].every(isPublicAddress)).toBe(true);
  });

  it('refuses the server itself and private networks', () => {
    const inside = [
      '127.0.0.1',
      '10.1.2.3',
      '172.20.0.5',
      '192.168.1.10',
      '169.254.169.254',
      '100.64.0.1',
      '0.0.0.0',
      '::1',
      '::',
      'fd12:3456::1',
      'fe80::1',
      '::ffff:127.0.0.1',
      'localhost',
    ];
    expect(inside.filter(isPublicAddress)).toEqual([]);
  });
});
