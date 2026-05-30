// src/lib/sriLankaCoordinates.ts

export interface CityCoordinate {
  name: string;
  lat: number;
  lng: number;
  aliases: string[];
}

export const SRI_LANKA_CITIES: CityCoordinate[] = [
  // Major Cities
  { name: 'Colombo', lat: 6.9271, lng: 79.8612, aliases: ['colombo', 'කොළඹ'] },
  { name: 'Kandy', lat: 7.2906, lng: 80.6337, aliases: ['kandy', 'මහනුවර'] },
  { name: 'Galle', lat: 6.0535, lng: 80.2210, aliases: ['galle', 'ගාල්ල'] },
  { name: 'Jaffna', lat: 9.6615, lng: 80.0255, aliases: ['jaffna', 'යාපනය'] },
  { name: 'Negombo', lat: 7.2008, lng: 79.8737, aliases: ['negombo', 'මීගමුව'] },
  { name: 'Matara', lat: 5.9450, lng: 80.5550, aliases: ['matara', 'මාතර'] },
  { name: 'Anuradhapura', lat: 8.3114, lng: 80.4037, aliases: ['anuradhapura', 'අනුරාධපුරය'] },
  { name: 'Trincomalee', lat: 8.5874, lng: 81.2152, aliases: ['trincomalee', 'තිරිකුණාමලය'] },
  { name: 'Batticaloa', lat: 7.7248, lng: 81.6899, aliases: ['batticaloa', 'මඩකලපුව'] },
  { name: 'Kurunegala', lat: 7.4866, lng: 80.3647, aliases: ['kurunegala', 'කුරුණෑගල'] },
  { name: 'Ratnapura', lat: 6.7056, lng: 80.3847, aliases: ['ratnapura', 'රත්නපුර'] },
  { name: 'Badulla', lat: 6.9895, lng: 81.0557, aliases: ['badulla', 'බදුල්ල'] },
  { name: 'Nuwara Eliya', lat: 6.9497, lng: 80.7891, aliases: ['nuwara eliya', 'නුවර එළිය', 'nuwaraeliya'] },
  { name: 'Polonnaruwa', lat: 7.9403, lng: 81.0188, aliases: ['polonnaruwa', 'පොළොන්නරුව'] },
  { name: 'Dambulla', lat: 7.8742, lng: 80.6511, aliases: ['dambulla', 'දඹුල්ල'] },
  { name: 'Hambantota', lat: 6.1241, lng: 81.1185, aliases: ['hambantota', 'හම්බන්තොට'] },
  { name: 'Vavuniya', lat: 8.7542, lng: 80.4982, aliases: ['vavuniya', 'වව්නියාව'] },
  { name: 'Mannar', lat: 8.9810, lng: 79.9044, aliases: ['mannar', 'මන්නාරම'] },
  { name: 'Kilinochchi', lat: 9.3803, lng: 80.3770, aliases: ['kilinochchi', 'කිලිනොච්චි'] },
  { name: 'Mullaitivu', lat: 9.2671, lng: 80.8142, aliases: ['mullaitivu', 'මුලතිව්'] },
  { name: 'Ampara', lat: 7.2975, lng: 81.6820, aliases: ['ampara', 'අම්පාර'] },
  { name: 'Matale', lat: 7.4675, lng: 80.6234, aliases: ['matale', 'මාතලේ'] },
  { name: 'Kegalle', lat: 7.2513, lng: 80.3464, aliases: ['kegalle', 'කෑගල්ල', 'kagalla'] },
  { name: 'Puttalam', lat: 8.0408, lng: 79.8394, aliases: ['puttalam', 'පුත්තලම'] },
  { name: 'Chilaw', lat: 7.5758, lng: 79.7953, aliases: ['chilaw', 'හලාවත'] },
  { name: 'Maharagama', lat: 6.8463, lng: 79.9261, aliases: ['maharagama', 'මහරගම'] },
  { name: 'Kadawatha', lat: 6.9964, lng: 79.9503, aliases: ['kadawatha', 'කඩවත'] },
  { name: 'Eppawala', lat: 8.1453, lng: 80.3917, aliases: ['eppawala', 'එප්පාවල'] },
  { name: 'Janakapura', lat: 8.2500, lng: 80.4000, aliases: ['janakapura', 'ජනකපුර'] },
  { name: 'Nittambuwa', lat: 7.1536, lng: 80.0964, aliases: ['nittambuwa', 'නිට්ටඹුව'] },
  { name: 'Mawanella', lat: 7.2500, lng: 80.4500, aliases: ['mawanella', 'මාවනැල්ල'] },
  { name: 'Peradeniya', lat: 7.2590, lng: 80.5972, aliases: ['peradeniya', 'පේරාදෙණිය'] },
  { name: 'Katunayake', lat: 7.1753, lng: 79.8847, aliases: ['katunayake', 'කටුනායක'] },
  { name: 'Kalutara', lat: 6.5854, lng: 79.9607, aliases: ['kalutara', 'කළුතර'] },
  { name: 'Bentota', lat: 6.4213, lng: 79.9980, aliases: ['bentota', 'බෙන්තොට'] },
  { name: 'Hikkaduwa', lat: 6.1395, lng: 80.1010, aliases: ['hikkaduwa', 'හික්කඩුව'] },
  { name: 'Unawatuna', lat: 6.0097, lng: 80.2497, aliases: ['unawatuna', 'උණවටුන'] },
  { name: 'Weligama', lat: 5.9747, lng: 80.4295, aliases: ['weligama', 'වැලිගම'] },
  { name: 'Tangalle', lat: 6.0241, lng: 80.7950, aliases: ['tangalle', 'තංගල්ල'] },
  { name: 'Tissamaharama', lat: 6.2844, lng: 81.2878, aliases: ['tissamaharama', 'තිස්සමහාරාමය', 'tissa'] },
  { name: 'Ella', lat: 6.8667, lng: 81.0466, aliases: ['ella', 'ඇල්ල'] },
  { name: 'Haputale', lat: 6.7656, lng: 80.9589, aliases: ['haputale', 'හපුතලේ'] },
  { name: 'Bandarawela', lat: 6.8304, lng: 80.9900, aliases: ['bandarawela', 'බණ්ඩාරවෙල'] },
  { name: 'Welimada', lat: 6.9000, lng: 80.9167, aliases: ['welimada', 'වැලිමඩ'] },
  { name: 'Hatton', lat: 6.8917, lng: 80.5958, aliases: ['hatton', 'හැටන්'] },
  { name: 'Nawalapitiya', lat: 7.0500, lng: 80.5333, aliases: ['nawalapitiya', 'නාවලපිටිය'] },
  { name: 'Gampola', lat: 7.1647, lng: 80.5767, aliases: ['gampola', 'ගම්පොල'] },
  { name: 'Avissawella', lat: 6.9533, lng: 80.2200, aliases: ['avissawella', 'අවිස්සාවේල්ල'] },
  { name: 'Horana', lat: 6.7167, lng: 80.0667, aliases: ['horana', 'හොරණ'] },
  { name: 'Panadura', lat: 6.7133, lng: 79.9042, aliases: ['panadura', 'පානදුර'] },
  { name: 'Moratuwa', lat: 6.7733, lng: 79.8822, aliases: ['moratuwa', 'මොරටුව'] },
  { name: 'Dehiwala', lat: 6.8511, lng: 79.8650, aliases: ['dehiwala', 'දෙහිවල'] },
  { name: 'Sigiriya', lat: 7.9570, lng: 80.7600, aliases: ['sigiriya', 'සීගිරිය'] },
  { name: 'Habarana', lat: 8.0500, lng: 80.7500, aliases: ['habarana', 'හබරණ'] },
  { name: 'Kekirawa', lat: 8.0361, lng: 80.6000, aliases: ['kekirawa', 'කැකිරාව'] },
  { name: 'Medawachchiya', lat: 8.5333, lng: 80.5000, aliases: ['medawachchiya', 'මැදවච්චිය'] },

  // --- NEWLY ADDED TOWNS ---
  { name: 'Pilimathalawa', lat: 7.2630, lng: 80.5663, aliases: ['pilimathalawa', 'පිළිමතලාව'] },
  { name: 'Kadugannawa', lat: 7.2541, lng: 80.5428, aliases: ['kadugannawa', 'කඩුගන්නාව'] },
  { name: 'Warakapola', lat: 7.2227, lng: 80.1979, aliases: ['warakapola', 'වරකාපොල'] },
  { name: 'Kiribathgoda', lat: 6.9733, lng: 79.9234, aliases: ['kiribathgoda', 'කිරිබත්ගොඩ'] },
  { name: 'Ambalangoda', lat: 6.2415, lng: 80.0487, aliases: ['ambalangoda', 'අම්බලන්ගොඩ'] },
  { name: 'Aluthgama', lat: 6.4357, lng: 80.0016, aliases: ['aluthgama', 'අලුත්ගම'] },
  { name: 'Beliatta', lat: 6.0350, lng: 80.7500, aliases: ['beliatta', 'බෙලිඅත්ත'] },
];

export interface RoutePath {
  from: string;
  to: string;
  via: string[];
}

// Common Sri Lankan bus route paths
export const ROUTE_PATHS: RoutePath[] = [
  // Colombo - Kandy route
  { from: 'Colombo', to: 'Kandy', via: ['Kadawatha', 'Nittambuwa', 'Warakapola', 'Kegalle', 'Mawanella', 'Kadugannawa', 'Pilimathalawa', 'Peradeniya'] },
  { from: 'Kandy', to: 'Colombo', via: ['Peradeniya', 'Pilimathalawa', 'Kadugannawa', 'Mawanella', 'Kegalle', 'Warakapola', 'Nittambuwa', 'Kadawatha'] },
  
  // Colombo - Galle route (coastal)
  { from: 'Colombo', to: 'Galle', via: ['Dehiwala', 'Panadura', 'Kalutara', 'Bentota', 'Ambalangoda', 'Hikkaduwa'] },
  { from: 'Galle', to: 'Colombo', via: ['Hikkaduwa', 'Ambalangoda', 'Bentota', 'Kalutara', 'Panadura', 'Dehiwala'] },
];

// Find route path between two cities
export function findRoutePath(fromCity: string, toCity: string): string[] | null {
  const from = fromCity.toLowerCase().trim();
  const to = toCity.toLowerCase().trim();
  
  const routePath = ROUTE_PATHS.find(
    path => path.from.toLowerCase() === from && path.to.toLowerCase() === to
  );
  
  if (routePath) {
    return routePath.via;
  }
  
  // Try with aliases
  const fromCoord = findCityCoordinates(fromCity);
  const toCoord = findCityCoordinates(toCity);
  
  if (fromCoord && toCoord) {
    const altRoutePath = ROUTE_PATHS.find(
      path => path.from.toLowerCase() === fromCoord.name.toLowerCase() && 
              path.to.toLowerCase() === toCoord.name.toLowerCase()
    );
    if (altRoutePath) {
      return altRoutePath.via;
    }
  }
  
  return null;
}

// Find city coordinates by name (case-insensitive, supports aliases)
// FIXED: Removed 'includes' check to prevent "Kegalle" matching "Galle"
export function findCityCoordinates(cityName: string): CityCoordinate | undefined {
  const searchTerm = cityName.toLowerCase().trim();
  
  return SRI_LANKA_CITIES.find(city => 
    city.name.toLowerCase() === searchTerm ||
    city.aliases.some(alias => alias.toLowerCase() === searchTerm)
  );
}

// Get center of Sri Lanka for default map view
export const SRI_LANKA_CENTER: [number, number] = [7.8731, 80.7718];
export const SRI_LANKA_ZOOM = 7;