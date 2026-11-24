// Luzon destinations for the booking form, with approximate coordinates (city centre).
// Distances are estimates: straight-line distance × a road factor, since mountain roads wind.

export const BAGUIO = { lat: 16.4023, lng: 120.596 }
const ROAD_FACTOR = 1.25
const AVG_SPEED_KMH = 55

export const PLACES = [
  // Mountain roads: longer and slower than a straight line suggests.
  { region: 'Cordillera (CAR)', roadFactor: 1.8, speed: 30, items: [
    ['Baguio City', 16.4023, 120.596], ['La Trinidad, Benguet', 16.455, 120.588], ['Sagada, Mountain Province', 17.084, 120.901],
    ['Bontoc, Mountain Province', 17.089, 120.977], ['Banaue, Ifugao', 16.919, 121.059], ['Tabuk, Kalinga', 17.41, 121.444],
    ['Bangued, Abra', 17.596, 120.618], ['Kabugao, Apayao', 18.023, 121.184],
  ] },
  { region: 'Ilocos Region', items: [
    ['San Fernando, La Union', 16.6159, 120.3166], ['San Juan, La Union', 16.673, 120.341], ['Dagupan, Pangasinan', 16.043, 120.333],
    ['Lingayen, Pangasinan', 16.021, 120.231], ['Alaminos (Hundred Islands), Pangasinan', 16.155, 119.98], ['Urdaneta, Pangasinan', 15.976, 120.571],
    ['Candon, Ilocos Sur', 17.194, 120.451], ['Vigan, Ilocos Sur', 17.5747, 120.3869], ['Laoag, Ilocos Norte', 18.196, 120.593],
    ['Pagudpud, Ilocos Norte', 18.562, 120.786],
  ] },
  { region: 'Cagayan Valley', items: [
    ['Bayombong, Nueva Vizcaya', 16.483, 121.149], ['Cabarroguis, Quirino', 16.511, 121.523], ['Santiago, Isabela', 16.688, 121.549],
    ['Ilagan, Isabela', 17.148, 121.889], ['Tuguegarao, Cagayan', 17.6132, 121.727], ['Santa Ana, Cagayan', 18.472, 122.143],
  ] },
  { region: 'Central Luzon', items: [
    ['Tarlac City, Tarlac', 15.4802, 120.5979], ['Angeles / Clark, Pampanga', 15.145, 120.5887], ['San Fernando, Pampanga', 15.034, 120.684],
    ['Cabanatuan, Nueva Ecija', 15.4865, 120.9665], ['Baler, Aurora', 15.758, 121.562], ['Iba, Zambales', 15.327, 119.978],
    ['Olongapo / Subic, Zambales', 14.8292, 120.2828], ['Malolos, Bulacan', 14.8527, 120.816], ['Balanga, Bataan', 14.676, 120.536],
  ] },
  { region: 'Metro Manila', items: [
    ['Quezon City', 14.676, 121.0437], ['Manila', 14.5995, 120.9842], ['Caloocan', 14.651, 120.972], ['Makati', 14.5547, 121.0244],
    ['Taguig / BGC', 14.5176, 121.0509], ['Pasay / NAIA Airport', 14.5378, 121.0014], ['Parañaque', 14.4793, 121.0198],
  ] },
  { region: 'CALABARZON', items: [
    ['Antipolo, Rizal', 14.586, 121.176], ['Imus, Cavite', 14.4297, 120.9367], ['Tagaytay, Cavite', 14.1153, 120.9621],
    ['Santa Rosa, Laguna', 14.3122, 121.1114], ['Calamba, Laguna', 14.2117, 121.1653], ['Nasugbu, Batangas', 14.067, 120.633],
    ['Batangas City, Batangas', 13.7565, 121.0583], ['Lucena, Quezon', 13.931, 121.617],
  ] },
  { region: 'Bicol Region', roadFactor: 1.35, items: [
    ['Daet, Camarines Norte', 14.112, 122.955], ['Naga, Camarines Sur', 13.6218, 123.1948], ['Legazpi, Albay', 13.1391, 123.7438],
    ['Sorsogon City, Sorsogon', 12.974, 124.005],
  ] },
]

// Known road figures for popular mountain trips, used instead of the estimate.
const KNOWN_ROUTES = {
  'Sagada, Mountain Province': { km: 145, hours: 5.5 },
  'Bontoc, Mountain Province': { km: 145, hours: 5 },
  'Banaue, Ifugao': { km: 290, hours: 8 },
}

const LOOKUP = Object.fromEntries(
  PLACES.flatMap((g) => g.items.map(([name, lat, lng]) => [name, { lat, lng, roadFactor: g.roadFactor, speed: g.speed }])),
)

export const OTHER_PLACE = 'Other place in Luzon'

function straightKm(a, b) {
  const R = 6371
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// { km, hours } by road from Baguio, or null when the place is unknown.
export function distanceFromBaguio(name) {
  if (KNOWN_ROUTES[name]) return KNOWN_ROUTES[name]
  const place = LOOKUP[name]
  if (!place) return null
  const km = Math.round((straightKm(BAGUIO, place) * (place.roadFactor || ROAD_FACTOR)) / 5) * 5
  const hours = Math.max(0.5, Math.round((km / (place.speed || AVG_SPEED_KMH)) * 2) / 2)
  return { km, hours }
}

export function describeDistance(d) {
  if (!d) return ''
  if (d.km < 15) return 'Within Baguio area'
  const h = Number.isInteger(d.hours) ? d.hours : d.hours.toFixed(1)
  return `≈ ${d.km} km from Baguio · about ${h} hr${d.hours === 1 ? '' : 's'} drive`
}
