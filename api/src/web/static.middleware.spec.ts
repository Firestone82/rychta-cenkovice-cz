import { renderHosts } from './static.middleware.js';

describe('hosts the website renderer accepts', () => {
  it('takes the host names of the public address and the allowed origins', () => {
    expect(
      renderHosts([
        'https://www.rychtacenkovice.cz',
        'https://rychtacenkovice.cz:8443',
        'nonsense',
      ]),
    ).toEqual(['www.rychtacenkovice.cz', 'rychtacenkovice.cz', 'localhost', '127.0.0.1']);
  });
});
