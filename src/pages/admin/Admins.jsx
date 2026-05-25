import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import '../../pages/AdminPanel.css'
import { getAdmins, createAdmin, deleteAdmin, blockAdmin, updateAdmin, getProfile } from '../../api'
import { getAuth } from '../../utils/session'

export default function Admins() {
    const [loading, setLoading] = useState(false)
    const [admins, setAdmins] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [showAdd, setShowAdd] = useState(false)
    const [adding, setAdding] = useState(false)
    const [newAdmin, setNewAdmin] = useState({ name: '', email: '', contact: '', address: '', designation: '' })

    const [currentAdminId, setCurrentAdminId] = useState(null)

    async function load(q = '') {
        setLoading(true)
        try {
            const { token } = getAuth()
            const profile = await getProfile(token).catch(() => null)
            if (profile && profile.user && profile.user.sub) setCurrentAdminId(profile.user.sub)
            const data = await getAdmins(q, token)
            setAdmins(data)
        } catch (e) { console.error(e); setAdmins([]) } finally { setLoading(false) }
    }

    useEffect(() => { load() }, [])

    function openAdd() { setNewAdmin({ name: '', email: '', contact: '', address: '', designation: '' }); setShowAdd(true) }
    function closeAdd() { setShowAdd(false) }

    async function saveNewAdmin(e) {
        e && e.preventDefault()
        try {
            setAdding(true)
            const { token } = getAuth()
            await createAdmin(newAdmin, token)
            await load()
            closeAdd()
            alert('Admin created and notified (if SMTP configured).')
        } catch (err) { console.error(err); alert('Failed to create admin: ' + (err && err.message || String(err))) }
        setAdding(false)
    }

    async function onDelete(id) {
        if (!confirm('Delete this admin? This action cannot be undone.')) return
        try {
            const { token } = getAuth()
            await deleteAdmin(id, token)
            await load()
        } catch (e) { console.error(e); alert('Delete failed') }
    }

    async function onToggleBlock(id, block) {
        const action = block ? 'Block' : 'Unblock'
        if (!confirm(`${action} this admin account?`)) return
        try {
            const { token } = getAuth()
            await blockAdmin(id, block, token)
            await load()
        } catch (e) { console.error(e); alert('Failed to update block status') }
    }

    // Edit admin
    const [editingAdmin, setEditingAdmin] = useState(null)
    const [savingEdit, setSavingEdit] = useState(false)

    function startEdit(admin) {
        const isMain = String(admin._id) === String(currentAdminId)
        setEditingAdmin({ id: admin._id, name: admin.name || '', contact: admin.contact || '', designation: admin.designation || '', isMain })
    }

    function cancelEdit() { setEditingAdmin(null) }

    async function saveEdit(e) {
        e && e.preventDefault()
        if (!editingAdmin) return
        try {
            setSavingEdit(true)
            const { token } = getAuth()
            const payload = editingAdmin.isMain ? { contact: editingAdmin.contact, designation: editingAdmin.designation } : { contact: editingAdmin.contact, designation: editingAdmin.designation, name: editingAdmin.name }
            await updateAdmin(editingAdmin.id, payload, token)
            await load()
            setEditingAdmin(null)
        } catch (err) { console.error(err); alert('Failed to save changes') }
        setSavingEdit(false)
    }

    return (
        <AdminLayout title="Admin Settings">
            <div className="admin-page">
                <div className="student-search-card" style={{ padding: 18, borderRadius: 12, background: 'linear-gradient(90deg,#fef3c7,#eef2ff)', marginBottom: 12 }}>
                    <form onSubmit={(e) => { e && e.preventDefault(); load(searchTerm) }} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
                        <input
                            placeholder="Search by name, email or designation"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ flex: 1, minWidth: 220 }}
                        />

                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn-primary" type="submit">Search</button>
                            <button type="button" className="btn-secondary" onClick={() => { setSearchTerm(''); load('') }}>Reset</button>
                        </div>
                    </form>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#0b1220' }}>All Admins</div>
                    <div>
                        <button onClick={openAdd} style={{ padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 800, color: '#071132', border: '2px solid transparent', background: 'linear-gradient(white, white) padding-box, linear-gradient(90deg,#7c3aed,#06b6d4) border-box' }}>+ Add Admin</button>
                    </div>
                </div>

                {showAdd && (
                    <div className="faculty-add-modal-backdrop">
                        <div className="faculty-add-modal">
                            <div className="faculty-add-header">
                                <div style={{ fontSize: 18, fontWeight: 800 }}>Add Admin</div>
                                <button onClick={closeAdd} className="faculty-add-close">×</button>
                            </div>
                            <form onSubmit={saveNewAdmin} className="faculty-add-form">
                                <label>Name
                                    <input className="boxed-input" placeholder="Full name" required value={newAdmin.name} onChange={e => setNewAdmin(s => ({ ...s, name: e.target.value }))} />
                                </label>
                                <label>Email
                                    <input className="boxed-input" placeholder="email@example.com" required type="email" value={newAdmin.email} onChange={e => setNewAdmin(s => ({ ...s, email: e.target.value }))} />
                                </label>
                                <label>Contact
                                    <input className="boxed-input" placeholder="Phone or WhatsApp" required value={newAdmin.contact} onChange={e => setNewAdmin(s => ({ ...s, contact: e.target.value }))} />
                                </label>
                                <label>Address
                                    <input className="boxed-input" placeholder="Office or home address" required value={newAdmin.address} onChange={e => setNewAdmin(s => ({ ...s, address: e.target.value }))} />
                                </label>
                                <label>Designation
                                    <input className="boxed-input" placeholder="e.g. Principal, HOD" required value={newAdmin.designation} onChange={e => setNewAdmin(s => ({ ...s, designation: e.target.value }))} />
                                </label>

                                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
                                    <button type="button" className="btn-secondary" onClick={closeAdd}>Cancel</button>
                                    <button className="btn-primary" type="submit" disabled={adding}>{adding ? 'Adding...' : 'Save & Notify'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {editingAdmin && (
                    <div className="faculty-add-modal-backdrop">
                        <div className="faculty-add-modal">
                            <div className="faculty-add-header">
                                <div style={{ fontSize: 18, fontWeight: 800 }}>Edit Admin</div>
                                <button onClick={cancelEdit} className="faculty-add-close">×</button>
                            </div>
                            <form onSubmit={saveEdit} className="faculty-add-form">
                                {!editingAdmin.isMain && (
                                    <label>Name
                                        <input className="boxed-input" placeholder="Full name" required value={editingAdmin.name} onChange={e => setEditingAdmin(s => ({ ...s, name: e.target.value }))} />
                                    </label>
                                )}
                                <label>Contact
                                    <input className="boxed-input" placeholder="Phone or WhatsApp" required value={editingAdmin.contact} onChange={e => setEditingAdmin(s => ({ ...s, contact: e.target.value }))} />
                                </label>
                                <label>Designation
                                    <input className="boxed-input" placeholder="e.g. Principal, HOD" required value={editingAdmin.designation} onChange={e => setEditingAdmin(s => ({ ...s, designation: e.target.value }))} />
                                </label>
                                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
                                    <button type="button" className="btn-secondary" onClick={cancelEdit}>Cancel</button>
                                    <button className="btn-primary" type="submit" disabled={savingEdit}>{savingEdit ? 'Saving...' : 'Save'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <div className="faculty-table-wrap">
                    <table className="faculty-table">
                        <thead>
                            <tr>
                                <th> Name</th>
                                <th> Email</th>
                                <th> Contact</th>
                                <th> Designation</th>
                                <th> Created</th>
                                <th> Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? <tr><td colSpan={6} style={{ padding: 18 }}>Loading...</td></tr> : admins.length === 0 ? <tr><td colSpan={6} style={{ padding: 18 }}>No admins found</td></tr> : admins.map(a => (
                                <tr key={a._id || a.username}>
                                    <td style={{ padding: 12 }}>{a.name}</td>
                                    <td style={{ padding: 12 }}>{a.username}</td>
                                    <td style={{ padding: 12 }}>{a.contact || '-'}</td>
                                    <td style={{ padding: 12 }}>{a.designation || '-'}</td>
                                    <td style={{ padding: 12 }}>{a.createdAt ? new Date(a.createdAt).toLocaleString() : '-'}</td>
                                    <td style={{ padding: 12 }}>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            {String(a._id) === String(currentAdminId) ? (
                                                <>
                                                    <span style={{ fontSize: 12, fontWeight: 700, padding: '6px 10px', borderRadius: 8, background: '#f3f4f6', color: '#111' }}>Main</span>
                                                    <button className="btn-outline" onClick={() => startEdit(a)}>Edit</button>
                                                </>
                                            ) : (
                                                <>
                                                    {a.disabled ? <button className="btn-primary" onClick={() => onToggleBlock(a._id, false)}>Unblock</button> : <button className="btn-outline" onClick={() => onToggleBlock(a._id, true)}>Block</button>}
                                                    <button className="btn-outline" onClick={() => startEdit(a)}>Edit</button>
                                                    <button className="btn-danger" onClick={() => onDelete(a._id)}>Delete</button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    )
}

// edit modal logic
// (Edit modal implemented inside component)
