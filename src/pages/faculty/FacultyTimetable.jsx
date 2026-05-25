import React, { useEffect, useState } from 'react'
import FacultyLayout from '../../components/faculty/FacultyLayout'
import { getTimetable, API_BASE } from '../../api'
import { getAuth } from '../../utils/session'

export default function FacultyTimetable() {
    const { token } = getAuth()
    const [items, setItems] = useState([])
    const [selected, setSelected] = useState(null)
    const [loading, setLoading] = useState(false)

    async function load() {
        setLoading(true)
        try {
            // fetch all timetables uploaded with class=FACULTY
            const list = await getTimetable({ class: 'FACULTY' })
            const arr = Array.isArray(list) ? list : []
            // sort by uploadedAt/createdAt descending
            arr.sort((a, b) => (new Date(b.uploadedAt || b.createdAt) - new Date(a.uploadedAt || a.createdAt)))
            setItems(arr)
        } catch (e) { alert('Failed to load timetables: ' + (e && e.message ? e.message : String(e))) }
        finally { setLoading(false) }
    }

    useEffect(() => { load() }, [])

    function previewUrl(t) {
        if (!t) return ''
        if (t.filePath) return (API_BASE || '') + t.filePath
        return t.content ? `data:application/pdf;base64,${t.content}` : ''
    }

    return (
        <FacultyLayout title="Faculty TimeTable">
            <div style={{ padding: 20 }}>
                <h3>Faculty Timetables (date-wise)</h3>
                <div style={{ marginTop: 12 }}>
                    {loading && <div className="info">Loading...</div>}
                    {!loading && items.length === 0 && <div className="info">No faculty timetables uploaded yet.</div>}
                    {items.map(t => (
                        <div key={t._id} style={{ border: '1px solid #e2e8f0', padding: 10, borderRadius: 8, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 700 }}>{t.name || 'Faculty Timetable'}</div>
                                <div className="small">Uploaded: {new Date(t.uploadedAt || t.createdAt).toLocaleString()}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {t.filePath && <a className="btn outline" href={(API_BASE || '') + t.filePath} target="_blank" rel="noreferrer">Open</a>}
                                <button className="btn" onClick={() => setSelected(t)}>Preview</button>
                            </div>
                        </div>
                    ))}
                </div>

                {selected && (
                    <div style={{ marginTop: 12 }}>
                        <h4>Preview — {selected.name}</h4>
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                            <iframe title="timetable-preview" src={previewUrl(selected)} style={{ width: '100%', height: 600, border: 0 }} />
                        </div>
                        <div style={{ marginTop: 8 }}>
                            <button className="btn" onClick={() => setSelected(null)}>Close Preview</button>
                        </div>
                    </div>
                )}
            </div>
        </FacultyLayout>
    )
}
