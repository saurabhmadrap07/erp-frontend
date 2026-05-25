import React, { useEffect, useState } from 'react'
import StudentLayout from '../../components/student/StudentLayout'
import { getAuth } from '../../utils/session'
import { getMyReportCards } from '../../api/reportCards'
import { API_BASE } from '../../api'

export default function StudentReportCard() {
    const { token } = getAuth()
    const [list, setList] = useState([])

    useEffect(() => { load() }, [])
    async function load() {
        if (!token) return setList([])
        try {
            const res = await getMyReportCards(token)
            setList(res)
        } catch (e) { console.warn(e) }
    }

    async function download(id, filename) {
        try {
            const base = API_BASE || (window && window.location && window.location.origin) || ''
            const url = `${base}/api/reportcards/${id}/download`
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, credentials: 'include' })
            if (!res.ok) throw new Error('Download failed')
            const blob = await res.blob()
            const link = document.createElement('a')
            link.href = window.URL.createObjectURL(blob)
            link.download = filename || 'report-card.pdf'
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(link.href)
        } catch (e) { alert(e.message || 'Download failed') }
    }

    return (
        <StudentLayout title="Report Cards">
            <div className="card">
                <h3>Your Report Cards</h3>
                {list.length === 0 ? <p>No report cards available.</p> : (
                    <table>
                        <thead><tr><th>Exam</th><th>Class</th><th>Section</th><th>Date</th><th>File</th></tr></thead>
                        <tbody>
                            {list.map(r => (
                                <tr key={r._id}>
                                    <td>{r.examName}</td>
                                    <td>{r.className}</td>
                                    <td>{r.section}</td>
                                    <td>{new Date(r.createdAt).toLocaleString()}</td>
                                    <td>{r.filePath ? <button onClick={() => download(r._id, `${r.examName || 'report'}_${r.recipientName || r.className}.pdf`)}>Download</button> : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </StudentLayout>
    )
}
