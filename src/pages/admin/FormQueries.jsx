import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { API_BASE } from '../../api'
import { toast } from 'react-toastify'
import { getAuth } from '../../utils/session'

export default function FormQueries() {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)

    async function load() {
        setLoading(true)
        try {
            const { token } = getAuth() || {}
            const headers = { 'Content-Type': 'application/json' }
            if (token) headers.Authorization = `Bearer ${token}`

            const res = await fetch(`${API_BASE}/api/admin/form-queries`, { headers })
            if (res.status === 401) {
                // unauthorized — redirect to admin login
                toast.error('Unauthorized. Please sign in as admin.')
                window.location.href = '/admin-login'
                return
            }
            if (!res.ok) throw new Error('Failed to load form queries')
            const data = await res.json()
            setItems(data || [])
        } catch (e) {
            console.error(e)
            toast.error(e?.message || 'Failed to load')
            setItems([])
        } finally { setLoading(false) }
    }

    useEffect(() => { load() }, [])

    return (
        <AdminLayout title="Forms Query">
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                <h2>Forms Query</h2>
                <div style={{ color: '#6b7280', marginBottom: 12 }}>Submissions from public users for uploaded forms.</div>

                {loading && <div>Loading…</div>}
                {!loading && items.length === 0 && <div>No submissions yet.</div>}

                {!loading && items.length > 0 && (
                    <div style={{ display: 'grid', gap: 12 }}>
                        {items.map(it => (
                            <div key={it._id} style={{ padding: 12, borderRadius: 10, background: '#fff', border: '1px solid #e6eef8' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 800 }}>{it.formTitle || it.formId || 'Form'}</div>
                                        <div style={{ color: '#374151', fontSize: 13 }}>{it.name} · {it.email} · {it.contact}</div>
                                        <div style={{ marginTop: 8, color: '#6b7280' }}>{it.description}</div>
                                        <div style={{ marginTop: 8, color: '#9ca3af', fontSize: 13 }}>{it.createdAt ? new Date(it.createdAt).toLocaleString() : ''}</div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {it.filename && (
                                            <a
                                                href={`${API_BASE}${it.url ? it.url : `/uploads/${it.filename}`}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="panel-btn"
                                                style={{ background: '#3b82f6', color: '#000', padding: '8px 12px', borderRadius: 8, fontWeight: 700, textDecoration: 'none' }}
                                            >
                                                Download Attachment
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AdminLayout>
    )
}
