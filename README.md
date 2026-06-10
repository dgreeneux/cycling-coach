# Cycling Coach

An AI-powered cycling coach web app. Chat with your coach to get training plans, analyse rides, and get answers to coaching questions.

## Setup

### Backend

```bash
cd backend
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Switching AI providers

Edit `backend/.env`:

```
# Use Claude (default)
AI_PROVIDER=claude
ANTHROPIC_API_KEY=your_key_here

# Use Ollama (offline/local)
AI_PROVIDER=ollama
OLLAMA_MODEL=llama3
```

## Setting up Ollama (offline fallback)

1. Download and install Ollama from https://ollama.com
2. Pull a model: `ollama pull llama3`
3. Start Ollama: `ollama serve`
4. Set `AI_PROVIDER=ollama` in `backend/.env`

Ollama runs entirely on your machine — no internet or API key needed.

## Features

- Training plan generation
- Ride analysis (distance, time, power, heart rate)
- Coaching Q&A
- Ride logging and progress tracking (`POST /api/rides`)
