import React, { useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { createTimetable, getTimetable, API_BASE } from '../../api'
import { getAuth } from '../../utils/session'

export default function FacultyTimetableAdmin() {
    const { token } = getAuth()
    // Admin only needs to provide a title, date and file for faculty timetables.
    // Backend requires a `class` value, so we send a fixed value `FACULTY`.
    const [name, setName] = useState('')
    const [date, setDate] = useState('')
    const [file, setFile] = useState(null)
    const [loading, setLoading] = useState(false)
    const [history, setHistory] = useState([])
    const [loadingHistory, setLoadingHistory] = useState(false)

    async function loadHistory() {
        setLoadingHistory(true)
        try {
            const list = await getTimetable({ class: 'FACULTY' })
            const arr = Array.isArray(list) ? list : []
            arr.sort((a, b) => (new Date(b.uploadedAt || b.createdAt) - new Date(a.uploadedAt || a.createdAt)))
            setHistory(arr)
        } catch (e) {
            setHistory([])
            console.warn('Failed to load faculty timetable history', e && e.message)
        } finally { setLoadingHistory(false) }
    }

    async function submit(e) {
        e.preventDefault()
        if (!file) return alert('Please choose a PDF or DOC/DOCX file to upload')
        try {
            setLoading(true)
            const fd = new FormData()
            // mark these uploads as faculty timetables
            fd.append('class', 'FACULTY')
            // include a name/title (use date if provided)
            const finalName = name ? `${name}${date ? ' - ' + date : ''}` : `Faculty Timetable ${date || ''}`
            fd.append('name', finalName)
            fd.append('file', file)
            await createTimetable(fd, token)
            alert('Timetable uploaded')
            // reset form
            setName('')
            setDate('')
            setFile(null)
        } catch (e) {
            alert('Upload failed: ' + (e && e.message ? e.message : String(e)))
        } finally { setLoading(false) }
    }

    return (
        <AdminLayout title="Faculty TimeTable">
            <div style={{ padding: 20 }}>
                <h3>Upload Faculty Timetable</h3>
                <form onSubmit={submit} style={{ maxWidth: 720, display: 'grid', gap: 12 }}>
                    <label>
                        Title
                        <input value={name} onChange={e => setName(e.target.value)} placeholder="Title (optional)" />
                    </label>
                    <label>
                        Date (visible to faculty)
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
                    </label>
                    <label>
                        File (PDF or DOC/DOCX)
                        <input type="file" accept=".pdf,application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={e => setFile(e.target.files && e.target.files[0])} />
                    </label>
                    <div>
                        <button type="submit" className="btn" disabled={loading}>{loading ? 'Uploading...' : 'Upload Timetable'}</button>
                    </div>
                </form>

                <div style={{ marginTop: 28 }}>
                    <h3>Upload History</h3>
                    <div style={{ marginTop: 8 }}>
                        <button className="btn" onClick={loadHistory} disabled={loadingHistory}>Refresh History</button>
                    </div>
                    <div style={{ marginTop: 12 }}>
                        {loadingHistory && <div className="info">Loading...</div>}
                        {!loadingHistory && history.length === 0 && <div className="info">No faculty timetables uploaded yet.</div>}
                        {history.map(t => (
                            <div key={t._id} style={{ border: '1px solid #e2e8f0', padding: 10, borderRadius: 8, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 700 }}>{t.name || 'Faculty Timetable'}</div>
                                    <div className="small">Uploaded: {new Date(t.uploadedAt || t.createdAt).toLocaleString()}</div>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {t.filePath && <a className="btn outline" href={(API_BASE || '') + t.filePath} target="_blank" rel="noreferrer">Open</a>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </AdminLayout>
    )
}
