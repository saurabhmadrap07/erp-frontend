import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { getAuth } from '../../utils/session'
import { createAdmitCards, getAdmitCards, API_BASE } from '../../api'

export default function AdminAdmitCards() {
    const { token } = getAuth()
    const [className, setClassName] = useState('')
    const [section, setSection] = useState('')
    const [examName, setExamName] = useState('')
    const [dateOfExam, setDateOfExam] = useState('')
    const [note, setNote] = useState('')
    const [schoolName, setSchoolName] = useState('')
    const [signatureFile, setSignatureFile] = useState(null)
    const [subjects, setSubjects] = useState([{ subject: '', date: '', from: '', to: '' }])
    const [instructions, setInstructions] = useState('')
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(false)

    useEffect(() => { loadHistory() }, [])
    async function loadHistory() {
        try {
            const list = await getAdmitCards({}, token)
            setHistory(list)
        } catch (e) { console.warn(e) }
    }

    async function onGenerate(e) {
        e.preventDefault()
        if (!className || !examName) return alert('class and exam required')
        const fd = new FormData()
        fd.set('schoolName', schoolName || '')
        fd.set('className', className)
        // send section only if provided; backend treats missing/empty as ALL
        if (section) fd.set('section', section)
        fd.set('examName', examName)
        fd.set('dateOfExam', dateOfExam || '')
        fd.set('note', note || '')
        fd.set('instructions', instructions || '')
        fd.set('subjects', JSON.stringify(subjects || []))
        if (signatureFile) fd.set('signature', signatureFile)
        setLoading(true)
        try {
            const res = await createAdmitCards(fd, token)
            alert(`Generated ${res.count || 0} admit cards`)
            loadHistory()
        } catch (err) { alert(err.message || 'Failed') }
        setLoading(false)
    }

    return (
        <AdminLayout title="Admit Cards">
            <div className="card" style={{ padding: 16, borderRadius: 8, background: 'linear-gradient(180deg,#ffffff,#f6fbff)' }}>
                <h3 style={{ color: '#0B5FFF' }}>Generate Admit Cards</h3>
                <form onSubmit={onGenerate}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label>School Name</label>
                            <input value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="e.g. ABC Public School" />
                        </div>
                        <div>
                            <label>Class</label>
                            <input value={className} onChange={e => setClassName(e.target.value)} placeholder="e.g. 10" />
                        </div>
                        <div>
                            <label>Section</label>
                            <select value={section} onChange={e => setSection(e.target.value)}>
                                <option value="">Select section</option>
                                <option value="ALL">ALL</option>
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="C">C</option>
                                <option value="D">D</option>
                            </select>
                        </div>
                        <div>
                            <label>Exam Name</label>
                            <input value={examName} onChange={e => setExamName(e.target.value)} placeholder="e.g. Term 1" />
                        </div>
                        <div>
                            <label>Exam Date</label>
                            <input type="date" value={dateOfExam} onChange={e => setDateOfExam(e.target.value)} />
                        </div>
                        <div>
                            <label>Signature (upload)</label>
                            <input type="file" accept="image/*" onChange={e => setSignatureFile(e.target.files && e.target.files[0])} />
                        </div>
                    </div>

                    <div style={{ marginTop: 12 }}>
                        <label style={{ fontWeight: 600 }}>Subjects / Schedule</label>
                        {subjects.map((s, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                <input placeholder="Subject" value={s.subject} onChange={e => { const n = [...subjects]; n[idx].subject = e.target.value; setSubjects(n) }} />
                                <input type="date" value={s.date} onChange={e => { const n = [...subjects]; n[idx].date = e.target.value; setSubjects(n) }} />
                                <input type="time" value={s.from} onChange={e => { const n = [...subjects]; n[idx].from = e.target.value; setSubjects(n) }} />
                                <input type="time" value={s.to} onChange={e => { const n = [...subjects]; n[idx].to = e.target.value; setSubjects(n) }} />
                                <button type="button" onClick={() => { const n = subjects.filter((_, i) => i !== idx); setSubjects(n) }}>Remove</button>
                            </div>
                        ))}
                        <div style={{ marginTop: 8 }}>
                            <button type="button" onClick={() => setSubjects([...subjects, { subject: '', date: '', from: '', to: '' }])}>Add Subject</button>
                        </div>
                    </div>

                    <div style={{ marginTop: 12 }}>
                        <label>Instructions (optional)</label>
                        <textarea value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Enter any instructions that should appear on the admit card" />
                    </div>

                    <div style={{ marginTop: 12 }}>
                        <label>Note (optional)</label>
                        <textarea value={note} onChange={e => setNote(e.target.value)} />
                    </div>

                    <div style={{ marginTop: 12 }}>
                        <button type="submit" disabled={loading} style={{ background: '#0B5FFF', color: '#fff', padding: '8px 14px', borderRadius: 6 }}>{loading ? 'Generating...' : 'Generate and Send to Students'}</button>
                    </div>
                </form>
            </div>

            <div className="card" style={{ marginTop: 16 }}>
                <h3>History</h3>
                <table>
                    <thead><tr><th>Exam</th><th>Class</th><th>Section</th><th>Issued At</th><th>File</th></tr></thead>
                    <tbody>
                        {history.map(h => (
                            <tr key={h._id}>
                                <td>{h.examName}</td>
                                <td>{h.className}</td>
                                <td>{h.section}</td>
                                <td>{new Date(h.issuedAt || h.createdAt).toLocaleString()}</td>
                                <td>{h.filePath ? <button type="button" onClick={e => downloadFileById(h._id, `${h.examName || 'admit'}_${h.recipientName || h.className}.pdf`)}>Download</button> : '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AdminLayout>
    )

    async function downloadFileById(id, filename) {
        try {
            if (!id) return alert('Invalid file')
            const base = API_BASE || (window && window.location && window.location.origin) || ''
            const fetchUrl = `${base}/api/admitcards/${id}/download`
            const headers = {}
            if (token) headers['Authorization'] = `Bearer ${token}`
            const res = await fetch(fetchUrl, { credentials: 'include', headers })
            if (!res.ok) {
                const txt = await res.text().catch(() => '')
                throw new Error(txt || 'Failed to download file')
            }
            const blob = await res.blob()
            const link = document.createElement('a')
            link.href = window.URL.createObjectURL(blob)
            link.download = filename || 'admit-card.pdf'
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(link.href)
        } catch (e) {
            alert(e.message || 'Download failed')
        }
    }
}
