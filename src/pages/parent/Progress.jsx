import React, { useEffect, useMemo, useState } from 'react'
import ParentLayout from '../../components/parent/ParentLayout'
import { getAuth } from '../../utils/session'
import { getMyMarks, getTestResultsByStudent } from '../../api'

export default function ParentProgress() {
    const [linked, setLinked] = useState(null)
    const [marks, setMarks] = useState([])
    const [loading, setLoading] = useState(false)
    const [testResults, setTestResults] = useState([])
    const [loadingTests, setLoadingTests] = useState(false)

    useEffect(() => {
        try {
            const v = localStorage.getItem('parent_linked_student')
            if (v) setLinked(JSON.parse(v))
        } catch (e) { }
    }, [])

    useEffect(() => {
        async function load() {
            if (!linked) return
            setLoading(true)
            try {
                const { token } = getAuth()
                const items = await getMyMarks(token, linked.id)
                setMarks(items)
            } catch (e) { /* ignore */ } finally { setLoading(false) }
        }
        load()
    }, [linked])

    useEffect(() => {
        async function loadTests() {
            if (!linked) return
            setLoadingTests(true)
            try {
                const { token } = getAuth()
                const items = await getTestResultsByStudent(linked.id, token)
                setTestResults(items || [])
            } catch (e) { setTestResults([]) } finally { setLoadingTests(false) }
        }
        loadTests()
    }, [linked])

    const displayedResults = useMemo(() => {
        const list = testResults || []
        // Deduplicate by test title and keep the latest
        const map = new Map()
        list.forEach(r => {
            const title = ((r.raw && r.raw.testTitle) || r.test || '').toString().trim().toLowerCase()
            const key = title || (r.testId || r._id || '')
            const ts = new Date(r.submittedAt || r.createdAt || 0).getTime()
            const prev = map.get(key)
            if (!prev || ts > prev.ts) map.set(key, { r, ts })
        })
        return Array.from(map.values()).map(v => v.r)
    }, [testResults])

    return (
        <ParentLayout>
            <div className="parent-page">
                <h2>Student Progress</h2>
                {!linked && (
                    <div style={{ marginTop: 12, padding: 14, border: '1px solid #334155', borderRadius: 10, background: '#0f172a' }}>
                        <div style={{ color: '#e2e8f0' }}>No student linked. Link a student using the access code.</div>
                        <a href="/parent/link-student" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/parent/link-student'); window.dispatchEvent(new PopStateEvent('popstate')) }} className="btn-primary" style={{ marginTop: 10, display: 'inline-block' }}>Link Student</a>
                    </div>
                )}
                {linked && (
                    <div style={{ marginTop: 12 }}>
                        <div style={{ color: '#94a3b8', marginBottom: 8 }}>Showing marks for: <strong style={{ color: '#e2e8f0' }}>{linked.name}</strong> (Class {linked.class}{linked.section ? `-${linked.section}` : ''})</div>
                        {loading ? <div>Loading...</div> : (
                            <div style={{ display: 'grid', gap: 10 }}>
                                {marks.length === 0 && <div style={{ color: '#64748b' }}>No marks available.</div>}
                                {marks.map((m, i) => (
                                    <div key={i} style={{ border: '1px solid #334155', borderRadius: 10, padding: 12, background: '#0b1220' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ color: '#e2e8f0', fontWeight: 700 }}>{m.subject}</div>
                                            <div style={{ color: '#e2e8f0', fontWeight: 700 }}>{m.obtained} / {m.total || 100}</div>
                                        </div>
                                        <div style={{ color: '#94a3b8', marginTop: 6 }}>Term: {m.term || '-'}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div style={{ marginTop: 20 }}>
                            <div style={{ color: '#94a3b8', marginBottom: 8 }}>Test Series Results</div>
                            {loadingTests ? <div>Loading...</div> : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 12 }}>
                                    {displayedResults.length === 0 && <div style={{ color: '#64748b' }}>No test results yet.</div>}
                                    {displayedResults.map(r => {
                                        const answers = (r.raw && Array.isArray(r.raw.answers)) ? r.raw.answers : null
                                        const correctCount = (r.raw && typeof r.raw.correct === 'number') ? r.raw.correct : (answers ? answers.filter(a => a && a.correct).length : 0)
                                        const wrongCount = (r.raw && typeof r.raw.wrong === 'number') ? r.raw.wrong : (answers ? answers.filter(a => a && a.correct === false && (a.given !== '' && a.given != null)).length : 0)
                                        const skippedCount = (r.raw && typeof r.raw.skipped === 'number') ? r.raw.skipped : (answers ? answers.filter(a => a && (a.given === '' || a.given == null)).length : 0)
                                        return (
                                            <div key={r._id} style={{ background: '#0b1220', borderRadius: 12, padding: 16, border: '1px solid #334155' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ fontWeight: 800, color: '#e2e8f0', fontSize: 16 }}>{(r.raw && r.raw.testTitle) || r.test || 'Test'}</div>
                                                    <div style={{ color: '#94a3b8', fontSize: 12 }}>{new Date(r.submittedAt || r.createdAt || Date.now()).toLocaleString()}</div>
                                                </div>
                                                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                                                    <span style={{ background: '#0f172a', color: '#a5b4fc', border: '1px solid #334155', borderRadius: 20, padding: '6px 10px', fontSize: 12 }}>Subject: {r.class || (r.raw && r.raw.subject) || '—'}</span>
                                                    {r.raw && r.raw.duration ? <span style={{ background: '#0f172a', color: '#7dd3fc', border: '1px solid #334155', borderRadius: 20, padding: '6px 10px', fontSize: 12 }}>Duration: {r.raw.duration}</span> : null}
                                                    <span style={{ background: '#0f172a', color: '#fde68a', border: '1px solid #334155', borderRadius: 20, padding: '6px 10px', fontSize: 12 }}>Total Marks: {r.total != null ? r.total : '—'}</span>
                                                </div>
                                                <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                                    <div style={{ color: '#22c55e', fontWeight: 800 }}>Score: {r.score != null ? r.score : 0}</div>
                                                    <div style={{ color: '#60a5fa', fontWeight: 800 }}>Percentage: {r.percentage != null ? r.percentage + '%' : '0%'}</div>
                                                </div>
                                                <div style={{ marginTop: 10, color: '#94a3b8', fontWeight: 700 }}>Summary</div>
                                                <div style={{ marginTop: 6, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                                    <span style={{ background: '#052e16', color: '#22c55e', border: '1px solid #14532d', borderRadius: 8, padding: '6px 10px', fontSize: 12 }}>Correct: {correctCount}</span>
                                                    <span style={{ background: '#3f1d1d', color: '#fca5a5', border: '1px solid #7f1d1d', borderRadius: 8, padding: '6px 10px', fontSize: 12 }}>Wrong: {wrongCount}</span>
                                                    <span style={{ background: '#0f172a', color: '#cbd5e1', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', fontSize: 12 }}>Skipped: {skippedCount}</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </ParentLayout>
    )
}
