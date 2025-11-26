export interface GeolocationData {
  country: string;
  countryCode: string;
  city?: string;
  region?: string;
}

export const getUserLocation = async (): Promise<GeolocationData | null> => {
  try {
    // Use ipapi.co for free geolocation
    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) throw new Error('Geolocation API failed');

    const data = await response.json();
    return {
      country: data.country_name || 'Unknown',
      countryCode: data.country_code || 'XX',
      city: data.city,
      region: data.region
    };
  } catch (error) {
    console.warn('Failed to get user location:', error);
    return null;
  }
};

export const getCountryLanguage = (countryCode: string): string => {
  const languageMap: Record<string, string> = {
    'GB': 'English', // England
    'RS': 'Serbian', // Serbia
    'BA': 'Bosnian', // Bosnia
    'HR': 'Croatian', // Croatia
    'CH': 'German', // Switzerland (German-speaking)
    'DE': 'German', // Germany
    // Add more as needed
  };
  return languageMap[countryCode] || 'English';
};