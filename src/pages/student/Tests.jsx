import React, { useEffect, useState, useRef } from 'react'
import StudentLayout from '../../components/student/StudentLayout'
import { getMyTests, getMyStudent } from '../../api'
import { getAuth } from '../../utils/session'
import { useNavigate } from 'react-router-dom'

function Timer({ seconds, onFinish }) {
    const [s, setS] = useState(seconds)
    const ref = useRef(null)
    useEffect(() => {
        setS(seconds)
        if (ref.current) clearInterval(ref.current)
        if (seconds && seconds > 0) {
            ref.current = setInterval(() => setS(prev => {
                if (prev <= 1) {
                    clearInterval(ref.current)
                    if (onFinish) onFinish()
                    return 0
                }
                return prev - 1
            }), 1000)
        }
        return () => { if (ref.current) clearInterval(ref.current) }
    }, [seconds])
    const mm = Math.floor((s || 0) / 60).toString().padStart(2, '0')
    const ss = Math.floor((s || 0) % 60).toString().padStart(2, '0')
    return <div style={{ fontWeight: 700 }}>{mm}:{ss}</div>
}

export default function StudentTests() {
    const [tests, setTests] = useState([])
    const [loading, setLoading] = useState(true)
    const [modal, setModal] = useState({ open: false, test: null })
    const [agreed, setAgreed] = useState(false)
    const [candidate, setCandidate] = useState({ name: '', roll: '', email: '' })
    const [running, setRunning] = useState({ testId: null, secondsLeft: 0 })

    const [query, setQuery] = useState('')

    async function load() {
        setLoading(true)
        try {
            const { token } = getAuth()
            const data = await getMyTests(token)
            const items = data || []
            setTests(items)
            // don't fetch per-test questions here to avoid extra protected requests
        } catch (e) {
            console.error('Failed to load tests', e)
        } finally { setLoading(false) }
    }

    useEffect(() => { load() }, [])

    async function openInstructions(test) {
        // Open modal and attempt to auto-fill candidate details from the student's profile
        setAgreed(true)
        setCandidate({ name: '', roll: '', email: '' })
        setModal({ open: true, test })
        try {
            const { token } = getAuth()
            let stu = null
            try { stu = await getMyStudent(token) } catch (e) { stu = null }
            if (stu) {
                setCandidate({ name: stu.name || '', roll: stu.rollNo || stu.roll || '', email: stu.email || '' })
            }
        } catch (e) {
            // ignore — we'll just leave the fields empty
            console.warn('Failed to auto-fill student details for test enrollment', e)
        }
    }

    const navigate = useNavigate()

    function startTest(test) {
        setModal({ open: false, test: null })
        if (test.type === 'google_form' && test.link) {
            try { window.open(test.link, '_blank') } catch (e) { }
            return
        }
        navigate(`/student/tests/${test._id}/start`, { state: { candidate, test } })
    }

    function handleTimerFinish() {
        setRunning({ testId: null, secondsLeft: 0 })
        alert('Time is up. Please ensure you have submitted your answers in the opened form (if applicable).')
    }

    return (
        <StudentLayout>
            <div className="tests-page" style={{ minHeight: '100vh', padding: '20px 16px', boxSizing: 'border-box', width: '100%', height: '100%', marginLeft: 0, paddingLeft: 24, transform: 'none' }}>
                <style>{`
                    .tests-page { background: #fff; }
                    .ts-header { text-align: center; margin-top: 6px; }
                    .ts-title { font-size: 38px; font-weight: 800; background: linear-gradient(90deg,#ff5fa2,#f59e0b); -webkit-background-clip: text; background-clip: text; color: transparent; }
                    /* make search and grid span full main content width */
                    .ts-search { max-width: 100%; width: 100%; margin: 18px 0; display:flex; gap:8px; align-items:center; justify-content: flex-start; }
                    .ts-search input { flex:1 1 auto; width: auto; padding:12px 16px; border-radius:28px; border:2px solid #e9d5ff; outline:none; box-shadow:none; max-width: none; }
                    .ts-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(300px,1fr)); gap:22px; margin-top: 22px; width: 100%; }
                    .ts-card { background:#fff; border-radius:8px; padding:18px; box-shadow: 0 8px 18px rgba(15,23,42,0.06); border-top:4px solid rgba(124,58,237,0.16); }
                    .ts-card h3 { margin:0; font-size:20px; color:#2b0640; font-weight:800; }
                    .ts-meta { margin-top:10px; font-size:13px; color:#374151; }
                    .ts-price { color:#059669; font-weight:700; }
                    .ts-enroll { margin-top:14px; padding:10px 14px; border-radius:8px; border:none; cursor:pointer; background: linear-gradient(90deg,#7c3aed,#ff5fa2); color:#fff; font-weight:700; box-shadow: 0 6px 18px rgba(124,58,237,0.16); }
                    .ts-card-footer { display:flex; justify-content:space-between; align-items:center; margin-top:12px; }

                    /* Modal improvements */
                    .ts-modal-backdrop { position: fixed; left: 0; top: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; padding:16px; z-index:1000; }
                    .ts-modal { width: 860px; max-width: 98%; background: #fff; border-radius: 10px; display:flex; overflow:hidden; box-shadow: 0 12px 30px rgba(2,6,23,0.2); }
                    .ts-modal-left { width: 320px; background: linear-gradient(180deg,#0ea5e9,#7c3aed); color: #fff; padding: 24px; display:flex; flex-direction:column; gap:14px; }
                    .ts-modal-left h3 { margin: 0; font-size: 18px; }
                    .ts-modal-left .instruction { background: rgba(255,255,255,0.06); padding: 12px; border-radius: 8px; }
                    .ts-modal-right { flex: 1; padding: 24px; display:flex; flex-direction:column; }
                    .ts-form-grid { margin-top: 14px; display:grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                    .ts-form-full { grid-column: 1 / -1; }
                    .ts-input { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #e5e7eb; font-size: 14px; }
                    .ts-checkbox { display:flex; align-items:center; gap:10px; margin-top:12px; }
                    .ts-modal-actions { margin-top:auto; display:flex; justify-content:flex-end; gap:12px; padding-top:8px; }
                    .ts-btn-cancel { background:transparent; border:none; color:#374151; padding:8px 12px; border-radius:8px; cursor:pointer; }
                    .ts-btn-continue { padding:8px 14px; background:#111827; color:#fff; border:none; border-radius:8px; cursor:pointer; box-shadow:0 6px 18px rgba(0,0,0,0.08); }
                    .ts-btn-continue[disabled] { opacity:0.6; cursor:not-allowed; box-shadow:none; }
                `}</style>

                <div style={{ width: 'calc(100% + 6cm)', marginLeft: '-6cm', padding: '0 24px', boxSizing: 'border-box' }}>
                    <div className="ts-header">
                        <div className="ts-title">Available Test Series</div>
                        <div style={{ marginTop: 8, color: '#475569' }}></div>
                    </div>

                    <div className="ts-search">
                        <input placeholder="Search by name, price, duration, or added by..." value={query} onChange={e => setQuery(e.target.value)} />
                        <button onClick={() => load()} style={{ padding: '10px 14px', borderRadius: 10, border: 'none', background: '#6d28d9', color: '#fff' }}>Refresh</button>
                    </div>

                    <div className="ts-grid">
                        {loading && <div style={{ gridColumn: '1/-1', color: '#6b7280' }}>Loading…</div>}
                        {!loading && tests.filter(t => {
                            const q = query.trim().toLowerCase()
                            if (!q) return true
                            return (t.title || '').toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q) || (String(t.durationMinutes || '')).includes(q)
                        }).map(t => (
                            <div key={t._id} className="ts-card">
                                <h3>{t.title}</h3>
                                <div className="ts-meta">
                                    <div><strong>Subject:</strong> {(() => {
                                        const subj = t.subject
                                        if (!subj) return '—'
                                        if (typeof subj === 'string') return subj
                                        // when subject is stored as an object, prefer common name-like fields
                                        return subj.name || subj.title || subj.label || JSON.stringify(subj)
                                    })()}</div>
                                    <div style={{ marginTop: 6 }}><strong>Duration:</strong> {t.durationMinutes ? `${t.durationMinutes} min` : '—'}</div>
                                    <div style={{ marginTop: 6 }}><strong>Price:</strong> <span className="ts-price">{t.price ? `₹${t.price}` : 'Free'}</span></div>
                                    <div style={{ marginTop: 6 }}><strong>Total Questions:</strong> {t.totalQuestions !== undefined ? t.totalQuestions : (t.questions ? t.questions.length : '—')}</div>
                                    <div style={{ marginTop: 8, fontStyle: 'italic' }}>Added by: {t.createdBy && t.createdBy.name ? t.createdBy.name : 'Admin User'}</div>
                                </div>

                                <div className="ts-card-footer">
                                    <div style={{ color: '#6b7280', fontSize: 13 }}>{t.start ? new Date(t.start).toLocaleDateString() : ''}</div>
                                    <button className="ts-enroll" onClick={() => openInstructions(t)}>Enroll</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {modal.open && modal.test && (
                        <div className="ts-modal-backdrop">
                            <div className="ts-modal">
                                <div className="ts-modal-left">
                                    <h3>Test Instructions</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
                                        <div className="instruction">
                                            <div style={{ fontWeight: 700 }}>1. Maintain decorum</div>
                                            <div style={{ fontSize: 13, opacity: 0.95 }}>Please maintain test decorum during the session.</div>
                                        </div>
                                        <div className="instruction">
                                            <div style={{ fontWeight: 700 }}>2. No malicious activity</div>
                                            <div style={{ fontSize: 13, opacity: 0.95 }}>Don't attempt to cheat or use unauthorised resources.</div>
                                        </div>
                                        <div className="instruction">
                                            <div style={{ fontWeight: 700 }}>3. Complete all questions</div>
                                            <div style={{ fontSize: 13, opacity: 0.95 }}>Try to answer every question before submitting.</div>
                                        </div>
                                        <div className="instruction">
                                            <div style={{ fontWeight: 700 }}>4. Respect time limits</div>
                                            <div style={{ fontSize: 13, opacity: 0.95 }}>Keep an eye on the timer; the test will auto-submit when time expires.</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="ts-modal-right">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3 style={{ margin: 0 }}>{modal.test.title}</h3>
                                        <div style={{ color: '#6b7280' }}>{modal.test.type}</div>
                                    </div>
                                    <div style={{ marginTop: 10, color: '#374151' }}>{modal.test.description || 'Please read the rules and enter your details.'}</div>

                                    <div className="ts-form-grid">
                                        <div>
                                            <label style={{ fontSize: 13, color: '#374151' }}>Name</label>
                                            <input className="ts-input" value={candidate.name} onChange={e => setCandidate(c => ({ ...c, name: e.target.value }))} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 13, color: '#374151' }}>Roll No</label>
                                            <input className="ts-input" value={candidate.roll} onChange={e => setCandidate(c => ({ ...c, roll: e.target.value }))} />
                                        </div>
                                        <div className="ts-form-full">
                                            <label style={{ fontSize: 13, color: '#374151' }}>Email</label>
                                            <input className="ts-input" value={candidate.email} onChange={e => setCandidate(c => ({ ...c, email: e.target.value }))} />
                                        </div>
                                    </div>

                                    <div className="ts-checkbox">
                                        <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
                                        <span>I agree to the rules and will not engage in misconduct.</span>
                                    </div>

                                    <div className="ts-modal-actions">
                                        <button className="ts-btn-cancel" onClick={() => setModal({ open: false, test: null })}>Cancel</button>
                                        <button className="ts-btn-continue" disabled={!agreed || !candidate.name || !candidate.email} onClick={() => startTest(modal.test)}>Continue</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </StudentLayout>
    )
}
