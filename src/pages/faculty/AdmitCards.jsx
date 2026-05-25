import React, { useEffect, useState } from 'react'
import FacultyLayout from '../../components/faculty/FacultyLayout'
import { getAuth } from '../../utils/session'
import { createAdmitCards, getAdmitCards } from '../../api'

export default function FacultyAdmitCards() {
    const { token } = getAuth()
    const [className, setClassName] = useState('')
    const [section, setSection] = useState('')
    const [examName, setExamName] = useState('')
    const [dateOfExam, setDateOfExam] = useState('')
    const [note, setNote] = useState('')
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
        if (!className || !section || !examName) return alert('class, section and exam required')
        const fd = new FormData()
        fd.set('className', className)
        fd.set('section', section)
        fd.set('examName', examName)
        fd.set('dateOfExam', dateOfExam || '')
        fd.set('note', note || '')
        setLoading(true)
        try {
            const res = await createAdmitCards(fd, token)
            alert(`Generated ${res.count || 0} admit cards`)
            loadHistory()
        } catch (err) { alert(err.message || 'Failed') }
        setLoading(false)
    }

    return (
        <FacultyLayout title="Admit Cards">
            <div className="card">
                <h3>Generate Admit Cards (Faculty)</h3>
                <form onSubmit={onGenerate}>
                    <div>
                        <label>Class</label>
                        <input value={className} onChange={e => setClassName(e.target.value)} placeholder="e.g. 10" />
                    </div>
                    <div>
                        <label>Section</label>
                        <input value={section} onChange={e => setSection(e.target.value)} placeholder="e.g. A" />
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
                        <label>Note (optional)</label>
                        <textarea value={note} onChange={e => setNote(e.target.value)} />
                    </div>
                    <div>
                        <button type="submit" disabled={loading}>{loading ? 'Generating...' : 'Generate and Send to Students'}</button>
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
                                <td>{h.filePath ? <a href={h.filePath} target="_blank">PDF</a> : '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </FacultyLayout>
    )
}
