import React, { useEffect, useState } from 'react'
import { getAuth } from '../../utils/session'
import { getMyStudent } from '../../api'
import { getTimetable, API_BASE } from '../../api'

export default function Timetable() {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    async function load() {
        try {
            const { token } = getAuth()
            const stu = await getMyStudent(token)
            const cls = stu.class
            const sec = stu.section || 'ALL'
            const res = await getTimetable({ class: cls, section: sec })
            setItems(res || [])
            setError(null)
        } catch (e) {
            console.error(e)
            setError('Failed to load timetable')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        // initial load and periodic refresh so students see admin updates
        load()
        const id = setInterval(() => {
            load()
        }, 20000)
        return () => clearInterval(id)
    }, [])

    function downloadTimetable(t) {
        try {
            const data = typeof t.content === 'string' ? t.content : JSON.stringify(t.content, null, 2)
            const blob = new Blob([data], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            const safeName = (t.name || 'timetable').replace(/[^a-z0-9\-_. ]/gi, '_')
            a.download = `${safeName}.json`
            document.body.appendChild(a)
            a.click()
            a.remove()
            URL.revokeObjectURL(url)
        } catch (e) {
            console.error('Download failed', e)
            alert('Failed to download timetable')
        }
    }

    if (loading) return <div className="student-page"><div className="small">Loading...</div></div>
    if (error) return <div className="student-page"><div className="small">{error}</div></div>

    return (
        <div className="student-page">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <h3>Timetable</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn outline" onClick={() => {
                        // download latest available timetable
                        if (!items || items.length === 0) { alert('No timetable available for download'); return }
                        const latest = items[0]
                        if (latest.filePath) {
                            const url = (latest.filePath && latest.filePath.startsWith('http')) ? latest.filePath : `${API_BASE}${latest.filePath}`
                            window.open(url, '_blank')
                        } else if (latest.content) {
                            downloadTimetable(latest)
                        } else {
                            alert('No downloadable timetable available')
                        }
                    }}>Download Latest</button>
                    <button className="btn" onClick={() => { setLoading(true); load() }}>Refresh</button>
                </div>
            </div>
            {items.length === 0 && <div className="small">No timetable uploaded for your class/section.</div>}
            {items.map(t => (
                <div key={t._id} className="card" style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontWeight: 700 }}>{t.name || 'Timetable'}</div>
                            <div className="small">Class: {t.class || 'N/A'} • Section: {t.section || 'ALL'}</div>
                            <div className="small">Uploaded: {new Date(t.uploadedAt || t.createdAt).toLocaleString()}</div>
                        </div>
                        <div>
                            {t.filePath ? (
                                <a className="btn outline" href={(t.filePath && t.filePath.startsWith('http')) ? t.filePath : `${API_BASE}${t.filePath}`} target="_blank" rel="noreferrer">Download</a>
                            ) : null}
                            {!t.filePath && t.content ? (
                                <button className="btn outline" onClick={() => downloadTimetable(t)} style={{ marginLeft: 8 }}>Download</button>
                            ) : null}
                        </div>
                    </div>
                    {t.content && (() => {
                        let content = null
                        try {
                            content = typeof t.content === 'string' ? JSON.parse(t.content) : t.content
                        } catch (e) {
                            content = null
                        }
                        if (!content || typeof content !== 'object') {
                            return (
                                <div style={{ marginTop: 10 }}>
                                    <div className="small" style={{ marginBottom: 6 }}>Saved timetable (raw)</div>
                                    <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{typeof t.content === 'string' ? t.content : String(t.content)}</pre>
                                </div>
                            )
                        }

                        // derive ordered periods across days
                        const days = Object.keys(content || {})
                        const periodOrder = []
                        const seen = new Set()
                        for (const d of days) {
                            const row = content[d] || {}
                            for (const p of Object.keys(row)) {
                                if (!seen.has(p)) { seen.add(p); periodOrder.push(p) }
                            }
                        }

                        return (
                            <div style={{ marginTop: 10 }}>
                                <div className="small" style={{ marginBottom: 6 }}>Saved timetable</div>
                                <div className="timetable-wrap">
                                    <table className="timetable">
                                        <thead>
                                            <tr>
                                                <th>Day</th>
                                                {periodOrder.map(p => <th key={p}>{p}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {days.map(d => (
                                                <tr key={d}>
                                                    <td className="day">{d}</td>
                                                    {periodOrder.map(p => <td key={p}>{(content[d] && (content[d][p] || '')) || ''}</td>)}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )
                    })()}
                </div>
            ))}
        </div>
    )
}

