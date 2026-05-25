import React, { useEffect, useRef, useState } from 'react'
import StudentLayout from '../../components/student/StudentLayout'
import IDCard from '../../components/common/IDCard'
import { getMyStudent, getStudentCard } from '../../api'
import { getAuth } from '../../utils/session'
import html2canvas from 'html2canvas'

export default function StudentCardPage() {
    const { token } = getAuth()
    const [card, setCard] = useState(null)
    const [schoolName, setSchoolName] = useState('SCHOOL NAME')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const cardRef = useRef(null)

    useEffect(() => {
        async function load() {
            setLoading(true)
            try {
                const me = await getMyStudent(token)
                const c = await getStudentCard(me._id, token)
                setCard(c)
                setSchoolName(c.schoolName || 'SCHOOL NAME')
                setError('')
            } catch (e) {
                setError(e.message || 'No card available')
            }
            setLoading(false)
        }
        load()
    }, [])

    async function downloadCard() {
        try {
            if (!cardRef.current) return
            const canvas = await html2canvas(cardRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
            const url = canvas.toDataURL('image/png')
            const a = document.createElement('a')
            a.href = url
            a.download = `IDCard_${card && card.idCode ? card.idCode : 'student'}.png`
            a.click()
        } catch (e) {
            console.error(e)
        }
    }

    return (
        <StudentLayout>
            <div className="student-page">
                <h2>Student ID Card</h2>
                {loading && <div>Loading...</div>}
                {!loading && error && <div style={{ color: 'crimson' }}>{error}</div>}
                {!loading && card && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 12, gap: 12 }}>
                        <div ref={cardRef}>
                            <IDCard card={{ ...card, schoolName }} />
                        </div>
                        <button className="btn" onClick={downloadCard}>Download ID Card</button>
                    </div>
                )}
            </div>
        </StudentLayout>
    )
}
