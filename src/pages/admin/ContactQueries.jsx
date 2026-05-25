import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { getAdminContactQueries, updateContactQueryStatus, API_BASE } from '../../api'
import { toast } from 'react-toastify'
import { getAuth } from '../../utils/session'

export default function ContactQueries() {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState({})
    const [emailFilter, setEmailFilter] = useState('')
    const [dateFilter, setDateFilter] = useState('')
    const [timeFilter, setTimeFilter] = useState('')
    const [dayFilter, setDayFilter] = useState('')
    const [q, setQ] = useState('')

    async function load() {
        setLoading(true)
        try {
            const { token } = getAuth() || {}
            const data = await getAdminContactQueries(token)
            setItems(data || [])
        } catch (e) {
            console.error(e)
            toast.error(e?.message || 'Failed to load')
            setItems([])
        } finally { setLoading(false) }
    }

    useEffect(() => { load() }, [])

    async function updateStatus(id, status, notify, note) {
        try {
            setUpdating(u => ({ ...u, [id]: true }))
            const { token } = getAuth() || {}
            const res = await updateContactQueryStatus(id, { status, notify, note }, token)
            toast.success('Updated')
            // update local list
            setItems(it => it.map(i => i._id === id ? res : i))
        } catch (e) {
            console.error(e)
            toast.error(e?.message || 'Failed to update')
        } finally { setUpdating(u => ({ ...u, [id]: false })) }
    }

    return (
        <AdminLayout title="Contactpagequery">
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                <h2>Contactpagequery</h2>
                <div style={{ color: '#6b7280', marginBottom: 12 }}>Queries submitted via the Start page contact form.</div>

                {loading && <div>Loading…</div>}
                {!loading && items.length === 0 && <div>No queries yet.</div>}

                <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input placeholder="Search name or description" value={q} onChange={e => setQ(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid #e5e7eb', minWidth: 200 }} />
                    <input placeholder="Filter by email" value={emailFilter} onChange={e => setEmailFilter(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                    <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                    <input type="time" value={timeFilter} onChange={e => setTimeFilter(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                    <select value={dayFilter} onChange={e => setDayFilter(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid #e5e7eb' }}>
                        <option value="">Any day</option>
                        <option value="0">Sunday</option>
                        <option value="1">Monday</option>
                        <option value="2">Tuesday</option>
                        <option value="3">Wednesday</option>
                        <option value="4">Thursday</option>
                        <option value="5">Friday</option>
                        <option value="6">Saturday</option>
                    </select>
                    <button className="panel-btn" onClick={() => { setEmailFilter(''); setDateFilter(''); setTimeFilter(''); setDayFilter(''); setQ('') }} style={{ background: '#eef2ff', color: '#0b1220', padding: '8px 12px', borderRadius: 8 }}>Clear</button>
                </div>

                {/* compute filtered and split lists */}
                {(() => {
                    const norm = (s) => (s || '').toString().toLowerCase()
                    const filtered = (items || []).filter(it => {
                        try {
                            if (emailFilter && !norm(it.email).includes(norm(emailFilter))) return false
                            if (q && !(norm(it.name).includes(norm(q)) || norm(it.description).includes(norm(q)))) return false
                            if (dateFilter) {
                                const d = new Date(it.createdAt)
                                const y = d.getFullYear()
                                const m = String(d.getMonth() + 1).padStart(2, '0')
                                const day = String(d.getDate()).padStart(2, '0')
                                const s = `${y}-${m}-${day}`
                                if (s !== dateFilter) return false
                            }
                            if (timeFilter) {
                                const d = new Date(it.createdAt)
                                const hh = String(d.getHours()).padStart(2, '0')
                                const mm = String(d.getMinutes()).padStart(2, '0')
                                const s = `${hh}:${mm}`
                                if (!s.startsWith(timeFilter)) return false
                            }
                            if (dayFilter !== '') {
                                const d = new Date(it.createdAt)
                                if (String(d.getDay()) !== String(dayFilter)) return false
                            }
                            return true
                        } catch (e) { return true }
                    })

                    // sort newest first
                    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    const active = filtered.filter(it => (it.status || '').toLowerCase() !== 'solved')
                    const history = filtered.filter(it => (it.status || '').toLowerCase() === 'solved')

                    return (
                        <>
                            <div style={{ marginBottom: 12, fontSize: 14, color: '#374151' }}><strong>Active</strong> — {active.length} items</div>
                            {active.length === 0 && <div style={{ marginBottom: 12 }}>No active queries.</div>}
                            {active.map(it => (
                                <div key={it._id} style={{ padding: 12, borderRadius: 10, background: '#fff', border: '1px solid #e6eef8', marginBottom: 8 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 800 }}>{it.name} · <span style={{ fontWeight: 600, color: '#6b7280' }}>{it.email}</span></div>
                                            <div style={{ color: '#374151', fontSize: 13 }}>{it.contact}</div>
                                            <div style={{ marginTop: 8, color: '#6b7280' }}>{it.description}</div>
                                            <div style={{ marginTop: 8, color: '#9ca3af', fontSize: 13 }}>{it.createdAt ? new Date(it.createdAt).toLocaleString() : ''}</div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 220 }}>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <select value={it.status || 'in progress'} onChange={(e) => setItems(prev => prev.map(p => p._id === it._id ? { ...p, status: e.target.value } : p))} style={{ padding: 8, borderRadius: 8, border: '1px solid #e5e7eb' }}>
                                                    <option value="in progress">in progress</option>
                                                    <option value="closed">closed</option>
                                                    <option value="solved">solved</option>
                                                </select>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <input type="checkbox" id={`notify_${it._id}`} defaultChecked={false} /> Notify
                                                </label>
                                            </div>

                                            <div>
                                                <label style={{ fontSize: 13 }}>Note (optional)</label>
                                                <textarea id={`note_${it._id}`} defaultValue={it.note || ''} rows={3} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                                            </div>

                                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                {it.filename && (
                                                    <a href={`${API_BASE}${it.url ? it.url : `/uploads/${it.filename}`}`} target="_blank" rel="noreferrer" className="panel-btn" style={{ background: '#3b82f6', color: '#000', padding: '8px 12px', borderRadius: 8, fontWeight: 700, textDecoration: 'none' }}>Download Attachment</a>
                                                )}
                                                <button className="panel-btn" style={{ background: '#06b6d4', color: '#fff', padding: '8px 12px', borderRadius: 8, fontWeight: 700 }} onClick={() => {
                                                    const sel = document.querySelector(`#notify_${it._id}`)
                                                    const notify = sel ? sel.checked : false
                                                    const noteEl = document.querySelector(`#note_${it._id}`)
                                                    const note = noteEl ? noteEl.value : ''
                                                    updateStatus(it._id, it.status || 'in progress', notify, note)
                                                }}>{updating[it._id] ? 'Updating…' : 'Update'}</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <div style={{ marginTop: 18, marginBottom: 8, fontSize: 14, color: '#374151' }}><strong>History (solved)</strong> — {history.length} items</div>
                            {history.length === 0 && <div>No history yet.</div>}
                            {history.map(it => (
                                <div key={it._id} style={{ padding: 12, borderRadius: 10, background: '#fafafc', border: '1px solid #eef2ff', marginBottom: 8 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 800 }}>{it.name} · <span style={{ fontWeight: 600, color: '#6b7280' }}>{it.email}</span></div>
                                            <div style={{ color: '#374151', fontSize: 13 }}>{it.contact}</div>
                                            <div style={{ marginTop: 8, color: '#6b7280' }}>{it.description}</div>
                                            <div style={{ marginTop: 8, color: '#9ca3af', fontSize: 13 }}>{it.createdAt ? new Date(it.createdAt).toLocaleString() : ''}</div>
                                            {it.note && <div style={{ marginTop: 8, color: '#0f1724', fontSize: 13 }}><strong>Note:</strong> {it.note}</div>}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 160 }}>
                                            {it.filename && (
                                                <a href={`${API_BASE}${it.url ? it.url : `/uploads/${it.filename}`}`} target="_blank" rel="noreferrer" className="panel-btn" style={{ background: '#3b82f6', color: '#000', padding: '8px 12px', borderRadius: 8, fontWeight: 700, textDecoration: 'none' }}>Download Attachment</a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </>
                    )
                })()}
            </div>
        </AdminLayout>
    )
}
