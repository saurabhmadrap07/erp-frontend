import React, { useState, useEffect } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { uploadResource, getResources, API_BASE } from '../../api'
import { getAuth } from '../../utils/session'

export default function AdminForm() {
    const [title, setTitle] = useState('')
    const [file, setFile] = useState(null)
    const [loading, setLoading] = useState(false)
    const [items, setItems] = useState([])
    const [error, setError] = useState('')

    async function load() {
        setError('')
        try {
            const { token } = getAuth()
            const list = await getResources({}, token)
            setItems(list || [])
        } catch (e) { setError(e?.message || 'Failed to load') }
    }

    useEffect(() => { load() }, [])

    async function handleSubmit(e) {
        e.preventDefault()
        if (!title) return alert('Please provide a title')
        if (!file) return alert('Please attach a PDF')
        setLoading(true)
        try {
            const { token } = getAuth()
            const fd = new FormData()
            fd.append('file', file)
            fd.append('title', title)
            // uploadResource expects Authorization header
            await uploadResource(fd, token)
            setTitle('')
            setFile(null)
            await load()
            alert('Form uploaded')
        } catch (err) { console.error(err); alert(err?.message || 'Upload failed') }
        finally { setLoading(false) }
    }

    return (
        <AdminLayout title="Forms">
            <div className="admin-page">
                <div className="card admin-card" style={{ padding: 12 }}>
                    <h3 style={{ marginTop: 0 }}>Upload Form (PDF)</h3>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
                        <label>Title<input value={title} onChange={e => setTitle(e.target.value)} className="colorful-input" /></label>
                        <label>PDF File<input type="file" accept="application/pdf" onChange={e => setFile(e.target.files && e.target.files[0])} /></label>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button className="btn-primary" disabled={loading}>{loading ? 'Uploading…' : 'Upload'}</button>
                        </div>
                    </form>
                </div>

                <div className="card admin-card" style={{ padding: 12, marginTop: 12 }}>
                    <h3 style={{ marginTop: 0 }}>Available Forms</h3>
                    {error && <div className="error">{error}</div>}
                    {items.length === 0 && <div>No forms uploaded yet.</div>}
                    {items.length > 0 && (
                        <table className="data-table colorful-table" style={{ width: '100%', marginTop: 8 }}>
                            <thead><tr><th>Title</th><th>Uploaded</th><th>Download</th></tr></thead>
                            <tbody>
                                {items.map(it => (
                                    <tr key={it._id}>
                                        <td style={{ padding: 8 }}>{it.title}</td>
                                        <td style={{ padding: 8 }}>{it.createdAt ? new Date(it.createdAt).toLocaleString() : ''}</td>
                                        <td style={{ padding: 8 }}>{it.filename ? <a href={`${API_BASE}/uploads/${it.filename}`} target="_blank" rel="noreferrer">Download</a> : '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </AdminLayout>
    )
}
