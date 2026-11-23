import { inputAttributesForRole } from './normalizers';

describe('[R-01.30] atributos de propósito de la entrada (derivados del rol)', () => {
  it('[R-01.30][AC-01.30] el rol email declara autocomplete=email, inputmode=email y spellcheck=false', () => {
    expect(inputAttributesForRole('email')).toEqual({ autocomplete: 'email', inputmode: 'email', spellcheck: false });
  });

  it('[R-01.30] otros roles aprobados en HITL-2 P3 y roles sin propósito', () => {
    expect(inputAttributesForRole('full_name')).toEqual({ autocomplete: 'name' });
    expect(inputAttributesForRole('phone')).toEqual({ autocomplete: 'tel', inputmode: 'tel' });
    expect(inputAttributesForRole('birth_date')).toEqual({ autocomplete: 'bday' });
    expect(inputAttributesForRole('city')).toEqual({ autocomplete: 'address-level2' });
    expect(inputAttributesForRole('vehicle_plate')).toEqual({});
    expect(inputAttributesForRole('none')).toEqual({});
  });
});
