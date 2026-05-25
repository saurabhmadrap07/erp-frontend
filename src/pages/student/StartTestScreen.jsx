import React from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import StudentLayout from '../../components/student/StudentLayout'

export default function StartTestScreen() {
    const { id } = useParams()
    const location = useLocation()
    const nav = useNavigate()
    const candidate = (location && location.state && location.state.candidate) ? location.state.candidate : { name: '', roll: '', email: '' }
    const test = (location && location.state && location.state.test) ? location.state.test : null

    function begin() {
        // Ask for explicit confirmation before starting the test
        try {
            const ok = window.confirm('Are you ready to give the test? Click OK to start.')
            if (!ok) return
        } catch (e) {
            // fallback if confirm is suppressed
        }
        // navigate to actual test page and indicate started=true
        nav(`/student/tests/${id}`, { state: { candidate, started: true } })
    }

    // Fullscreen colourful instruction screen
    return (
        <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#7c3aed 0%,#06b6d4 100%)', color: '#fff' }}>
            <div style={{ width: '90%', maxWidth: 1100, background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))', borderRadius: 14, padding: 28, boxShadow: '0 12px 40px rgba(2,6,23,0.4)', display: 'flex', gap: 24, alignItems: 'stretch' }}>
                <div style={{ flex: '1 1 420px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <h1 style={{ margin: 0, fontSize: 34 }}>{test ? test.title : 'Your Test'}</h1>
                    <div style={{ opacity: 0.95, fontSize: 16 }}>Please read the instructions carefully. Once you begin the test, the timer will start and you will not be able to return to this screen.</div>

                    <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div style={{ background: 'rgba(255,255,255,0.06)', padding: 12, borderRadius: 8 }}>
                            <div style={{ fontWeight: 700 }}>Candidate</div>
                            <div style={{ marginTop: 6 }}>{candidate.name || '—'}</div>
                            <div style={{ marginTop: 2 }}>{candidate.roll || ''}</div>
                            <div style={{ marginTop: 2 }}>{candidate.email || ''}</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.06)', padding: 12, borderRadius: 8 }}>
                            <div style={{ fontWeight: 700 }}>Test Info</div>
                            <div style={{ marginTop: 6 }}>{test ? (test.durationMinutes ? `${test.durationMinutes} minutes` : 'Duration not set') : 'N/A'}</div>
                            <div style={{ marginTop: 6 }}>{test && test.description ? test.description : ''}</div>
                        </div>
                    </div>

                    <div style={{ marginTop: 'auto', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                        <button onClick={() => nav('/student/tests')} style={{ padding: '10px 14px', borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.12)', color: '#fff' }}>Cancel</button>
                        <button onClick={begin} style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: '#fff', color: '#0b1220', fontWeight: 800 }}>Begin Test</button>
                    </div>
                </div>

                <div style={{ width: 420, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'stretch' }}>
                    <div style={{ background: 'rgba(0,0,0,0.12)', padding: 18, borderRadius: 10 }}>
                        <h3 style={{ margin: 0 }}>Instructions</h3>
                        <ol style={{ marginTop: 8 }}>
                            <li>Do not refresh or close the browser during the test.</li>
                            <li>Leaving the tab may forfeit your attempt.</li>
                            <li>MCQs will be auto-graded. Subjective answers will be sent for review.</li>
                            <li>Make sure you submit before time ends. There is a short finalizing window.</li>
                        </ol>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.04)', padding: 12, borderRadius: 10 }}>
                        <h4 style={{ margin: 0 }}>Tips</h4>
                        <ul style={{ marginTop: 8 }}>
                            <li>Use a stable internet connection.</li>
                            <li>Type answers in the provided boxes for subjective questions.</li>
                            <li>Contact admin if you face issues.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}
