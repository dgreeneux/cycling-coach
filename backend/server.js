import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { chat } from './providers.js'
import { SYSTEM_PROMPT } from './coach.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_FILE = path.join(__dirname, 'data.json')

const app = express()
app.use(cors())
app.use(express.json())

function loadData() {
  if (!fs.existsSync(DATA_FILE)) return { rides: [], notes: [] }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
}

// Chat endpoint — accepts full message history from the client
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' })
  }
  try {
    const data = loadData()
    const context = data.rides.length > 0
      ? `\n\nThe cyclist has logged ${data.rides.length} ride(s). Most recent: ${JSON.stringify(data.rides.at(-1))}`
      : ''
    const reply = await chat(messages, SYSTEM_PROMPT + context)
    res.json({ reply })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// Log a ride
app.post('/api/rides', (req, res) => {
  const { date, distance, duration, avgPower, avgHR, notes } = req.body
  const data = loadData()
  const ride = { id: Date.now(), date: date || new Date().toISOString(), distance, duration, avgPower, avgHR, notes }
  data.rides.push(ride)
  saveData(data)
  res.json({ ride })
})

// Get all rides
app.get('/api/rides', (req, res) => {
  res.json(loadData().rides)
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Cycling coach API running on http://localhost:${PORT}`))
