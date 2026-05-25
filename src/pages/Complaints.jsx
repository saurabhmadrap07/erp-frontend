import React, { useEffect, useState } from 'react'
import AdminLayout from '../components/admin/AdminLayout'
import './Complaints.css'
import { getAuth } from '../utils/session'
import { getComplaints, updateComplaintStatus } from '../api'
import { toast } from 'react-toastify'

export default function Complaints() {
    const [complaints, setComplaints] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        async function load() {
            setLoading(true)
            const { token } = getAuth()
            if (!token) {
                setError('Not authenticated')
                setLoading(false)
                return
            }
            try {
                const data = await getComplaints(token)
                setComplaints(data)
            } catch (err) {
                console.error('Failed to fetch complaints', err)
                setError('Failed to load complaints')
                toast.error('Failed to load complaints')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    async function changeStatus(comp, newStatus) {
        const { token } = getAuth()
        if (!token) return setError('Not authenticated')
        // ask for optional note
        const note = window.prompt('Add a note for this status change (optional):', '')
        try {
            const updated = await updateComplaintStatus(comp._id || comp.id, newStatus, note, token)
            setComplaints(prev => prev.map(p => (p._id === (updated._id || updated.id) ? updated : p)))
            toast.success('Complaint updated')
        } catch (err) {
            console.error(err)
            setError('Failed to update complaint')
            toast.error('Failed to update complaint')
        }
    }

    return (
        <AdminLayout title="Complaints">
            <div className="complaints-page">
                <header className="complaints-header">
                    <h1 className="title primary">Received Complaints</h1>
                </header>

                {loading && <section className="panel">Loading complaints...</section>}
                {error && <section className="panel alert error"><div className="msg">{error}</div></section>}

                {!loading && !error && (
                    <section className="panel complaints-list">
                        {complaints.length === 0 && (
                            <div className="empty-inner muted">No complaints submitted yet.</div>
                        )}

                        {complaints.map(c => (
                            <article key={c._id || c.id} className={`complaint-card ${c.priority ? c.priority.toLowerCase() : ''}`}>
                                <div className="complaint-card-top">
                                    <div className="complaint-priority">{c.priority}</div>
                                    <div className="complaint-meta">{c.username || c.user || 'Unknown'} · {new Date(c.createdAt || c.created).toLocaleString()}</div>
                                </div>
                                <div className="complaint-body">{c.text}</div>
                                <div className="complaint-footer">Status: <strong>{c.status || 'Open'}</strong></div>
                                <div className="complaint-actions">
                                    {c.status !== 'In Progress' && <button className="btn-outline small" onClick={() => changeStatus(c, 'In Progress')}>Mark In Progress</button>}
                                    {c.status !== 'Resolved' && <button className="btn-primary small" onClick={() => changeStatus(c, 'Resolved')}>Resolve</button>}
                                    {c.status !== 'Closed' && <button className="btn-outline small" onClick={() => changeStatus(c, 'Closed')}>Close</button>}
                                </div>

                                {c.history && c.history.length > 0 && (
                                    <div className="complaint-history">
                                        {c.history.slice().reverse().map((h, idx) => (
                                            <div key={idx} className="history-entry">
                                                <div className="history-meta">{h.by || 'Admin'} ({h.role || 'admin'}) · {new Date(h.at).toLocaleString()}</div>
                                                {h.note && <div className="history-note">{h.note}</div>}
                                                <div className="history-status">Status: <strong>{h.status}</strong></div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </article>
                        ))}
                    </section>
                )}
            </div>
        </AdminLayout>
    )
}
