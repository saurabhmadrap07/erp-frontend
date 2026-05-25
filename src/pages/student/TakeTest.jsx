import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import StudentLayout from '../../components/student/StudentLayout'
import { getAuth } from '../../utils/session'
import { getTestQuestions, submitTest, getMyTests, forfeitTest } from '../../api'
import { toast } from 'react-toastify'

function Timer({ seconds }) {
    const [s, setS] = useState(seconds)
    const ref = useRef(null)
    useEffect(() => {
        setS(seconds)
        if (ref.current) clearInterval(ref.current)
        if (seconds && seconds > 0) {
            ref.current = setInterval(() => setS(prev => {
                if (prev <= 1) {
                    clearInterval(ref.current)
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

export default function TakeTest() {
    const { id } = useParams()
    const nav = useNavigate()
    const [questions, setQuestions] = useState([])
    const [loading, setLoading] = useState(true)
    const [answers, setAnswers] = useState({})
    const [secondsLeft, setSecondsLeft] = useState(0)
    const [submitting, setSubmitting] = useState(false)
    const [forfeited, setForfeited] = useState(false)
    const [finalizing, setFinalizing] = useState(false)
    const [finalSeconds, setFinalSeconds] = useState(0)
    const [showTenWarning, setShowTenWarning] = useState(false)
    const [submitError, setSubmitError] = useState('')
    const token = getAuth().token
    const [testInfo, setTestInfo] = useState(null)
    const location = useLocation()
    const candidate = (location && location.state && location.state.candidate) ? location.state.candidate : null
    const started = (location && location.state && location.state.started) ? true : false
    const isSubmittedRef = useRef(false)

    useEffect(() => { load() }, [id])

    async function load() {
        setLoading(true)
        try {
            if (!token) throw new Error('Not authenticated')
            // load test meta from my tests
            const my = await getMyTests(token)
            const t = (my || []).find(x => String(x._id) === String(id))
            setTestInfo(t || null)
            // Ensure this test was started from the full-screen start page
            const started = location && location.state && location.state.started
            if (!started) {
                // redirect back to tests list if not launched properly
                try { nav('/student/tests') } catch (e) { }
                return
            }
            if (t) {
                // compute remaining seconds. If student came from the StartTest screen (started=true)
                // start a fresh timer based on durationMinutes so the timer is visible immediately.
                const now = new Date()
                const durMs = (Number(t.durationMinutes) || 0) * 60000
                // prefer a fresh session timer when the user clicked Begin Test
                if (started) {
                    if (t.durationMinutes) {
                        setSecondsLeft(Math.ceil(durMs / 1000))
                        console.debug('TakeTest: started from instruction screen, using durationMinutes=', t.durationMinutes)
                    } else {
                        setSecondsLeft(0)
                    }
                } else {
                    // when not started from instruction page, align with server start time if present
                    if (t.start) {
                        const start = new Date(t.start)
                        const end = new Date(start.getTime() + durMs)
                        const remaining = Math.ceil((end.getTime() - now.getTime()) / 1000)
                        setSecondsLeft(remaining > 0 ? remaining : 0)
                        console.debug('TakeTest: test.start=', t.start, 'durationMinutes=', t.durationMinutes, 'computedRemainingSec=', remaining, 'now=', now.toISOString())
                        if (remaining <= 0 && !started) {
                            alert('Test has ended')
                            try { nav('/student/tests') } catch (e) { }
                            return
                        }
                    } else if (t.durationMinutes) {
                        setSecondsLeft(Math.floor(Number(t.durationMinutes) * 60))
                        console.debug('TakeTest: no start; durationMinutes=', t.durationMinutes)
                    }
                }
            }

            const qs = await getTestQuestions(id, token, { started })
            setQuestions(qs || [])
        } catch (e) {
            console.error('Failed to load test', e)
            alert(e && e.message ? e.message : 'Failed to load test')
            nav('/student/tests')
        } finally { setLoading(false) }
    }

    useEffect(() => {
        if (!secondsLeft) return
        let iv = null
        iv = setInterval(() => setSecondsLeft(s => {
            if (s <= 1) {
                clearInterval(iv)
                // start finalizing window: allow 2s for manual submit, then auto-submit
                setFinalizing(true)
                setFinalSeconds(2)
                return 0
            }
            // show 10s warning
            if (s === 11) setShowTenWarning(true)
            return s - 1
        }), 1000)
        return () => { if (iv) clearInterval(iv) }
    }, [secondsLeft])

    // Toggle UI blocking class on student app to prevent clicking other parts
    useEffect(() => {
        try {
            const app = document.querySelector('.student-app')
            if (!app) return
            if ((secondsLeft > 0) || finalizing) app.classList.add('exam-active')
            else app.classList.remove('exam-active')
            return () => { if (app) app.classList.remove('exam-active') }
        } catch (e) { }
    }, [secondsLeft, finalizing])

    // Forfeit when student hides tab or navigates away — warn on unload and forfeit on visibility change
    useEffect(() => {
        if (!token) return

        const onBeforeUnload = (e) => {
            if ((secondsLeft > 0) && !forfeited) {
                const msg = 'Leaving the test will forfeit your attempt.'
                e.returnValue = msg
                return msg
            }
            return undefined
        }

        const onVisibility = () => {
            if (document.hidden && (secondsLeft > 0) && !forfeited) {
                // mark forfeited and navigate away
                setForfeited(true)
                    ; (async () => {
                        try {
                            await forfeitTest(id, token)
                        } catch (e) { /* ignore */ }
                        alert('You left the test — your attempt has been forfeited.')
                        nav('/student/results')
                    })()
            }
        }

        window.addEventListener('beforeunload', onBeforeUnload)
        document.addEventListener('visibilitychange', onVisibility)
        return () => {
            window.removeEventListener('beforeunload', onBeforeUnload)
            document.removeEventListener('visibilitychange', onVisibility)
        }
    }, [secondsLeft, token, id, forfeited, nav])

    // final countdown handler
    useEffect(() => {
        if (!finalizing) return
        if (finalSeconds <= 0) {
            // auto submit
            (async () => { await handleAutoSubmit() })()
            return
        }
        const fv = setInterval(() => setFinalSeconds(s => {
            if (s <= 1) { clearInterval(fv); (async () => { await handleAutoSubmit() })(); return 0 }
            return s - 1
        }), 1000)
        return () => clearInterval(fv)
    }, [finalizing, finalSeconds])

    function pick(qid, val) {
        setAnswers(a => ({ ...a, [qid]: val }))
    }

    async function handleAutoSubmit() {
        if (isSubmittedRef.current) return
        if (submitting) return
        console.debug('TakeTest: auto-submit invoked at', new Date().toISOString())
        toast.info('Auto-submitting test...')
        await doSubmit(true)
    }

    async function doSubmit(isAuto = false) {
        if (isSubmittedRef.current) return
        isSubmittedRef.current = true
        setSubmitting(true)
        setSubmitError('')
        const ts = new Date().toISOString()
        console.debug('TakeTest: submit attempt', { testId: id, isAuto, timestamp: ts })
        toast.info('Submitting test...')
        try {
            const payload = Object.keys(answers).map(qid => ({ questionId: qid, answer: answers[qid] }))
            // include candidate info in payload (backend ignores extra fields but it is useful to keep here)
            const body = { answers: payload }
            if (isAuto) body.isAuto = true
            if (started) body.isStarted = true
            if (candidate) body.candidate = candidate
            const res = await submitTest(id, body, token)
            console.debug('TakeTest: submit response', res)
            if (isAuto) toast.success('Test submitted and Time over')
            else toast.success('Test submitted')
            // navigate to results without blocking popup
            nav('/student/results')
        } catch (e) {
            console.error('Submit failed', e)
            toast.error(e && e.message ? e.message : 'Failed to submit test')
            setSubmitError(e && e.message ? e.message : 'Failed to submit test')
        } finally { setSubmitting(false) }
    }

    if (loading) return <StudentLayout><div style={{ padding: 20 }}>Loading test…</div></StudentLayout>

    return (
        <StudentLayout>
            <div style={{ padding: 20 }}>
                <style>{`
                    .mcq-card { padding:16px; border-radius:10px; background:#fff; margin-bottom:14px; border:2px solid #e6f4ea; box-shadow: 0 8px 24px rgba(2,6,23,0.04); }
                    .mcq-question { font-weight:800; color:#0f766e; margin-bottom:10px; }
                    .mcq-qimage { margin-bottom:10px; max-width:100%; height:auto; max-height:380px; border-radius:8px; border:2px solid #3b82f6; object-fit:contain; display:block; }
                    .mcq-options { display:flex; flex-direction:column; gap:12px; margin-top:8px; }
                    .mcq-option { display:flex; align-items:center; gap:14px; padding:12px; border-radius:10px; border:2px solid #eef2f7; background:#ffffff; cursor:pointer; transition: box-shadow .12s, border-color .12s, background .12s; }
                    .mcq-option:hover { box-shadow: 0 6px 18px rgba(2,6,23,0.06); }
                    .mcq-option.selected { border-color:#22c55e; background:#f0fdf4; }
                    .mcq-radio { width:18px; height:18px; accent-color:#10b981; flex:0 0 auto; }
                    .mcq-text { flex:1; font-weight:600; color:#111827; font-size:15px; }
                    .mcq-opt-image { margin-top:8px; max-width:100%; height:auto; max-height:260px; border-radius:8px; border:2px solid #f59e0b; object-fit:contain; display:block; }
                    .mcq-essay { padding:12px; border-radius:10px; border:2px solid #e5e7eb; background:#fafafa; }
                    .exam-active .sidebar, .exam-active .student-nav { pointer-events:none; opacity:0.6 }
                `}</style>
                <h2>Test: {testInfo ? testInfo.title : 'Test'}</h2>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ color: '#6b7280' }}>
                        {testInfo && testInfo.description}
                        {candidate && (
                            <div style={{ marginTop: 8, background: '#f3f4f6', padding: 8, borderRadius: 6 }}>
                                <div style={{ fontSize: 13, fontWeight: 700 }}>Candidate</div>
                                <div style={{ fontSize: 13 }}>{candidate.name} • {candidate.roll} • {candidate.email}</div>
                            </div>
                        )}
                    </div>
                    <div>{secondsLeft > 0 ? <Timer seconds={secondsLeft} /> : <div>Time up</div>}</div>
                </div>

                <div style={{ marginTop: 18 }}>
                    {questions.length === 0 && <p>No questions available.</p>}
                    {questions.map((q, idx) => (
                        <div
                            key={q._id}
                            style={{
                                padding: 16,
                                borderRadius: 10,
                                background: '#fff',
                                marginBottom: 14,
                                border: '2px solid #22c55e',
                                boxShadow: '0 8px 24px rgba(2,6,23,0.06)'
                            }}
                        >
                            {q.questionImage ? (
                                <div>
                                    <img
                                        src={`${String(q.questionImage).startsWith('http') ? q.questionImage : `${import.meta.env.VITE_API_BASE || 'http://localhost:4000'}${q.questionImage}`}`}
                                        alt={`Q${idx + 1}`}
                                        className="mcq-qimage"
                                    />
                                </div>
                            ) : null}
                            <div className="mcq-question">{idx + 1}. {q.questionText}</div>
                            <div>
                                {q.options && q.options.length > 0 ? (
                                    <div className="mcq-options">
                                        {q.options.map((opt, i) => {
                                            const img = (q.optionImages && q.optionImages[i]) ? q.optionImages[i] : ''
                                            const imgUrl = img ? (String(img).startsWith('http') ? img : `${import.meta.env.VITE_API_BASE || 'http://localhost:4000'}${img}`) : ''
                                            const checked = answers[q._id] === opt
                                            return (
                                                <label key={i} className={`mcq-option ${checked ? 'selected' : ''}`}>
                                                    <input className="mcq-radio" type="radio" name={q._id} value={opt} checked={checked} onChange={() => pick(q._id, opt)} />
                                                    <div className="mcq-text">
                                                        <div>{opt}</div>
                                                        {imgUrl ? (
                                                            <img src={imgUrl} alt={`opt-${i}`} className="mcq-opt-image" />
                                                        ) : null}
                                                    </div>
                                                </label>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <div className="mcq-essay">
                                        <label style={{ fontWeight: 700, display: 'block', marginBottom: 6 }}>Your Answer</label>
                                        <textarea value={answers[q._id] || ''} onChange={e => pick(q._id, e.target.value)} rows={6} style={{ width: '100%', padding: 10, borderRadius: 8, border: '2px solid #93c5fd' }} placeholder="Write your answer here..." />
                                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>{(answers[q._id] || '').length} characters</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button onClick={() => doSubmit(false)} disabled={submitting} style={{ padding: '8px 12px', background: '#111827', color: '#fff' }}>{submitting ? 'Submitting...' : 'Submit Now'}</button>
                        <button onClick={() => nav('/student/tests')} disabled={submitting || (secondsLeft > 0 && !forfeited)} style={{ opacity: (submitting || (secondsLeft > 0 && !forfeited)) ? 0.5 : 1 }}>Cancel</button>
                        {submitError ? <div style={{ color: '#b91c1c', marginLeft: 12 }}>{submitError}</div> : null}
                    </div>
                </div>

                {/* finalizing overlay: 2s window to manually submit before auto-submit */}
                {finalizing && (
                    <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 520, maxWidth: '95%', background: '#fff', padding: 18, borderRadius: 10, textAlign: 'center' }}>
                            <h3 style={{ marginTop: 0 }}>Time has ended — finalising</h3>
                            <p style={{ color: '#6b7280' }}>You have <strong style={{ color: '#ef4444' }}>{finalSeconds}</strong> seconds to manually submit if you want. After that the system will submit automatically.</p>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 12 }}>
                                <button onClick={() => doSubmit(false)} disabled={submitting} style={{ padding: '10px 14px', background: '#111827', color: '#fff', borderRadius: 8 }}>{submitting ? 'Submitting...' : 'Submit Now'}</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </StudentLayout>
    )
}
