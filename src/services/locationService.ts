const COMMON_LOCATIONS = [
  'Airport Terminal 1',
  'Central Station',
  'Downtown Shopping Mall',
  'City Hospital',
  'University Campus',
  'Sports Complex',
  'National Park',
  'Beach Promenade',
  'Business District',
  'Train Station',
  'Museum',
  'Concert Hall',
  'Library',
  'Community Center',
  'Market Square',
];

export function getSuggestedLocations(query: string): string[] {
  if (!query || query.length < 1) return [];

  const lowerQuery = query.toLowerCase();
  return COMMON_LOCATIONS.filter(location =>
    location.toLowerCase().includes(lowerQuery)
  ).slice(0, 5);
}
