import React, { useState, useEffect } from 'react'
import { postComplaint, getComplaints } from '../../api'
import { getAuth } from '../../utils/session'
import { toast } from 'react-toastify'

export default function ComplaintFixed() {
    const [text, setText] = useState('')
    const [priority, setPriority] = useState('Medium')
    const [complaints, setComplaints] = useState([])

    useEffect(() => {
        async function load() {
            const { token } = getAuth()
            try {
                if (token) {
                    const data = await getComplaints(token)
                    setComplaints(data)
                }
            } catch (err) {
                console.error('Failed to load complaints', err)
            }
        }
        load()
    }, [])

    async function submit(e) {
        e && e.preventDefault()
        if (!text.trim()) return alert('Please enter complaint details')
        const { token } = getAuth()
        try {
            const created = token ? await postComplaint(text.trim(), priority, token) : null
            if (created) {
                setComplaints(prev => [created, ...prev])
                toast.success('Complaint submitted')
            } else {
                setComplaints(prev => [{ id: Date.now(), text: text.trim(), priority, created: new Date().toISOString(), status: 'Open' }, ...prev])
                toast.success('Complaint added (local)')
            }
            setText('')
            setPriority('Medium')
        } catch (err) {
            console.error(err)
            toast.error('Failed to submit complaint')
        }
    }

    return (
        <div className="student-page complaint-page">
            <div className="complaint-header">
                <div className="complaint-header-inner">RAISE&nbsp;&nbsp;A&nbsp;&nbsp;COMPLAINTS</div>
            </div>

            <form className="complaint-form" onSubmit={submit}>
                <div className="complaint-box">
                    <textarea
                        placeholder={text.length > 0 ? `${text.length}/500 characters` : 'COMPLAINT DETAILS (0/500 CHARACTERS)'}
                        value={text}
                        maxLength={500}
                        onChange={e => setText(e.target.value)}
                    />
                </div>

                <div className="priority-section">
                    <div className="arrow left">
                        <svg width="48" height="32" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M40 2L12 16L40 30V2Z" fill="#2D62B8" /></svg>
                    </div>
                    <div className="priority-center">PRIORITY&nbsp;&nbsp;LEVELS</div>
                    <div className="arrow right">
                        <svg width="48" height="32" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 30L36 16L8 2V30Z" fill="#2D62B8" /></svg>
                    </div>
                </div>

                <div className="priority-row choices">
                    <button type="button" className={`prio-box high ${priority === 'High' ? 'selected' : ''}`} onClick={() => setPriority('High')} aria-pressed={priority === 'High'}>
                        <span className="prio-icon" aria-hidden="true">!</span>
                        <span className="prio-label">HIGH</span>
                    </button>
                    <button type="button" className={`prio-box medium ${priority === 'Medium' ? 'selected' : ''}`} onClick={() => setPriority('Medium')} aria-pressed={priority === 'Medium'}>
                        <span className="prio-icon" aria-hidden="true">⚠</span>
                        <span className="prio-label">MEDIUM</span>
                    </button>
                    <button type="button" className={`prio-box low ${priority === 'Low' ? 'selected' : ''}`} onClick={() => setPriority('Low')} aria-pressed={priority === 'Low'}>
                        <span className="prio-icon" aria-hidden="true">✓</span>
                        <span className="prio-label">LOW</span>
                    </button>
                </div>

                <div className="submit-row">
                    <button className="btn-primary big" type="submit">SUBMIT COMPLAINT</button>
                </div>
            </form>

            <section className="complaint-list card-panel">
                <h4>My Complaints</h4>
                {complaints.length === 0 && <div className="muted">No complaints submitted yet.</div>}
                {complaints.map(c => {
                    const id = c._id || c.id
                    const created = c.createdAt || c.created
                    return (
                        <div key={id} className={`complaint-item ${(c.priority || 'Medium').toLowerCase()}`}>
                            <div className="complaint-top">
                                <div className="complaint-priority">{c.priority || 'Medium'}</div>
                                <div className="complaint-date">{new Date(created).toLocaleString()}</div>
                            </div>
                            <div className="complaint-text">{c.text}</div>
                            <div className="complaint-status">Status: {c.status || 'Open'}</div>
                            {c.history && c.history.length > 0 && (
                                <div className="complaint-history">
                                    <h5>History</h5>
                                    {c.history.slice().reverse().map((h, i) => (
                                        <div key={i} className="history-entry">
                                            <div className="history-meta">{h.by || 'Admin'} ({h.role || 'admin'}) · {new Date(h.at).toLocaleString()}</div>
                                            {h.note && <div className="history-note">{h.note}</div>}
                                            <div className="history-status">Status: <strong>{h.status}</strong></div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}
            </section>
        </div>
    )
}
