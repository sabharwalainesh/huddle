#!/usr/bin/env node
import https from 'https';
import fs from 'fs';

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!API_KEY) {
  console.error('Missing GOOGLE_MAPS_API_KEY env var');
  process.exit(1);
}

const STATES = [
  { state: 'Alabama', city: 'Birmingham, AL' },
  { state: 'Alaska', city: 'Anchorage, AK' },
  { state: 'Arizona', city: 'Phoenix, AZ' },
  { state: 'Arkansas', city: 'Little Rock, AR' },
  { state: 'California', city: 'Los Angeles, CA' },
  { state: 'Colorado', city: 'Denver, CO' },
  { state: 'Connecticut', city: 'Hartford, CT' },
  { state: 'Delaware', city: 'Wilmington, DE' },
  { state: 'Florida', city: 'Miami, FL' },
  { state: 'Georgia', city: 'Atlanta, GA' },
  { state: 'Hawaii', city: 'Honolulu, HI' },
  { state: 'Idaho', city: 'Boise, ID' },
  { state: 'Illinois', city: 'Chicago, IL' },
  { state: 'Indiana', city: 'Indianapolis, IN' },
  { state: 'Iowa', city: 'Des Moines, IA' },
  { state: 'Kansas', city: 'Wichita, KS' },
  { state: 'Kentucky', city: 'Louisville, KY' },
  { state: 'Louisiana', city: 'New Orleans, LA' },
  { state: 'Maine', city: 'Portland, ME' },
  { state: 'Maryland', city: 'Baltimore, MD' },
  { state: 'Massachusetts', city: 'Boston, MA' },
  { state: 'Michigan', city: 'Detroit, MI' },
  { state: 'Minnesota', city: 'Minneapolis, MN' },
  { state: 'Mississippi', city: 'Jackson, MS' },
  { state: 'Missouri', city: 'Kansas City, MO' },
  { state: 'Montana', city: 'Billings, MT' },
  { state: 'Nebraska', city: 'Omaha, NE' },
  { state: 'Nevada', city: 'Las Vegas, NV' },
  { state: 'New Hampshire', city: 'Manchester, NH' },
  { state: 'New Jersey', city: 'Newark, NJ' },
  { state: 'New Mexico', city: 'Albuquerque, NM' },
  { state: 'New York', city: 'New York City, NY' },
  { state: 'North Carolina', city: 'Charlotte, NC' },
  { state: 'North Dakota', city: 'Fargo, ND' },
  { state: 'Ohio', city: 'Columbus, OH' },
  { state: 'Oklahoma', city: 'Oklahoma City, OK' },
  { state: 'Oregon', city: 'Portland, OR' },
  { state: 'Pennsylvania', city: 'Philadelphia, PA' },
  { state: 'Rhode Island', city: 'Providence, RI' },
  { state: 'South Carolina', city: 'Charleston, SC' },
  { state: 'South Dakota', city: 'Sioux Falls, SD' },
  { state: 'Tennessee', city: 'Nashville, TN' },
  { state: 'Texas', city: 'Houston, TX' },
  { state: 'Utah', city: 'Salt Lake City, UT' },
  { state: 'Vermont', city: 'Burlington, VT' },
  { state: 'Virginia', city: 'Richmond, VA' },
  { state: 'Washington', city: 'Seattle, WA' },
  { state: 'West Virginia', city: 'Charleston, WV' },
  { state: 'Wisconsin', city: 'Milwaukee, WI' },
  { state: 'Wyoming', city: 'Cheyenne, WY' },
];

const SEARCH_CONFIGS = [
  { query: 'best restaurant', type: 'restaurant', category: 'Food', tags: ['restaurant', 'dining'], limit: 8 },
  { query: 'best coffee shop cafe', type: 'cafe', category: 'Coffee', tags: ['coffee', 'cafe'], limit: 4 },
  { query: 'best bar nightlife', type: 'bar', category: 'Entertainment', tags: ['bar', 'nightlife'], limit: 4 },
  { query: 'best gym fitness', type: 'gym', category: 'Fitness', tags: ['gym', 'fitness'], limit: 2 },
  { query: 'best shopping', type: 'shopping_mall', category: 'Shopping', tags: ['shopping'], limit: 2 },
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

async function searchPlaces(query, city) {
  const q = encodeURIComponent(`${query} in ${city}`);
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${q}&key=${API_KEY}`;
  const data = await httpsGet(url);
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    console.error(`  Search error: ${data.status} - ${data.error_message || ''}`);
  }
  return data.results || [];
}

async function getPlaceDetails(placeId) {
  const fields = 'name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,photos,opening_hours,geometry,types,editorial_summary';
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${encodeURIComponent(fields)}&key=${API_KEY}`;
  const data = await httpsGet(url);
  if (data.status !== 'OK') {
    console.error(`  Details error for ${placeId}: ${data.status}`);
    return null;
  }
  return data.result || null;
}

function getPhotoUrl(photoRef) {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoRef}&key=${API_KEY}`;
}

function formatHours(openingHours) {
  if (!openingHours?.weekday_text) return {};
  const hours = {};
  const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  openingHours.weekday_text.forEach(text => {
    const colonIdx = text.indexOf(': ');
    if (colonIdx !== -1) {
      const day = text.substring(0, colonIdx).toLowerCase();
      const time = text.substring(colonIdx + 2);
      if (dayNames.includes(day)) hours[day] = time;
    }
  });
  return hours;
}

function buildTags(types, baseTags, state) {
  const typeTagMap = {
    restaurant: 'restaurant', cafe: 'cafe', bar: 'bar', gym: 'gym',
    shopping_mall: 'shopping', bakery: 'bakery', night_club: 'nightclub',
    meal_takeaway: 'takeaway', meal_delivery: 'delivery', food: 'food',
    store: 'store', spa: 'spa', beauty_salon: 'beauty',
  };
  const derived = (types || []).flatMap(t => typeTagMap[t] ? [typeTagMap[t]] : []);
  const all = [...new Set([...baseTags, ...derived, state.toLowerCase().replace(/ /g, '-')])];
  return all.slice(0, 8);
}

function esc(str) {
  if (str == null) return null;
  return String(str).replace(/'/g, "''").replace(/\\/g, '\\\\');
}

function sqlVal(v) {
  if (v === null || v === undefined) return 'NULL';
  return `'${esc(v)}'`;
}

async function main() {
  const allBusinesses = [];
  const seenPlaceIds = new Set();

  for (let i = 0; i < STATES.length; i++) {
    const { state, city } = STATES[i];
    console.error(`[${i + 1}/50] ${state} (${city})...`);
    const stateBusinesses = [];

    for (const config of SEARCH_CONFIGS) {
      if (stateBusinesses.length >= 20) break;

      const results = await searchPlaces(config.query, city);
      await sleep(250);

      for (const result of results) {
        if (stateBusinesses.length >= 20) break;
        if (seenPlaceIds.has(result.place_id)) continue;
        if (!result.rating || result.rating < 4.0) continue;

        seenPlaceIds.add(result.place_id);

        const details = await getPlaceDetails(result.place_id);
        await sleep(150);
        if (!details) continue;

        const imageUrl = details.photos?.[0]?.photo_reference
          ? getPhotoUrl(details.photos[0].photo_reference)
          : null;

        const description = details.editorial_summary?.overview
          || `${details.name} is a highly-rated ${config.category.toLowerCase()} spot in ${city}.`;

        const business = {
          name: details.name,
          category: config.category,
          description,
          address: details.formatted_address || null,
          phone: details.formatted_phone_number || null,
          website: details.website || null,
          image_url: imageUrl,
          avg_rating: details.rating || result.rating || 4.0,
          review_count: details.user_ratings_total || result.user_ratings_total || 0,
          tags: buildTags(details.types, config.tags, state),
          hours: formatHours(details.opening_hours),
          lat: details.geometry?.location?.lat ?? null,
          lng: details.geometry?.location?.lng ?? null,
        };

        stateBusinesses.push(business);
      }
    }

    console.error(`  → ${stateBusinesses.length} businesses added`);
    allBusinesses.push(...stateBusinesses);
  }

  console.error(`\nTotal businesses fetched: ${allBusinesses.length}`);

  // Write JSON output
  fs.writeFileSync('scripts/businesses-seed.json', JSON.stringify(allBusinesses, null, 2));
  console.error('Written to scripts/businesses-seed.json');

  // Write SQL output in chunks of 50
  const chunkSize = 50;
  const sqlChunks = [];

  for (let i = 0; i < allBusinesses.length; i += chunkSize) {
    const chunk = allBusinesses.slice(i, i + chunkSize);
    const rows = chunk.map(b => {
      const tagsArr = b.tags.length > 0
        ? `ARRAY[${b.tags.map(t => `'${esc(t)}'`).join(',')}]::text[]`
        : `ARRAY[]::text[]`;
      const hoursJson = `'${esc(JSON.stringify(b.hours))}'::jsonb`;
      return `(${[
        sqlVal(b.name),
        sqlVal(b.category),
        sqlVal(b.description),
        sqlVal(b.address),
        sqlVal(b.phone),
        sqlVal(b.website),
        sqlVal(b.image_url),
        b.avg_rating,
        b.review_count,
        tagsArr,
        hoursJson,
        b.lat !== null ? b.lat : 'NULL',
        b.lng !== null ? b.lng : 'NULL',
        `'approved'`,
      ].join(', ')})`;
    });
    sqlChunks.push(
      `INSERT INTO businesses (name, category, description, address, phone, website, image_url, avg_rating, review_count, tags, hours, lat, lng, status)\nVALUES\n${rows.join(',\n')}\nON CONFLICT DO NOTHING;`
    );
  }

  fs.writeFileSync('scripts/businesses-seed.sql', sqlChunks.join('\n\n'));
  console.error(`Written ${sqlChunks.length} SQL chunks to scripts/businesses-seed.sql`);
  console.error('Done!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
