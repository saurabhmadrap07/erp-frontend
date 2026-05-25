import React, { useEffect, useState } from 'react'
import StudentLayout from '../../components/student/StudentLayout'
import { getAuth } from '../../utils/session'
import { getMyAdmitCards, API_BASE } from '../../api'

export default function StudentAdmitCards() {
    const { token } = getAuth()
    const [list, setList] = useState([])

    useEffect(() => { load() }, [])
    async function load() {
        try {
            if (!token) {
                console.warn('Not authenticated, skipping admit card load')
                setList([])
                return
            }
            const res = await getMyAdmitCards(token)
            setList(res)
        } catch (e) { console.warn(e) }
    }
    async function downloadFile(urlOrId, filename) {
        try {
            if (!urlOrId) return alert('Invalid file')
            const base = API_BASE || (window && window.location && window.location.origin) || ''
            // If value looks like a direct URL or path, use it. Otherwise treat it as an admitcard id and call the download endpoint.
            let fetchUrl = urlOrId && String(urlOrId).startsWith('http') ? urlOrId : `${base}${String(urlOrId).startsWith('/') ? '' : '/'}${String(urlOrId)}`
            // If the provided value looks like an id (no /uploads/ or no leading slash), prefer the download-by-id endpoint
            if (!String(urlOrId).startsWith('http') && !String(urlOrId).startsWith('/uploads') && !String(urlOrId).startsWith('/api/')) {
                fetchUrl = `${base}/api/admitcards/${urlOrId}/download`
            }
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

    return (
        <StudentLayout title="Admit Cards">
            <div className="card">
                <h3>Your Admit Cards</h3>
                {list.length === 0 ? <p>No admit cards yet.</p> : (
                    <table>
                        <thead><tr><th>Exam</th><th>Class</th><th>Section</th><th>Date</th><th>Exam Roll</th><th>File</th></tr></thead>
                        <tbody>
                            {list.map(l => (
                                <tr key={l._id}>
                                    <td>{l.examName}</td>
                                    <td>{l.className}</td>
                                    <td>{l.section}</td>
                                    <td>{l.dateOfExam}</td>
                                    <td>{l.examRollNumber || '—'}</td>
                                    <td>{l.filePath ? <button type="button" onClick={() => downloadFile(l.filePath, `${l.examName || 'admit'}_${l.recipientName || l.className}.pdf`)}>Download</button> : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </StudentLayout>
    )
}
