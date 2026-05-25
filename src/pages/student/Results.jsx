import React, { useEffect, useState, useMemo } from 'react'
import StudentLayout from '../../components/student/StudentLayout'
import { getMyMarks, getMyTestResults } from '../../api'

export default function Results() {
    const [marks, setMarks] = useState([])
    const [loading, setLoading] = useState(true)
    const [testResults, setTestResults] = useState([])
    const [loadingTests, setLoadingTests] = useState(true)
    const [view, setView] = useState('cards')
    const [query, setQuery] = useState('')
    const token = sessionStorage.getItem('erp_token') || localStorage.getItem('erp_token')

    useEffect(() => { load(); loadTestResults() }, [])

    async function load() {
        setLoading(true)
        try {
            if (!token) throw new Error('Not authenticated')
            const data = await getMyMarks(token)
            setMarks(data || [])
        } catch (e) { console.warn('Failed to load marks', e); setMarks([]) }
        finally { setLoading(false) }
    }

    async function loadTestResults() {
        setLoadingTests(true)
        try {
            if (!token) throw new Error('Not authenticated')
            const data = await getMyTestResults(token)
            setTestResults(data || [])
        } catch (e) { console.warn('Failed to load test results', e); setTestResults([]) }
        finally { setLoadingTests(false) }
    }

    // helper: format date/time with seconds and AM/PM
    function formatDateTime(ts) {
        try {
            const d = new Date(ts || Date.now())
            return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
        } catch (e) { return String(ts || '') }
    }

    // helper: human-friendly subject display (prefer raw.subject over class)
    function formatSubject(subj) {
        if (!subj && subj !== 0) return '—'
        // if subject is provided as part of the raw payload and is an object
        if (typeof subj === 'object') return subj.name || subj.title || subj.label || String(subj._id || JSON.stringify(subj))
        // if subject is a string/number
        if (typeof subj === 'string' || typeof subj === 'number') {
            const s = String(subj)
            // try to parse JSON-like string
            if (s.startsWith('{') || s.startsWith('[')) {
                try { const parsed = JSON.parse(s); return formatSubject(parsed) } catch (e) { }
            }
            return s || '—'
        }
        return String(subj)
    }

    // prepare displayed results: filter by query and deduplicate by test title (keep latest submission)
    const displayedResults = useMemo(() => {
        const filtered = (testResults || []).filter(r => {
            if (!query) return true
            const q = query.toLowerCase()
            const title = (r.raw && r.raw.testTitle) || r.test || ''
            const subj = (r.raw && r.raw.subject) || r.class || ''
            const dur = (r.raw && r.raw.duration) || ''
            const dt = r.submittedAt || r.createdAt || ''
            return (title + ' ' + subj + ' ' + dur + ' ' + dt).toString().toLowerCase().includes(q)
        })

        // dedupe by title (lowercased); keep the most recent by submittedAt/createdAt
        const map = new Map()
        filtered.forEach(r => {
            const title = ((r.raw && r.raw.testTitle) || r.test || '').toString().trim().toLowerCase()
            const key = title || (r.testId || r._id || '')
            const ts = new Date(r.submittedAt || r.createdAt || 0).getTime()
            const prev = map.get(key)
            if (!prev || ts > prev.ts) map.set(key, { r, ts })
        })
        return Array.from(map.values()).map(v => v.r)
    }, [testResults, query])

    return (
        <StudentLayout>
            <div className="student-page" style={{ width: 'calc(100% + 5.5cm)', marginLeft: '-5.5cm' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 18 }}>
                    <h2 style={{ color: '#0f766e', fontSize: 34, margin: '18px 0', textAlign: 'center' }}>Test Results</h2>
                    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                        <div style={{ width: '100%', maxWidth: '980px', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 999, padding: '8px 14px', border: '2px solid #10b981', background: '#fff' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 21l-4.35-4.35" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            <input placeholder="Search by series name, subject, duration (min/sec), or date/time..." value={query} onChange={e => setQuery(e.target.value)} style={{ border: 'none', outline: 'none', flex: 1 }} />
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(360px,1fr))', gap: 16 }}>
                    {loadingTests ? (
                        <div style={{ color: '#6b7280' }}>Loading...</div>
                    ) : (
                        (testResults || []).filter(r => {
                            if (!query) return true
                            const q = query.toLowerCase()
                            const title = (r.raw && r.raw.testTitle) || r.test || ''
                            const subj = r.class || (r.raw && r.raw.subject) || ''
                            const dur = (r.raw && r.raw.duration) || ''
                            const dt = r.submittedAt || r.createdAt || ''
                            return (title + ' ' + subj + ' ' + dur + ' ' + dt).toString().toLowerCase().includes(q)
                        }).map((r) => {
                            const answers = (r.raw && Array.isArray(r.raw.answers)) ? r.raw.answers : null
                            const correctCount = (r.raw && typeof r.raw.correct === 'number') ? r.raw.correct : (answers ? answers.filter(a => a && a.correct).length : 0)
                            const wrongCount = (r.raw && typeof r.raw.wrong === 'number') ? r.raw.wrong : (answers ? answers.filter(a => a && a.correct === false && (a.given !== '' && a.given != null)).length : 0)
                            const skippedCount = (r.raw && typeof r.raw.skipped === 'number') ? r.raw.skipped : (answers ? answers.filter(a => a && (a.given === '' || a.given == null)).length : 0)
                            return (
                                <div key={r._id} style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 8px 24px rgba(2,6,23,0.08)', border: '2px solid #22c55e' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontWeight: 800, color: '#16a34a', fontSize: 18 }}>{(r.raw && r.raw.testTitle) || r.test || 'Test'}</div>
                                        <div style={{ color: '#64748b', fontSize: 12 }}>{formatDateTime(r.submittedAt || r.createdAt || Date.now())}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                                        <span style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac', borderRadius: 20, padding: '6px 10px', fontSize: 12 }}>Subject: {formatSubject((r.raw && r.raw.subject) || r.class)}</span>
                                        {r.raw && r.raw.duration ? <span style={{ background: '#e0f2fe', color: '#075985', border: '1px solid #7dd3fc', borderRadius: 20, padding: '6px 10px', fontSize: 12 }}>Duration: {r.raw.duration}</span> : null}
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
                                        <div style={{ fontSize: 13, color: '#475569' }}>Name: {r.name || '-'}</div>
                                        <div style={{ fontSize: 13, color: '#475569' }}>Roll: {r.rollNo || '-'}</div>
                                        <div style={{ fontSize: 13, color: '#475569' }}>Email: {r.email || '-'}</div>
                                        <div style={{ fontSize: 13, color: '#475569' }}>Submitted: {formatDateTime(r.submittedAt || r.createdAt || Date.now())}</div>
                                    </div>
                                </div>
                            )
                        }))
                    }
                </div>
            </div>
        </StudentLayout>
    )
}
