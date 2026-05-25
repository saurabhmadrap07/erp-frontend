import React, { useState, useEffect } from 'react'
import ParentLayout from '../../components/parent/ParentLayout'
import { getAuth } from '../../utils/session'
import { postMessage, getMyMessages } from '../../api'
import { toast } from 'react-toastify'
import '../Complaints.css'
import { updateMessageStatus } from '../../api'
import useAsyncAction from '../../hooks/useAsyncAction'

export default function ParentMessages() {
    const [parentName, setParentName] = useState('')
    const [studentName, setStudentName] = useState('')
    const [className, setClassName] = useState('')
    const [subject, setSubject] = useState('')
    const [description, setDescription] = useState('')
    const [priority, setPriority] = useState('Medium')
    const [messages, setMessages] = useState([])
    const [loadingMessages, setLoadingMessages] = useState(false)
    const [replyDrafts, setReplyDrafts] = useState({})

    async function loadMessages() {
        setLoadingMessages(true)
        try {
            const { token } = getAuth()
            if (!token) return
            const data = await getMyMessages(token)
            setMessages(data)
        } catch (err) {
            console.error('Failed to load messages', err)
        } finally {
            setLoadingMessages(false)
        }
    }

    useEffect(() => { loadMessages() }, [])
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e) {
        e && e.preventDefault()
        if (!description.trim()) return toast.error('Enter message description')
        setLoading(true)
        const { token } = getAuth()
        try {
            const payload = { parentName, studentName, className, subject, description, priority }
            await postMessage(payload, token)
            toast.success('Message sent to admin')
            setParentName('')
            setStudentName('')
            setClassName('')
            setSubject('')
            // refresh messages list after successful send
            await loadMessages()
            setDescription('')
            setPriority('Medium')
        } catch (err) {
            console.error(err)
            toast.error('Failed to send message')
        } finally {
            setLoading(false)
        }
    }

    const [replyBusy, runReply] = useAsyncAction()

    async function sendReply(msgId) {
        // Use the runReply guard to prevent duplicate clicks
        await runReply(async () => {
            const note = (replyDrafts[msgId] || '').trim()
            if (!note) return toast.error('Enter reply')
            const { token } = getAuth()
            if (!token) return toast.error('Not authenticated')
            try {
                const msg = messages.find(m => (m._id || m.id) === msgId)
                const status = msg && (msg.status || 'New')
                const updated = await updateMessageStatus(msgId, status, note, token)
                // refresh local list
                setMessages(prev => prev.map(m => ((m._id || m.id) === (updated._id || updated.id) ? updated : m)))
                setReplyDrafts(prev => { const n = { ...prev }; delete n[msgId]; return n })
                toast.success('Reply sent')
            } catch (err) {
                console.error(err)
                toast.error('Failed to send reply')
            }
        })
    }

    return (
        <ParentLayout>
            <div className="parent-page">
                <div className="message-form-wrapper">
                    <div className="message-card">
                        <h2>Send Message to Admin</h2>
                        <form onSubmit={handleSubmit} className="message-form">
                            <label>Parent Name
                                <input className="black-bordered-input" value={parentName} onChange={e => setParentName(e.target.value)} placeholder="Parent name" />
                            </label>
                            <label>Student Name
                                <input className="black-bordered-input" value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="Student name" />
                            </label>
                            <label>Class
                                <input className="black-bordered-input" value={className} onChange={e => setClassName(e.target.value)} placeholder="Class" />
                            </label>
                            <label>Subject
                                <input className="black-bordered-input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" />
                            </label>
                            <label>Description
                                <textarea className="black-bordered-input" value={description} onChange={e => setDescription(e.target.value)} rows={6} />
                            </label>

                            <div className="priority-row">
                                <label>Priority</label>
                                <div className="priority-chips">
                                    <button type="button" className={`prio-chip high ${priority === 'High' ? 'selected' : ''}`} onClick={() => setPriority('High')}>High</button>
                                    <button type="button" className={`prio-chip medium ${priority === 'Medium' ? 'selected' : ''}`} onClick={() => setPriority('Medium')}>Medium</button>
                                    <button type="button" className={`prio-chip low ${priority === 'Low' ? 'selected' : ''}`} onClick={() => setPriority('Low')}>Low</button>
                                </div>
                            </div>

                            <div className="message-actions">
                                <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Sending...' : 'Send Message'}</button>
                            </div>
                        </form>

                        <div style={{ marginTop: 18 }}>
                            <h3>Your Messages</h3>
                            {loadingMessages && <div>Loading...</div>}
                            {!loadingMessages && messages.length === 0 && <div className="muted">No messages yet.</div>}

                            <div className="chat-thread">
                                {messages.map(m => (
                                    <div key={m._id || m.id} className="chat-panel">
                                        <div className="chat-header">
                                            <div className="chat-meta">{m.studentName || 'Student'}</div>
                                            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.6)' }}>{new Date(m.createdAt || m.created).toLocaleString()}</div>
                                        </div>

                                        <div style={{ display: 'flex', gap: 12, marginTop: 6, alignItems: 'center' }}>
                                            <div><strong>Class:</strong> {m.className ? m.className : <p className="empty-placeholder">-</p>}</div>
                                            <div><strong>Subject:</strong> {m.subject ? m.subject : <p className="empty-placeholder">-</p>}</div>
                                        </div>

                                        <div className="chat-conversation">
                                            <div className="chat-bubble bubble-right">
                                                <div className="bubble-meta">You · {new Date(m.createdAt || m.created).toLocaleString()}</div>
                                                <div>{m.description}</div>
                                            </div>

                                            {(m.history || []).slice().map((h, idx) => {
                                                const isAdmin = (h.role || '').toLowerCase() === 'admin'
                                                const rawBy = (h.by || h.role || 'Admin')
                                                // If the author looks like an email or a username with digits, don't show raw value — show role-friendly label instead.
                                                let displayBy = rawBy
                                                try {
                                                    const s = String(rawBy || '')
                                                    if (s.includes('@') || /\d/.test(s)) {
                                                        displayBy = isAdmin ? 'Admin' : (s.split('@')[0] || 'User')
                                                    }
                                                } catch (e) { }

                                                return (
                                                    <div key={idx} className={`chat-bubble ${isAdmin ? 'bubble-left' : 'bubble-right'}`}>
                                                        <div className="bubble-meta">{displayBy} · {new Date(h.at).toLocaleString()}</div>
                                                        {h.note && <div>{h.note}</div>}
                                                    </div>
                                                )
                                            })}
                                        </div>

                                        <div className="chat-reply">
                                            <textarea placeholder="Write a reply to admin..." value={replyDrafts[m._id || m.id] || ''} onChange={e => setReplyDrafts(prev => ({ ...prev, [m._id || m.id]: e.target.value }))} />
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                <button className="btn btn-primary" onClick={() => sendReply(m._id || m.id)}>Reply</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ParentLayout>
    )
}

