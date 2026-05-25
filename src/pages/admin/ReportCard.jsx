import React, { useState, useEffect } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { getAuth } from '../../utils/session'
import { createReportCard } from '../../api/reportCards'
import { getStudents } from '../../api'
import { getReportCards } from '../../api/reportCards'
import { API_BASE } from '../../api'

export default function AdminReportCard() {
    const { token } = getAuth()
    const [schoolName, setSchoolName] = useState('')
    const [examName, setExamName] = useState('')
    const [className, setClassName] = useState('')
    const [section, setSection] = useState('')
    const [recipientName, setRecipientName] = useState('')
    const [recipientEmail, setRecipientEmail] = useState('')
    const [rollNumber, setRollNumber] = useState('')
    const [templateType, setTemplateType] = useState('normal')
    const [subjects, setSubjects] = useState([{ name: '', marks: '', maxMarks: '' }])
    const [loading, setLoading] = useState(false)
    const [signatureFile, setSignatureFile] = useState(null)
    const [students, setStudents] = useState([])
    const [selecting, setSelecting] = useState(false)
    const [search, setSearch] = useState('')
    const [history, setHistory] = useState([])
    const [loadingHistory, setLoadingHistory] = useState(false)

    function updateSubject(idx, key, val) {
        const s = [...subjects]
        s[idx][key] = val
        setSubjects(s)
    }

    function addSubject() { setSubjects([...subjects, { name: '', marks: '', maxMarks: '' }]) }
    function removeSubject(idx) { setSubjects(subjects.filter((_, i) => i !== idx)) }

    async function onGenerate(e) {
        e.preventDefault()
        setLoading(true)
        try {
            if (signatureFile) {
                const fd = new FormData()
                fd.append('schoolName', schoolName)
                fd.append('examName', examName)
                fd.append('className', className)
                fd.append('section', section)
                fd.append('recipientName', recipientName)
                fd.append('recipientEmail', recipientEmail)
                fd.append('rollNumber', rollNumber)
                fd.append('templateType', templateType)
                fd.append('subjects', JSON.stringify(subjects))
                fd.append('signature', signatureFile)
                const resp = await fetch(`${API_BASE}/api/reportcards`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
                if (!resp.ok) {
                    const err = await resp.json().catch(() => ({ message: 'Failed to create report card' }))
                    throw new Error(err.message || 'Failed to create report card')
                }
                alert('Report card generated')
            } else {
                const payload = { schoolName, examName, className, section, recipientName, recipientEmail, rollNumber, templateType, subjects }
                const res = await createReportCard(payload, token)
                alert('Report card generated')
            }
            // refresh history
            await loadHistory()
        } catch (err) { alert(err.message || 'Failed') }
        setLoading(false)
    }

    async function openSelector() {
        setSelecting(true)
        try {
            // if a class is selected, prefer filtering by class to reduce results
            const q = {}
            if (className) q.class = className
            if (section) q.section = section
            if (search) q.q = search
            const list = await getStudents(q, token)
            setStudents(list || [])
        } catch (e) { console.warn(e); setStudents([]) }
    }

    function chooseStudent(s) {
        try {
            setRecipientName(s.name || '')
            setRecipientEmail(s.email || '')
            setClassName(s.class || '')
            setSection(s.section || '')
            setRollNumber(s.rollNo || '')
        } catch (e) { }
        setSelecting(false)
    }

    async function loadHistory() {
        setLoadingHistory(true)
        try {
            const list = await getReportCards({}, token)
            setHistory(Array.isArray(list) ? list : [])
        } catch (e) { console.warn('Failed to load report card history', e); setHistory([]) }
        setLoadingHistory(false)
    }

    useEffect(() => { loadHistory() }, [])

    async function downloadReportCard(id, filename) {
        if (!id) return
        try {
            const res = await fetch(`${API_BASE}/api/reportcards/${id}/download`, { headers: { Authorization: `Bearer ${token}` } })
            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: 'Download failed' }))
                throw new Error(err.message || 'Download failed')
            }
            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = filename || `report_${id}.pdf`
            document.body.appendChild(a)
            a.click()
            a.remove()
            window.URL.revokeObjectURL(url)
        } catch (e) { alert(e.message || 'Failed to download') }
    }

    return (
        <AdminLayout title="Report Card">
            <div className="card" style={{ padding: 16 }}>
                <h3>Generate Report Card</h3>
                <form onSubmit={onGenerate}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label>School Name</label>
                            <input value={schoolName} onChange={e => setSchoolName(e.target.value)} />
                        </div>
                        <div>
                            <label>Exam Name</label>
                            <input value={examName} onChange={e => setExamName(e.target.value)} />
                        </div>
                        <div>
                            <label>Class</label>
                            <input value={className} onChange={e => setClassName(e.target.value)} />
                        </div>
                        <div>
                            <label>Section</label>
                            <input value={section} onChange={e => setSection(e.target.value)} />
                        </div>
                        <div>
                            <label>Student Name</label>
                            <input value={recipientName} onChange={e => setRecipientName(e.target.value)} />
                        </div>
                        <div>
                            <label>Student Email</label>
                            <input value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} />
                        </div>
                        <div>
                            <label>Roll Number</label>
                            <input value={rollNumber} onChange={e => setRollNumber(e.target.value)} />
                        </div>
                        <div>
                            <label>Template</label>
                            <select value={templateType} onChange={e => setTemplateType(e.target.value)}>
                                <option value="normal">Normal Marksheet</option>
                                <option value="cbse">CBSE Professional Marksheet</option>
                            </select>
                        </div>
                        <div>
                            <label>Controller Signature (optional)</label>
                            <input type="file" accept="image/*" onChange={e => setSignatureFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
                        </div>
                    </div>

                    <div style={{ marginTop: 12 }}>
                        <label>Subjects</label>
                        {subjects.map((s, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                <input placeholder="Subject" value={s.name} onChange={e => updateSubject(idx, 'name', e.target.value)} />
                                <input placeholder="Marks Obtained" value={s.marks} onChange={e => updateSubject(idx, 'marks', e.target.value)} />
                                <input placeholder="Max Marks" value={s.maxMarks} onChange={e => updateSubject(idx, 'maxMarks', e.target.value)} />
                                <button type="button" onClick={() => removeSubject(idx)}>Remove</button>
                            </div>
                        ))}
                        <div style={{ marginTop: 8 }}><button type="button" onClick={addSubject}>Add Subject</button></div>
                    </div>

                    <div style={{ marginTop: 12 }}>
                        <button type="button" onClick={openSelector} style={{ marginRight: 8 }}>Select Student</button>
                        <input placeholder="Search students (name/email)" value={search} onChange={e => setSearch(e.target.value)} style={{ marginRight: 8 }} />
                        {selecting ? <span style={{ fontSize: 12, color: '#666' }}>Selecting...</span> : null}
                        {selecting && students && students.length > 0 ? (
                            <div style={{ marginTop: 8, maxHeight: 240, overflow: 'auto', border: '1px solid #eee', padding: 8, borderRadius: 6 }}>
                                {students.map((s) => (
                                    <div key={s._id} style={{ padding: 8, borderBottom: '1px solid #f1f1f1', display: 'flex', justifyContent: 'space-between' }}>
                                        <div>
                                            <div style={{ fontWeight: 700 }}>{s.name} {s.email ? `(${s.email})` : ''}</div>
                                            <div style={{ color: '#666' }}>{s.class} {s.section} — Roll: {s.rollNo}</div>
                                        </div>
                                        <div>
                                            <button type="button" onClick={() => chooseStudent(s)}>Choose</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>

                    <div style={{ marginTop: 12 }}>
                        <button type="submit" disabled={loading} style={{ background: '#0B5FFF', color: '#fff', padding: '8px 14px', borderRadius: 6 }}>{loading ? 'Generating...' : 'Generate Report Card'}</button>
                    </div>
                </form>
            </div>
            <div className="card" style={{ padding: 16, marginTop: 16 }}>
                <h3>Report Card History</h3>
                {loadingHistory ? <div>Loading...</div> : (
                    <div style={{ maxHeight: 380, overflow: 'auto' }}>
                        {history.length === 0 ? <div style={{ color: '#666' }}>No report cards generated yet.</div> : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Student</th>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Exam</th>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Year</th>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map((h) => (
                                        <tr key={h._id}>
                                            <td style={{ padding: 8, borderBottom: '1px solid #f6f6f6' }}>{h.recipientName || h.recipientEmail || '—'}</td>
                                            <td style={{ padding: 8, borderBottom: '1px solid #f6f6f6' }}>{h.examName || ''}</td>
                                            <td style={{ padding: 8, borderBottom: '1px solid #f6f6f6' }}>{h.createdAt ? (new Date(h.createdAt).getFullYear()) : ''}</td>
                                            <td style={{ padding: 8, borderBottom: '1px solid #f6f6f6' }}>
                                                <button type="button" onClick={() => downloadReportCard(h._id, (h.filePath && h.filePath.split('/').pop()) || `${h.recipientName || 'report'}.pdf`)}>Download PDF</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>
        </AdminLayout>
    )
}
