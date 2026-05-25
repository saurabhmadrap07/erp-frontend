import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { getAuth } from '../../utils/session'
import { getStudentDeleteRequests, approveStudentDeleteRequest } from '../../api'
import '../../pages/AdminPanel.css'

export default function DeleteRequests() {
    const [requests, setRequests] = useState([])
    const [query, setQuery] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => { fetchList() }, [])

    async function fetchList() {
        setError('')
        setLoading(true)
        try {
            const { token } = getAuth()
            const list = await getStudentDeleteRequests(token)
            setRequests(list || [])
        } catch (e) {
            console.error(e)
            setError(e.message || 'Failed to load requests')
        } finally { setLoading(false) }
    }

    async function onApprove(req) {
        if (!confirm('Approve and delete student ' + (req.studentEmail || req.studentId) + ' ?')) return
        try {
            const { token } = getAuth()
            await approveStudentDeleteRequest(req._id, token)
            alert('Approved and deleted')
            fetchList()
        } catch (e) { console.error(e); alert(e.message || 'Failed') }
    }

    return (
        <AdminLayout title="Delete Requests">
            <div className="admin-page">
                <h2>Student Delete Requests</h2>
                {error && <div style={{ color: 'crimson' }}>{error}</div>}
                <div className="card" style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                        <input className="delete-requests-search" placeholder="Search name / email / roll / requested by / note" value={query} onChange={e => setQuery(e.target.value)} />
                        <button className="action-btn" onClick={() => setQuery('')}>Clear</button>
                    </div>
                    {loading && <div className="small">Loading…</div>}
                    {!loading && requests.length === 0 && <div className="small">No delete requests found.</div>}

                    {requests.length > 0 && (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="data-table delete-requests-table" style={{ width: '100%', minWidth: 960 }}>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Class</th>
                                        <th>Section</th>
                                        <th>Roll No</th>
                                        <th>Requested By</th>
                                        <th>Note</th>
                                        <th>Status</th>
                                        <th>Created</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {requests.filter(r => {
                                        const q = (query || '').trim().toLowerCase()
                                        if (!q) return true
                                        return (String(r.studentName || '').toLowerCase().includes(q)
                                            || String(r.studentEmail || '').toLowerCase().includes(q)
                                            || String(r.rollNo || '').toLowerCase().includes(q)
                                            || String(r.requestedByName || '').toLowerCase().includes(q)
                                            || String(r.note || '').toLowerCase().includes(q))
                                    }).map(r => (
                                        <tr key={r._id || r.id} className="leave-row">
                                            <td style={{ padding: 8 }}>{r.studentName || '-'}</td>
                                            <td style={{ padding: 8 }}>{r.studentEmail || '-'}</td>
                                            <td style={{ padding: 8 }}>{r.class || '-'}</td>
                                            <td style={{ padding: 8 }}>{r.section || '-'}</td>
                                            <td style={{ padding: 8 }}>{r.rollNo || '-'}</td>
                                            <td style={{ padding: 8 }}>{r.requestedByName || r.requestedBy || '-'}</td>
                                            <td style={{ padding: 8 }}>{r.note || '-'}</td>
                                            <td style={{ padding: 8 }}>{r.status || 'pending'}</td>
                                            <td style={{ padding: 8 }}>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}</td>
                                            <td style={{ padding: 8 }}>
                                                <button className="action-btn" onClick={() => onApprove(r)}>Approve</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    )
}
