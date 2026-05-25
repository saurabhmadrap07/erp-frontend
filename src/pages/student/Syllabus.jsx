import React, { useEffect, useState } from 'react'
import { getAuth } from '../../utils/session'
import { getMyStudent } from '../../api'
import { getSyllabus, API_BASE } from '../../api'

export default function Syllabus() {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        async function load() {
            try {
                const { token } = getAuth()
                const stu = await getMyStudent(token)
                const cls = stu.class
                const sec = stu.section || 'ALL'
                const res = await getSyllabus({ class: cls, section: sec })
                setItems(res || [])
            } catch (e) {
                console.error(e)
                setError('Failed to load syllabus')
            } finally { setLoading(false) }
        }
        load()
    }, [])

    if (loading) return <div className="student-page syllabus-page"><div className="small">Loading...</div></div>
    if (error) return <div className="student-page syllabus-page"><div className="small">{error}</div></div>

    return (
        <div className="student-page syllabus-page">
            <h3>Syllabus</h3>
            {items.length === 0 && <div className="small">No syllabus uploaded for your class/section.</div>}
            {items.map(s => (
                <div key={s._id} className="card" style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontWeight: 700 }}>{s.subject || s.name || 'Syllabus'}</div>
                            <div className="small">Uploaded: {new Date(s.uploadedAt || s.createdAt).toLocaleString()}</div>
                        </div>
                        <div>
                            {s.filePath && <a className="btn outline" href={(s.filePath && s.filePath.startsWith('http')) ? s.filePath : `${API_BASE}${s.filePath}`} target="_blank" rel="noreferrer">Download</a>}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
