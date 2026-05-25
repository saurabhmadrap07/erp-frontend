import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { getTests, getTestResults, uploadTestResults } from '../../api'
import { getAuth } from '../../utils/session'

export default function AdminTestResults() {
    const [tests, setTests] = useState([])
    const [selected, setSelected] = useState(null)
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [view, setView] = useState('cards')

    async function loadTests() {
        try {
            const { token } = getAuth()
            const data = await getTests(token)
            setTests(data || [])
            if ((data || []).length && !selected) setSelected(data[0]._id)
        } catch (e) { console.error(e) }
    }

    async function loadResults(testId) {
        if (!testId) return setResults([])
        setLoading(true)
        try {
            const { token } = getAuth()
            const r = await getTestResults(testId, token)
            // dedupe results that may have been uploaded twice or created as duplicates
            const raw = r || []
            const map = new Map()
            raw.forEach(item => {
                const when = new Date(item.submittedAt || item.createdAt || 0).getTime()
                const who = (item.email || item.rollNo || item.name || '').toString().trim().toLowerCase()
                const key = `${who}-${when}`
                const prev = map.get(key)
                // keep the item with latest timestamp (if duplicates exist) or the first seen
                if (!prev || when > prev.when) map.set(key, { item, when })
            })
            setResults(Array.from(map.values()).map(v => v.item))
        } catch (e) { console.error(e); setResults([]) }
        finally { setLoading(false) }
    }

    useEffect(() => { loadTests() }, [])
    useEffect(() => { if (selected) loadResults(selected) }, [selected])

    async function handleUpload(e) {
        // handle CSV file upload and send to backend
        const file = e?.target?.files && e.target.files[0]
        if (!file) return
        if (!selected) return alert('Please select a test before uploading results')
        const form = new FormData()
        form.append('file', file)
        try {
            setLoading(true)
            const { token } = getAuth()
            await uploadTestResults(selected, form, token)
            await loadResults(selected)
            alert('Upload successful')
        } catch (err) {
            console.error(err)
            alert('Upload failed')
        } finally {
            setLoading(false)
        }
    }

    function formatDateTime(ts) {
        try {
            const d = new Date(ts || Date.now())
            return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
        } catch (e) { return String(ts || '') }
    }

    function formatSubject(subj) {
        if (!subj && subj !== 0) return '—'
        if (typeof subj === 'object') return subj.name || subj.title || subj.label || String(subj._id || JSON.stringify(subj))
        if (typeof subj === 'string' || typeof subj === 'number') {
            const s = String(subj)
            if (s.startsWith('{') || s.startsWith('[')) {
                try { const parsed = JSON.parse(s); return formatSubject(parsed) } catch (e) { }
            }
            return s || '—'
        }
        return String(subj)
    }

    return (
        <AdminLayout title="Test Results">
            <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 320 }}>
                    <div style={{ padding: 12, background: '#ffffff', borderRadius: 12, boxShadow: '0 10px 24px rgba(2,6,23,0.08)', border: '2px solid #e9d5ff' }}>
                        <h4>Select Test</h4>
                        <select value={selected || ''} onChange={e => setSelected(e.target.value)} style={{ width: '100%', padding: 8 }}>
                            <option value="">-- Select --</option>
                            {tests.map(t => <option key={t._id} value={t._id}>{t.title} • {t.type}</option>)}
                        </select>
                        <div style={{ marginTop: 12 }}>
                            <label style={{ fontWeight: 700 }}>Upload CSV results</label>
                            <input type="file" accept=".csv" onChange={handleUpload} />
                        </div>
                        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                            <button onClick={() => setView('cards')} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: view === 'cards' ? '#e0e7ff' : '#f8fafc' }}>Cards</button>
                            <button onClick={() => setView('table')} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: view === 'table' ? '#e0e7ff' : '#f8fafc' }}>Table</button>
                        </div>
                    </div>
                </div>

                <div style={{ flex: 1 }}>
                    <div style={{ padding: 12, background: '#ffffff', borderRadius: 12, boxShadow: '0 10px 24px rgba(2,6,23,0.08)' }}>
                        {view === 'cards' ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16 }}>
                                {loading ? (
                                    <div style={{ color: '#6b7280' }}>Loading...</div>
                                ) : (
                                    (results || []).length === 0 ? (
                                        <div style={{ color: '#6b7280' }}>No results</div>
                                    ) : (
                                        results.map((r) => {
                                            const answers = (r.raw && Array.isArray(r.raw.answers)) ? r.raw.answers : null
                                            const correctCount = (r.raw && typeof r.raw.correct === 'number') ? r.raw.correct : (answers ? answers.filter(a => a && a.correct).length : 0)
                                            const wrongCount = (r.raw && typeof r.raw.wrong === 'number') ? r.raw.wrong : (answers ? answers.filter(a => a && a.correct === false && (a.given !== '' && a.given != null)).length : 0)
                                            const skippedCount = (r.raw && typeof r.raw.skipped === 'number') ? r.raw.skipped : (answers ? answers.filter(a => a && (a.given === '' || a.given == null)).length : 0)
                                            return (
                                                <div key={r._id} style={{ background: '#fff', borderRadius: 16, boxShadow: '0 8px 24px rgba(2,6,23,0.08)', border: '2px solid #22c55e', padding: 16 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ fontWeight: 800, color: '#16a34a' }}>{(selected && (tests.find(t => t._id === selected) || {}).title) || 'Test'}</div>
                                                        <div style={{ color: '#64748b', fontSize: 12 }}>{formatDateTime(r.submittedAt || r.createdAt || Date.now())}</div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                                                        <span style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac', borderRadius: 20, padding: '6px 10px', fontSize: 12 }}>Subject: {formatSubject((r.raw && r.raw.subject) || r.class)}</span>
                                                        <span style={{ background: '#e0f2fe', color: '#075985', border: '1px solid #7dd3fc', borderRadius: 20, padding: '6px 10px', fontSize: 12 }}>Section: {r.section || '—'}</span>
                                                        <span style={{ background: '#fde68a', color: '#854d0e', border: '1px solid #facc15', borderRadius: 20, padding: '6px 10px', fontSize: 12 }}>Total Marks: {r.total != null ? r.total : '—'}</span>
                                                    </div>
                                                    <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                                        <div style={{ color: '#16a34a', fontWeight: 800 }}>Score: {r.score != null ? r.score : 0}</div>
                                                        <div style={{ color: '#2563eb', fontWeight: 800 }}>Percentage: {r.percentage != null ? r.percentage + '%' : '0%'}</div>
                                                    </div>
                                                    <div style={{ marginTop: 10, color: '#334155', fontWeight: 700 }}>Subject-wise Analysis:</div>
                                                    <div style={{ marginTop: 6, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                                        <span style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac', borderRadius: 8, padding: '6px 10px', fontSize: 12 }}>Correct: {correctCount}</span>
                                                        <span style={{ background: '#fee2e2', color: '#7f1d1d', border: '1px solid #fca5a5', borderRadius: 8, padding: '6px 10px', fontSize: 12 }}>Wrong: {wrongCount}</span>
                                                        <span style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 10px', fontSize: 12 }}>Skipped: {skippedCount}</span>
                                                    </div>
                                                    <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                                        <div style={{ fontSize: 13, color: '#475569' }}>Name: {r.name || '—'}</div>
                                                        <div style={{ fontSize: 13, color: '#475569' }}>Roll: {r.rollNo || '—'}</div>
                                                        <div style={{ fontSize: 13, color: '#475569' }}>Email: {r.email || '—'}</div>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )
                                )}
                            </div>
                        ) : (
                            <div style={{ overflow: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                                    <thead>
                                        <tr style={{ background: 'linear-gradient(90deg,#7c3aed,#06b6d4)' }}>
                                            {['Name', 'Email', 'Roll', 'Subject', 'Section', 'Score', 'Total', 'Percentage'].map((h, i) => (
                                                <th key={i} style={{ color: '#fff', padding: 10, textAlign: 'left', borderRight: '2px solid rgba(255,255,255,0.25)' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 12 }}>Loading...</td></tr> : (
                                            results.length === 0 ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 12 }}>No results</td></tr> : (
                                                results.map((r, idx) => (
                                                    <tr key={r._id} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f1f5f9' }}>
                                                        {[r.name, r.email, r.rollNo, formatSubject((r.raw && r.raw.subject) || r.class), r.section, r.score != null ? r.score : '', r.total != null ? r.total : '', r.percentage != null ? r.percentage + '%' : ''].map((val, i) => (
                                                            <td key={i} style={{ padding: 10, borderBottom: '2px solid #e2e8f0', borderRight: '2px solid #e2e8f0' }}>{val}</td>
                                                        ))}
                                                    </tr>
                                                ))
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    )
}
