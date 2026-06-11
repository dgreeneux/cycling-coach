import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { chat } from './providers.js'
import { SYSTEM_PROMPT } from './coach.js'
import { exchangeToken, getAllActivities, formatActivity, getValidToken } from './strava.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_FILE = path.join(__dirname, 'data.json')

const app = express()
app.use(cors())
app.use(express.json())

function loadData() {
  if (!fs.existsSync(DATA_FILE)) return { rides: [], strava: null }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
}

function buildCoachContext(data) {
  if (!data.rides.length) return ''
  const rides = data.rides
  const races = rides.filter(r => r.isRace)
  const totalKm = rides.reduce((s, r) => s + (r.distance || 0), 0).toFixed(0)
  const totalHours = (rides.reduce((s, r) => s + (r.duration || 0), 0) / 60).toFixed(0)

  // Last 4 weeks
  const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString()
  const recentRides = rides.filter(r => r.date >= fourWeeksAgo)
  const recentKm = recentRides.reduce((s, r) => s + (r.distance || 0), 0).toFixed(0)

  const stats = [
    `Total rides: ${rides.length} (${races.length} races)`,
    `Total distance: ${totalKm}km over ${totalHours} hours`,
    `Last 4 weeks: ${recentRides.length} rides, ${recentKm}km`,
  ].join('\n')

  const detail = rides.slice(-20).map(r =>
    `${r.date?.slice(0, 10)}: ${r.isRace ? '[RACE] ' : ''}${r.name || 'Ride'}, ${r.distance}km, ${r.duration}min` +
    (r.avgPower ? `, ${r.avgPower}W` : '') +
    (r.avgHR ? `, ${r.avgHR}bpm` : '') +
    (r.elevationGain ? `, ${r.elevationGain}m elev` : '')
  ).join('\n')

  return `\n\nCyclist training data:\n${stats}\n\nMost recent 20 rides:\n${detail}`
}

// ── Chat ──────────────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body
  if (!messages || !Array.isArray(messages))
    return res.status(400).json({ error: 'messages array required' })
  try {
    const data = loadData()
    const reply = await chat(messages, SYSTEM_PROMPT + buildCoachContext(data))
    res.json({ reply })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ── Manual ride logging ───────────────────────────────────────────────────────
app.post('/api/rides', (req, res) => {
  const { date, distance, duration, avgPower, avgHR, notes } = req.body
  const data = loadData()
  const ride = { id: Date.now(), source: 'manual', date: date || new Date().toISOString(), distance, duration, avgPower, avgHR, notes }
  data.rides.push(ride)
  saveData(data)
  res.json({ ride })
})

app.get('/api/rides', (req, res) => res.json(loadData().rides))

// ── Strava OAuth ──────────────────────────────────────────────────────────────
app.get('/auth/strava', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID,
    redirect_uri: `http://localhost:${process.env.PORT || 8080}/auth/strava/callback`,
    response_type: 'code',
    scope: 'read,activity:read',
  })
  res.redirect(`https://www.strava.com/oauth/authorize?${params}`)
})

app.get('/auth/strava/callback', async (req, res) => {
  const { code, error } = req.query
  if (error || !code) return res.status(400).send(`Strava auth failed: ${error || 'no code'}`)
  try {
    const tokens = await exchangeToken(code)
    const data = loadData()
    data.strava = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at,
      athlete: {
        id: tokens.athlete.id,
        name: `${tokens.athlete.firstname} ${tokens.athlete.lastname}`,
      },
    }
    saveData(data)
    res.redirect('http://localhost:3000?strava=connected')
  } catch (err) {
    console.error(err)
    res.status(500).send(err.message)
  }
})

// ── Strava sync ───────────────────────────────────────────────────────────────
app.post('/api/strava/sync', async (req, res) => {
  try {
    const data = loadData()
    const token = await getValidToken(data)
    const activities = await getAllActivities(token)
    const formatted = activities.map(formatActivity)

    // Replace all Strava rides with fresh data (preserves manual rides)
    const manualRides = data.rides.filter(r => r.source !== 'strava')
    const existingIds = new Set(data.rides.filter(r => r.source === 'strava').map(r => r.id))
    const newRides = formatted.filter(r => !existingIds.has(r.id))
    data.rides = [...manualRides, ...formatted].sort((a, b) => new Date(a.date) - new Date(b.date))
    saveData(data)
    res.json({ imported: newRides.length, total: data.rides.length, races: formatted.filter(r => r.isRace).length })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/strava/status', (req, res) => {
  const data = loadData()
  res.json({
    connected: !!data.strava,
    athlete: data.strava?.athlete || null,
    rideCount: data.rides.filter(r => r.source === 'strava').length,
  })
})

const PORT = process.env.PORT || 8080
app.listen(PORT, () => console.log(`Cycling coach API running on http://localhost:${PORT}`))
