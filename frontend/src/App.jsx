import { useState, useRef, useEffect } from 'react'
import './App.css'

const API = 'http://localhost:8080'

function Message({ role, content }) {
  return (
    <div className={`message message--${role}`}>
      <span className="message-label">{role === 'user' ? 'You' : 'Coach'}</span>
      <p>{content}</p>
    </div>
  )
}

function StravaPanel() {
  const [status, setStatus] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState(null)

  useEffect(() => {
    fetch(`${API}/api/strava/status`)
      .then(r => r.json())
      .then(setStatus)
      .catch(() => {})

    // Handle redirect back from Strava
    if (window.location.search.includes('strava=connected')) {
      window.history.replaceState({}, '', '/')
      setSyncMsg('Strava connected! Click Sync to import your rides.')
    }
  }, [])

  async function sync() {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const res = await fetch(`${API}/api/strava/sync`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSyncMsg(`Synced ${data.imported} new ride${data.imported !== 1 ? 's' : ''} (${data.total} total)`)
      setStatus(s => ({ ...s, rideCount: data.total }))
    } catch (err) {
      setSyncMsg(`Sync failed: ${err.message}`)
    } finally {
      setSyncing(false)
    }
  }

  if (!status) return null

  return (
    <div className="strava-panel">
      {status.connected ? (
        <>
          <span className="strava-connected">
            ✓ Strava — {status.athlete?.name} · {status.rideCount} rides synced
          </span>
          <button className="strava-sync" onClick={sync} disabled={syncing}>
            {syncing ? 'Syncing…' : 'Sync'}
          </button>
        </>
      ) : (
        <a className="strava-connect" href={`${API}/auth/strava`}>
          Connect Strava
        </a>
      )}
      {syncMsg && <span className="strava-msg">{syncMsg}</span>}
    </div>
  )
}

export default function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    const newMessages = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setMessages([...newMessages, { role: 'assistant', content: data.reply }])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-top">
          <div>
            <h1>Cycling Coach</h1>
            <p>Your AI-powered training companion</p>
          </div>
          <StravaPanel />
        </div>
      </header>

      <main className="chat">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>Ask your coach anything — training plans, ride analysis, nutrition, recovery.</p>
            <ul className="chat-suggestions">
              {[
                'Create a 4-week base training plan for a beginner',
                'Analyse my recent rides and tell me how I\'m progressing',
                'How should I fuel for a 3-hour ride?',
                'What\'s the difference between Z2 and tempo training?',
              ].map(s => (
                <li key={s}>
                  <button onClick={() => setInput(s)}>{s}</button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {messages.map((m, i) => (
          <Message key={i} role={m.role} content={m.content} />
        ))}

        {loading && (
          <div className="message message--assistant">
            <span className="message-label">Coach</span>
            <p className="typing">Thinking...</p>
          </div>
        )}

        {error && <p className="chat-error">{error}</p>}
        <div ref={bottomRef} />
      </main>

      <form className="chat-form" onSubmit={send}>
        <input
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask your coach..."
          disabled={loading}
        />
        <button className="chat-submit" type="submit" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  )
}
