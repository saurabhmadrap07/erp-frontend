import React, { useEffect, useState } from 'react'
import StudentLayout from '../../components/student/StudentLayout'
import { getMyCertificates, API_BASE } from '../../api'
import { getAuth } from '../../utils/session'

export default function StudentCertificates() {
    const { token } = getAuth()
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(false)
    const [selected, setSelected] = useState(null)

    async function load() {
        setLoading(true)
        try {
            const list = await getMyCertificates(token)
            setItems(Array.isArray(list) ? list : [])
        } catch (e) { setItems([]) }
        finally { setLoading(false) }
    }

    useEffect(() => { load() }, [])

    return (
        <StudentLayout>
            <div style={{ padding: 24 }}>
                <h2>My Certificates</h2>
                {loading && <div className="info">Loading...</div>}
                {!loading && items.length === 0 && <div className="info">No certificates yet.</div>}
                <div style={{ marginTop: 12 }}>
                    {items.map(c => (
                        <div key={c._id} style={{ border: '1px solid #e2e8f0', padding: 12, borderRadius: 8, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 700 }}>{c.title || 'Certificate'}</div>
                                <div className="small">Issued: {new Date(c.uploadedAt || c.createdAt).toLocaleString()}</div>
                                <div className="small">For: {c.certificationFor}</div>
                            </div>
                            <div>
                                {c.filePath && <a className="btn outline" href={(API_BASE || '') + c.filePath} target="_blank" rel="noreferrer">Open</a>}
                            </div>
                        </div>
                    ))}
                </div>

                {selected && (
                    <div style={{ marginTop: 12 }}>
                        <h4>Preview — {selected.title}</h4>
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                            <iframe title="certificate-preview" src={(API_BASE || '') + (selected.filePath || '')} style={{ width: '100%', height: 600, border: 0 }} />
                        </div>
                        <div style={{ marginTop: 8 }}>
                            <button className="btn" onClick={() => setSelected(null)}>Close</button>
                        </div>
                    </div>
                )}
            </div>
        </StudentLayout>
    )
}
