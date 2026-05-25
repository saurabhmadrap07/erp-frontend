import React, { useEffect, useState } from 'react'
import AdminLayout from '../components/admin/AdminLayout'
import { getAuth } from '../utils/session'
import { getMessages, updateMessageStatus } from '../api'
import { toast } from 'react-toastify'
import './Complaints.css'

export default function AdminMessages() {
    const [messages, setMessages] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [replyDrafts, setReplyDrafts] = useState({})

    useEffect(() => {
        async function load() {
            setLoading(true)
            const { token } = getAuth()
            if (!token) { setError('Not authenticated'); setLoading(false); return }
            try {
                const data = await getMessages(token)
                setMessages(data)
            } catch (err) {
                console.error(err)
                setError('Failed to load messages')
                toast.error('Failed to load messages')
            } finally { setLoading(false) }
        }
        load()
    }, [])

    async function changeStatus(msg, newStatus) {
        const { token } = getAuth()
        if (!token) return toast.error('Not authenticated')
        const note = window.prompt('Add a note for this status change (optional):', '')
        try {
            const updated = await updateMessageStatus(msg._id || msg.id, newStatus, note, token)
            setMessages(prev => prev.map(m => (m._id === (updated._id || updated.id) ? updated : m)))
            toast.success('Message updated')
        } catch (err) {
            console.error(err)
            toast.error('Failed to update message')
        }
    }

    async function sendReply(msgId) {
        const note = (replyDrafts[msgId] || '').trim()
        if (!note) return toast.error('Enter a reply message')
        const { token } = getAuth()
        if (!token) return toast.error('Not authenticated')
        try {
            const msg = messages.find(m => (m._id || m.id) === msgId)
            const status = msg && (msg.status || 'New')
            const updated = await updateMessageStatus(msgId, status, note, token)
            setMessages(prev => prev.map(m => ((m._id || m.id) === (updated._id || updated.id) ? updated : m)))
            setReplyDrafts(prev => { const n = { ...prev }; delete n[msgId]; return n })
            toast.success('Reply sent')
        } catch (err) {
            console.error(err)
            toast.error('Failed to send reply')
        }
    }

    return (
        <AdminLayout title="Messages">
            <div className="complaints-page">
                <header className="complaints-header">
                    <h1 className="title primary">Parent Messages</h1>
                </header>

                {loading && <section className="panel">Loading messages...</section>}
                {error && <section className="panel alert error"><div className="msg">{error}</div></section>}

                {!loading && !error && (
                    <section className="panel complaints-list admin-messages-wide">
                        {messages.length === 0 && <div className="empty-inner muted">No messages</div>}

                        <div className="chat-thread">
                            {messages.map(m => (
                                <div key={m._id || m.id} className="chat-panel">
                                    <div className="chat-header">
                                        <div className="chat-meta">{m.parentName || m.createdByUsername || 'Parent'} · {new Date(m.createdAt || m.created).toLocaleString()}</div>
                                        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.6)' }}>{m.priority}</div>
                                    </div>

                                    <div className="chat-conversation">
                                        {/* initial message (parent) as boxed panel */}
                                        <div className="parent-message-box">
                                            <div className="parent-avatar">{(m.parentName || 'P').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}</div>
                                            <div className="parent-content">
                                                <div className="parent-meta">{m.parentName || m.createdByUsername || (m.studentName ? `${m.studentName}` : 'Parent')} · {m.className || ''} · {new Date(m.createdAt || m.created).toLocaleString()}</div>
                                                <div className="parent-text">{m.description}</div>
                                            </div>
                                        </div>

                                        {/* history entries rendered as bubbles */}
                                        {(m.history || []).slice().map((h, idx) => (
                                            <div key={idx} className={`chat-bubble ${h.role && h.role.toLowerCase() === 'admin' ? 'bubble-right' : 'bubble-left'}`}>
                                                <div className="bubble-meta">{h.by || (h.role || 'System')} · {new Date(h.at).toLocaleString()}</div>
                                                {h.note && <div>{h.note}</div>}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="chat-reply">
                                        <textarea placeholder="Write a reply to this parent..." value={replyDrafts[m._id || m.id] || ''} onChange={e => setReplyDrafts(prev => ({ ...prev, [m._id || m.id]: e.target.value }))} />
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            <button className="btn btn-primary" onClick={() => sendReply(m._id || m.id)}>Reply</button>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                {m.status !== 'In Progress' && <button className="btn btn-outline" onClick={() => changeStatus(m, 'In Progress')}>Mark In Progress</button>}
                                                {m.status !== 'Resolved' && <button className="btn btn-primary" onClick={() => changeStatus(m, 'Resolved')}>Resolve</button>}
                                                {m.status !== 'Closed' && <button className="btn btn-outline" onClick={() => changeStatus(m, 'Closed')}>Close</button>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </AdminLayout>
    )
}
