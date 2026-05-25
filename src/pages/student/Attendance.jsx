import React, { useState, useEffect, useMemo } from 'react'
import { getAuth } from '../../utils/session'
import { postLeave, getMyLeaves, getAttendance, exportAttendanceCsv } from '../../api'

function getMonthMatrix(year, month) {
    // month: 0-11
    const first = new Date(year, month, 1)
    const startDay = first.getDay() // 0 Sun - 6 Sat
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const matrix = []
    let week = new Array(7).fill(null)
    let day = 1
    // fill first week
    for (let i = startDay; i < 7; i++) {
        week[i] = new Date(year, month, day++)
    }
    matrix.push(week)
    while (day <= daysInMonth) {
        week = new Array(7).fill(null)
        for (let i = 0; i < 7 && day <= daysInMonth; i++) {
            week[i] = new Date(year, month, day++)
        }
        matrix.push(week)
    }
    return matrix
}

// Format a Date object to local YYYY-MM-DD (avoid using toISOString which is UTC)
function formatLocalDate(d) {
    if (!d) return ''
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${dd}`
}

export default function Attendance() {
    const [today] = useState(new Date())
    const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() })
    const [leaves, setLeaves] = useState([])
    const [form, setForm] = useState({ from: '', to: '', reason: '' })

    async function loadMyLeaves() {
        try {
            const { token } = getAuth()
            if (!token) return
            const items = await getMyLeaves(token)
            setLeaves(items || [])
        } catch (e) { console.error('Failed to load leaves', e); setLeaves([]) }
    }

    useEffect(() => {
        loadMyLeaves()
    }, [])

    async function submitLeave(e) {
        e.preventDefault()
        if (!form.from || !form.to || !form.reason) return alert('Please fill all fields')
        try {
            const { token } = getAuth()
            await postLeave(form.from, form.to, form.reason, token)
            setForm({ from: '', to: '', reason: '' })
            await loadMyLeaves()
            alert('Leave request submitted')
        } catch (err) {
            console.error(err)
            alert('Failed to submit leave')
        }
    }

    function isDateInApprovedLeave(dateObj) {
        if (!dateObj) return false
        const d = formatLocalDate(dateObj)
        return leaves.some(l => l.status === 'Approved' && (String(l.from).slice(0, 10) <= d && String(l.to).slice(0, 10) >= d))
    }

    const matrix = getMonthMatrix(view.year, view.month)
    const [todayAttendance, setTodayAttendance] = useState(null)
    const [allAttendance, setAllAttendance] = useState([])
    const [me, setMe] = useState(null)
    const [downloading, setDownloading] = useState(false)

    // load student profile and full attendance list for class/section
    useEffect(() => {
        async function loadAll() {
            try {
                const { token } = getAuth()
                if (!token) return
                const meRes = await fetch((import.meta.env.VITE_API_BASE || '') + '/api/students/me', { headers: { Authorization: `Bearer ${token}` } })
                if (!meRes.ok) return
                const meDoc = await meRes.json()
                setMe(meDoc)
                // fetch attendance for class/section
                const items = await getAttendance({ class: meDoc.class, section: meDoc.section }, token)
                setAllAttendance(items || [])
                // derive today's quickly using local date to avoid timezone offsets
                const dateStr = formatLocalDate(new Date())
                const todayRec = (items || []).find(a => String(a.date) === dateStr)
                if (todayRec) {
                    const myRecord = (todayRec.records || []).find(r => String(r.studentId) === String(meDoc._id))
                    setTodayAttendance(myRecord ? myRecord.status : null)
                } else {
                    setTodayAttendance(null)
                }
            } catch (e) { console.warn('Failed to load attendance', e) }
        }
        loadAll()
    }, [])

    async function downloadMyAttendance() {
        try {
            setDownloading(true)
            const { token } = getAuth()
            if (!token) throw new Error('Not authenticated')
            if (!me) throw new Error('Profile not loaded')
            const query = { studentId: me._id }
            // class/section optional, studentId is sufficient
            if (me.class) query.class = me.class
            if (me.section) query.section = me.section
            // get CSV from server and convert to a printable HTML, then open print dialog
            const { blob, filename } = await exportAttendanceCsv(query, token)
            const csvText = await blob.text()
            // simple CSV parser (handles quoted values)
            function parseCsv(text) {
                const lines = text.split(/\r?\n/).filter(l => l.trim() !== '')
                const rows = lines.map(line => {
                    const vals = []
                    let cur = ''
                    let inQuotes = false
                    for (let i = 0; i < line.length; i++) {
                        const ch = line[i]
                        if (ch === '"') {
                            if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; continue }
                            inQuotes = !inQuotes
                            continue
                        }
                        if (ch === ',' && !inQuotes) { vals.push(cur); cur = ''; continue }
                        cur += ch
                    }
                    vals.push(cur)
                    return vals.map(v => v.replace(/^"|"$/g, '').trim())
                })
                return rows
            }

            const rows = parseCsv(csvText)
            const header = rows[0] || []
            const dataRows = (rows.slice(1) || []).map(r => (r || []).map(c => c || ''))
            const outName = (filename || `attendance_${(me.rollNo || me.name || 'student').toString().replace(/\s+/g, '_')}.pdf`).replace(/\.[^/.]+$/, '') + '.pdf'

            // Try to generate a PDF automatically using jspdf + autotable
            try {
                const { jsPDF } = await import('jspdf')
                await import('jspdf-autotable')
                const doc = new jsPDF({ unit: 'pt', format: 'a4' })
                const margin = 40
                let y = margin
                doc.setFontSize(16)
                doc.text(`Attendance — ${me.name || ''}`, margin, y)
                doc.setFontSize(11)
                y += 18
                doc.text(`Class: ${me.class || ''}    Section: ${me.section || ''}    Roll: ${me.rollNo || ''}`, margin, y)
                y += 14
                // jspdf-autotable may export a default function. Use that instead of doc.autoTable for compatibility.
                const autoTableModule = await import('jspdf-autotable')
                const autoTable = autoTableModule && (autoTableModule.default || autoTableModule)
                if (typeof autoTable === 'function') {
                    autoTable(doc, {
                        head: [header],
                        body: dataRows,
                        startY: y,
                        styles: { fontSize: 10 },
                        headStyles: { fillColor: [243, 244, 246], textColor: 20 }
                    })
                } else if (typeof doc.autoTable === 'function') {
                    doc.autoTable({ head: [header], body: dataRows, startY: y, styles: { fontSize: 10 }, headStyles: { fillColor: [243, 244, 246], textColor: 20 } })
                } else {
                    throw new Error('jsPDF autotable plugin not available')
                }
                doc.save(outName)
            } catch (libErr) {
                // If libraries are not installed, fallback to printable window and show install hint
                console.warn('PDF libs missing or failed:', libErr)
                const win = window.open('', '_blank')
                if (!win) throw new Error('Popup blocked')
                const style = `
                    <style>
                      body { font-family: Arial, Helvetica, sans-serif; padding: 20px; color: #111 }
                      table { border-collapse: collapse; width: 100%; }
                      th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                      th { background: #f3f4f6; }
                      h2 { margin-top: 0 }
                    </style>`
                let html = `<!doctype html><html><head><meta charset="utf-8"><title>${outName}</title>${style}</head><body>`
                html += `<h2>Attendance — ${(me.name || '').toString()}</h2>`
                html += `<div>Class: ${me.class || ''} &nbsp;&nbsp; Section: ${me.section || ''} &nbsp;&nbsp; Roll: ${me.rollNo || ''}</div>`
                html += '<table><thead><tr>'
                header.forEach(h => { html += `<th>${h}</th>` })
                html += '</tr></thead><tbody>'
                for (let i = 0; i < dataRows.length; i++) {
                    const r = dataRows[i]
                    html += '<tr>'
                    r.forEach(c => { html += `<td>${c}</td>` })
                    html += '</tr>'
                }
                html += '</tbody></table>'
                html += `<p style="margin-top:18px;color:#9ca3af;font-size:12px">To enable direct PDF download install: <code>npm install jspdf jspdf-autotable</code> and rebuild the frontend.</p>`
                html += `<script>window.onload = function(){ setTimeout(()=>{ window.print(); }, 200); };</script>`
                html += '</body></html>'
                win.document.write(html)
                win.document.close()
            }
        } catch (e) {
            alert(e.message || 'Failed to download attendance')
        } finally { setDownloading(false) }
    }

    const statusForDate = (d) => {
        if (!d || !me) return null
        const key = formatLocalDate(d)
        const rec = (allAttendance || []).find(a => String(a.date) === key)
        if (!rec) return null
        const my = (rec.records || []).find(r => String(r.studentId) === String(me._id))
        return my ? (my.status || null) : null
    }

    return (
        <div className="student-page attendance-page">
            <h3>Attendance</h3>

            <div className="attendance-grid">
                <div className="attendance-calendar card-panel">
                    <div className="cal-header">
                        <button onClick={() => setView(v => {
                            const m = v.month - 1
                            return m < 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: m }
                        })}>&lt;</button>
                        <div className="cal-title">{new Date(view.year, view.month).toLocaleString(undefined, { month: 'long', year: 'numeric' })}</div>
                        <button onClick={() => setView(v => {
                            const m = v.month + 1
                            return m > 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: m }
                        })}>&gt;</button>
                    </div>

                    <table className="cal-table">
                        <thead>
                            <tr>
                                <th>Sun</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th>
                            </tr>
                        </thead>
                        <tbody>
                            {matrix.map((week, idx) => (
                                <tr key={idx}>
                                    {week.map((d, i) => {
                                        const st = d ? statusForDate(d) : null
                                        const isLeave = d ? isDateInApprovedLeave(d) : false
                                        // determine cell background: present overrides leave
                                        let cellBg = null
                                        let textColor = null
                                        if (st === 'present') { cellBg = '#bbf7d0'; textColor = '#065f46' }
                                        else if (st === 'absent') { cellBg = '#f87171'; textColor = '#7f1d1d' }
                                        else if (isLeave) { cellBg = '#fff7ed'; textColor = '#92400e' }

                                        // choose a stronger border for present/absent to make the boundary more visible
                                        const borderStyle = st === 'present' ? '2px solid #16a34a' : st === 'absent' ? '3px solid #b91c1c' : isLeave ? '2px solid #f97316' : '1px solid #f3f3f3'

                                        const tdStyle = d ? (cellBg ? { background: cellBg, borderRadius: 8, border: borderStyle } : { border: borderStyle }) : { opacity: 0.35 }
                                        const badgeStyle = cellBg ? { background: cellBg, color: textColor, border: '1px solid rgba(0,0,0,0.06)' } : { background: '#eef2ff', color: '#1e3a8a', border: '1px solid rgba(0,0,0,0.06)' }

                                        // status class for CSS hooks
                                        const statusClass = d ? (st === 'present' ? 'present' : st === 'absent' ? 'absent' : isLeave ? 'approved-leave' : '') : 'empty'

                                        return (
                                            <td key={i} style={tdStyle} className={statusClass}>
                                                {d && (
                                                    <div className="day" style={{ position: 'relative', padding: 8 }}>
                                                        {/* date number should remain black and clearly visible */}
                                                        <div style={{ fontWeight: 700, color: '#000' }}>{d.getDate()}</div>
                                                        {st && <span style={{ position: 'absolute', top: 6, right: 6, fontSize: 10, padding: '2px 6px', borderRadius: 999, ...(badgeStyle || {}) }}>{st === 'present' ? 'P' : 'A'}</span>}
                                                    </div>
                                                )}
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="legend">
                        <span><span className="legend-box approved" /> Approved Leave</span>
                    </div>
                </div>

                <div className="attendance-actions card-panel">
                    <h4>Apply for Leave</h4>
                    <div style={{ marginBottom: 12 }}>
                        <strong>Today's attendance: </strong>
                        {todayAttendance === null ? <span style={{ color: '#666' }}>Not marked</span> : (
                            todayAttendance === 'present' ? <span style={{ color: 'green' }}>Present</span> : <span style={{ color: 'crimson' }}>Absent</span>
                        )}
                        <div style={{ marginTop: 8 }}>
                            <button type="button" className="btn-outline" onClick={downloadMyAttendance} disabled={downloading}>{downloading ? 'Preparing…' : 'Download Attendance'}</button>
                        </div>
                    </div>
                    <form onSubmit={submitLeave} className="leave-form">
                        <label>From
                            <input type="date" value={form.from} onChange={e => setForm(f => ({ ...f, from: e.target.value }))} />
                        </label>
                        <label>To
                            <input type="date" value={form.to} onChange={e => setForm(f => ({ ...f, to: e.target.value }))} />
                        </label>
                        <label>Reason
                            <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
                        </label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn-primary" type="submit">Submit</button>
                            <button type="button" className="btn-outline" onClick={() => setForm({ from: '', to: '', reason: '' })}>Reset</button>
                        </div>
                    </form>

                    <h4 style={{ marginTop: 18 }}>My Leaves</h4>
                    <div className="leaves-list">
                        {leaves.length === 0 && <div>No leaves submitted yet.</div>}
                        {leaves.map(l => (
                            <div key={l._id || l.id} className={`leave-item ${l.status === 'Approved' ? 'approved' : ''}`}>
                                <div><strong>{String(l.from).slice(0, 10)}</strong> → <strong>{String(l.to).slice(0, 10)}</strong></div>
                                <div>{l.reason}</div>
                                <div className="small">Status: {l.status}{l.reviewNote ? ` — Note: ${l.reviewNote}` : ''}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
