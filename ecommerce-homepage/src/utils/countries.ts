export interface Country {
  code: string;
  name: string;
  flag: string;
}

export const EUROPEAN_COUNTRIES: Country[] = [
  { code: 'IT', name: 'Italia', flag: '🇮🇹' },
  { code: 'CH', name: 'Svizzera', flag: '🇨🇭' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'BE', name: 'Belgio', flag: '🇧🇪' },
  { code: 'BG', name: 'Bulgaria', flag: '🇧🇬' },
  { code: 'HR', name: 'Croazia', flag: '🇭🇷' },
  { code: 'CY', name: 'Cipro', flag: '🇨🇾' },
  { code: 'CZ', name: 'Repubblica Ceca', flag: '🇨🇿' },
  { code: 'DK', name: 'Danimarca', flag: '🇩🇰' },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪' },
  { code: 'FI', name: 'Finlandia', flag: '🇫🇮' },
  { code: 'FR', name: 'Francia', flag: '🇫🇷' },
  { code: 'DE', name: 'Germania', flag: '🇩🇪' },
  { code: 'GR', name: 'Grecia', flag: '🇬🇷' },
  { code: 'HU', name: 'Ungheria', flag: '🇭🇺' },
  { code: 'IE', name: 'Irlanda', flag: '🇮🇪' },
  { code: 'LV', name: 'Lettonia', flag: '🇱🇻' },
  { code: 'LT', name: 'Lituania', flag: '🇱🇹' },
  { code: 'LU', name: 'Lussemburgo', flag: '🇱🇺' },
  { code: 'MT', name: 'Malta', flag: '🇲🇹' },
  { code: 'NL', name: 'Paesi Bassi', flag: '🇳🇱' },
  { code: 'NO', name: 'Norvegia', flag: '🇳🇴' },
  { code: 'PL', name: 'Polonia', flag: '🇵🇱' },
  { code: 'PT', name: 'Portogallo', flag: '🇵🇹' },
  { code: 'RO', name: 'Romania', flag: '🇷🇴' },
  { code: 'SK', name: 'Slovacchia', flag: '🇸🇰' },
  { code: 'SI', name: 'Slovenia', flag: '🇸🇮' },
  { code: 'ES', name: 'Spagna', flag: '🇪🇸' },
  { code: 'SE', name: 'Svezia', flag: '🇸🇪' },
];

export function getCountryByCode(code: string): Country | undefined {
  return EUROPEAN_COUNTRIES.find(c => c.code === code);
}

export function getCountryName(code: string): string {
  const country = getCountryByCode(code);
  return country ? `${country.flag} ${country.name}` : code;
}

