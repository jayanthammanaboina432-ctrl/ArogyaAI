import { Fragment, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { api } from '../api/client';
import PageHeader from '../components/PageHeader';

type Turn = { role: 'user' | 'model'; text: string };

// Gemini replies use light markdown (**bold**, "* " bullets). Render that
// safely with React elements — no raw HTML is ever inserted.
function renderLine(line: string, key: number): ReactNode {
  const isBullet = /^[*-]\s+/.test(line);
  const content = line.replace(/^[*-]\s+/, '');
  const parts = content.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
  return (
    <div key={key} className={isBullet ? 'chat-line chat-bullet' : 'chat-line'}>
      {isBullet && '• '}
      {parts}
    </div>
  );
}

function renderChatText(text: string): ReactNode {
  return text.split('\n').map((line, i) => renderLine(line, i));
}

export default function Chat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, sending]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (sending) return;
    setError('');

    const message = input.trim();
    if (!message) {
      setError('Please enter a message.');
      return;
    }

    setInput('');
    setTurns((t) => [...t, { role: 'user', text: message }]);
    setSending(true);
    try {
      const res = await api<{ sessionId: string; reply: string }>('/chat', {
        method: 'POST',
        body: { message, sessionId: sessionId || undefined },
        auth: true,
      });
      setSessionId(res.sessionId);
      setTurns((t) => [...t, { role: 'model', text: res.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the chatbot.');
      // Put the message back so the user doesn't lose it.
      setTurns((t) => t.slice(0, -1));
      setInput(message);
    } finally {
      setSending(false);
    }
  }

  function startNewChat() {
    setTurns([]);
    setSessionId(null);
    setError('');
  }

  return (
    <div className="content-narrow chat-page">
      <PageHeader
        title="AI Healthcare Chatbot"
        subtitle="Ask general healthcare questions. This chatbot cannot diagnose you or replace a doctor."
      />

      <div className="panel chat-panel">
        <div className="chat-log">
          {turns.length === 0 && (
            <p className="chat-empty">
              Try asking something like "What are common causes of fever?"
            </p>
          )}
          {turns.map((t, i) => (
            <div key={i} className={t.role === 'user' ? 'chat-bubble chat-user' : 'chat-bubble chat-model'}>
              {t.role === 'model' ? renderChatText(t.text) : t.text}
            </div>
          ))}
          {sending && <div className="chat-bubble chat-model chat-thinking">AI is thinking...</div>}
          <div ref={bottomRef} />
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form className="chat-input-row" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Type your question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={2000}
            disabled={sending}
          />
          <button className="btn btn-primary" disabled={sending}>
            Send
          </button>
        </form>
      </div>

      {turns.length > 0 && (
        <button className="btn btn-ghost" onClick={startNewChat} type="button">
          Start New Chat
        </button>
      )}
    </div>
  );
}
