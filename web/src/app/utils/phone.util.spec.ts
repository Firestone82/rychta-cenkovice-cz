import { joinPhone, splitPhone } from './phone.util';

const COUNTRIES = [
  { code: 'CZ', dial: '+420' },
  { code: 'DE', dial: '+49' },
];

describe('phone numbers', () => {
  it('puts the dialling code in front of a typed number', () => {
    expect(joinPhone({ dial: '+420', number: '606 734 911' })).toBe('+420 606 734 911');
    expect(joinPhone({ dial: '+420', number: '  ' })).toBe('');
  });

  it('recognises the country of a number written in full', () => {
    expect(splitPhone('+49 30 1234', COUNTRIES)).toEqual({ dial: '+49', number: '30 1234' });
    expect(splitPhone('00420606734911', COUNTRIES)).toEqual({ dial: '+420', number: '606734911' });
  });

  it('leaves other text as it is', () => {
    expect(splitPhone('606 734 911', COUNTRIES)).toEqual({ dial: null, number: '606 734 911' });
    expect(splitPhone('+999 1', COUNTRIES)).toEqual({ dial: null, number: '+999 1' });
  });
});
