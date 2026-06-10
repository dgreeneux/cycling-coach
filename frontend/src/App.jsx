import { useState, useRef, useEffect } from 'react'
import './App.css'

const API = 'http://localhost:3001'

function Message({ role, content }) {
  return (
    <div className={`message message--${role}`}>
      <span className="message-label">{role === 'user' ? 'You' : 'Coach'}</span>
      <p>{content}</p>
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
        <h1>Cycling Coach</h1>
        <p>Your AI-powered training companion</p>
      </header>

      <main className="chat">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>Ask your coach anything — training plans, ride analysis, nutrition, recovery.</p>
            <ul className="chat-suggestions">
              {[
                'Create a 4-week base training plan for a beginner',
                'I did a 2hr ride at 180W avg, how did I do?',
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
