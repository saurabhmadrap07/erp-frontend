import React, { useEffect, useState } from 'react'
import StudentLayout from '../../components/student/StudentLayout'
import { getAuth } from '../../utils/session'
import { getParentAccessCode } from '../../api'
import { toast } from 'react-toastify'

export default function StudentParents() {
    const [code, setCode] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        async function load() {
            setLoading(true)
            try {
                const { token } = getAuth()
                const { code } = await getParentAccessCode(token)
                setCode(code)
            } catch (e) {
                toast.error(e.message || 'Failed to load code')
            } finally { setLoading(false) }
        }
        load()
    }, [])

    function copyCode() {
        try {
            navigator.clipboard.writeText(code)
            toast.success('Code copied')
        } catch (e) {
            toast.info('Copy manually')
        }
    }

    return (
        <StudentLayout>
            <div style={{ padding: 20 }}>
                <h2>Parent Access</h2>
                <p style={{ color: '#374151', marginTop: 6 }}>Share this code with your parent/guardian. They can enter it once in their panel to view your progress, attendance and fee status.</p>
                <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 10, border: '2px dashed #111827', padding: '12px 16px', borderRadius: 10, background: '#fff' }}>
                    <span style={{ fontWeight: 800, letterSpacing: 2, fontSize: 20 }}>{loading ? '...' : (code || '------')}</span>
                    <button onClick={copyCode} disabled={!code} style={{ padding: '8px 12px', borderRadius: 8, border: '2px solid #111827', background: '#f9fafb' }}>Copy</button>
                </div>
                <div style={{ marginTop: 14, fontSize: 13, color: '#6b7280' }}>Note: Keep this code private. You can request admin to reset if needed.</div>
            </div>
        </StudentLayout>
    )
}
