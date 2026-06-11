const BASE = 'https://www.strava.com'

export async function exchangeToken(code) {
  const res = await fetch(`${BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) throw new Error(`Strava token exchange failed: ${res.statusText}`)
  return res.json()
}

export async function refreshToken(refresh_token) {
  const res = await fetch(`${BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error(`Strava token refresh failed: ${res.statusText}`)
  return res.json()
}

export async function getAllActivities(accessToken) {
  const all = []
  let page = 1
  while (true) {
    const res = await fetch(
      `${BASE}/api/v3/athlete/activities?per_page=200&page=${page}&sport_type=Ride`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!res.ok) throw new Error(`Strava activities fetch failed: ${res.statusText}`)
    const batch = await res.json()
    if (!batch.length) break
    all.push(...batch)
    if (batch.length < 200) break
    page++
  }
  return all
}

export function formatActivity(a) {
  return {
    id: a.id,
    source: 'strava',
    date: a.start_date,
    name: a.name,
    isRace: a.workout_type === 1 || a.workout_type === 11,
    distance: +(a.distance / 1000).toFixed(1),        // km
    duration: Math.round(a.moving_time / 60),          // minutes
    elevationGain: Math.round(a.total_elevation_gain), // metres
    avgSpeed: +(a.average_speed * 3.6).toFixed(1),     // km/h
    avgHR: a.average_heartrate || null,
    avgPower: a.average_watts || null,
    sufferScore: a.suffer_score || null,
  }
}

export async function getValidToken(data) {
  const strava = data.strava
  if (!strava) throw new Error('Strava not connected')
  if (Date.now() / 1000 > strava.expires_at - 60) {
    const refreshed = await refreshToken(strava.refresh_token)
    Object.assign(strava, {
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: refreshed.expires_at,
    })
  }
  return strava.access_token
}
