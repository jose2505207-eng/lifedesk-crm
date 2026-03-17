import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase.js'

const STATUSES = [
  { key: 'Nuevo',         color: '#6366f1', bg: '#eef2ff' },
  { key: 'Contactado',    color: '#f59e0b', bg: '#fffbeb' },
  { key: 'Interesado',    color: '#3b82f6', bg: '#eff6ff' },
  { key: 'Propuesta',     color: '#8b5cf6', bg: '#f5f3ff' },
  { key: 'Cerrado',       color: '#10b981', bg: '#ecfdf5' },
  { key: 'No Interesado', color: '#6b7280', bg: '#f3f4f6' },
]

const TIME_FILTERS = [
  { key: '',   label: 'Todos' },
  { key: '1',  label: 'Ayer' },
  { key: '3',  label: '3+ días sin contacto' },
  { key: '7',  label: '1+ semana sin contacto' },
  { key: '30', label: '1+ mes sin contacto' },
]

const EMPTY_LEAD = {
  name: '', phone: '', email: '', status: 'Nuevo',
  product: '', premium: '', notes: '',
  last_contact: new Date().toISOString().split('T')[0],
}

const getStatusStyle = (status) => {
  const s = STATUSES.find(x => x.key === status)
  return s ? { color: s.color, backgroundColor: s.bg } : {}
}

export default function App({ user }) {
  const [view, setView] = useState('pipeline')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [timeFilter, setTimeFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [editForm, setEditForm] = useState(EMPTY_LEAD)
  const [saving, setSaving] = useState(false)

  // Multi-select
  const [selectedIds, setSelectedIds] = useState(new Set())

  useEffect(() => {
    const key = `lifedesk_onboarded_${user.id}`
    if (!localStorage.getItem(key)) setShowOnboarding(true)
  }, [user.id])

  const dismissOnboarding = () => {
    localStorage.setItem(`lifedesk_onboarded_${user.id}`, '1')
    setShowOnboarding(false)
  }

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setLeads(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  const filteredLeads = leads.filter(lead => {
    if (statusFilter && lead.status !== statusFilter) return false
    if (timeFilter) {
      const days = parseInt(timeFilter)
      const lc = lead.last_contact ? new Date(lead.last_contact) : null
      if (lc) {
        const diff = (new Date() - lc) / (1000 * 60 * 60 * 24)
        if (diff < days) return false
      }
    }
    if (search) {
      const q = search.toLowerCase()
      return (
        lead.name?.toLowerCase().includes(q) ||
        lead.phone?.toLowerCase().includes(q) ||
        lead.email?.toLowerCase().includes(q) ||
        lead.product?.toLowerCase().includes(q)
      )
    }
    return true
  })

  // ── Checkbox logic ───────────────────────────────────────────────────────────
  const allChecked = filteredLeads.length > 0 && filteredLeads.every(l => selectedIds.has(l.id))
  const someChecked = filteredLeads.some(l => selectedIds.has(l.id))

  const toggleAll = () => {
    if (allChecked) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredLeads.map(l => l.id)))
    }
  }

  const toggleOne = (e, id) => {
    e.stopPropagation()
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── Export CSV ───────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const toExport = selectedIds.size > 0
      ? leads.filter(l => selectedIds.has(l.id))
      : filteredLeads

    const headers = ['Nombre', 'Teléfono', 'Email', 'Producto', 'Prima/mes', 'Estado', 'Último contacto', 'Notas']
    const rows = toExport.map(l => [
      l.name, l.phone, l.email, l.product,
      l.premium, l.status, l.last_contact, l.notes
    ].map(v => `"${(v || '').toString().replace(/"/g, '""')}"`))

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lifedesk-leads-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Bulk delete ──────────────────────────────────────────────────────────────
  const handleBulkDelete = async () => {
    const ids = [...selectedIds]
    const { error } = await supabase.from('leads').delete().in('id', ids)
    if (!error) {
      await fetchLeads()
      setSelectedIds(new Set())
      setShowBulkDeleteConfirm(false)
      if (selectedLead && selectedIds.has(selectedLead.id)) setSelectedLead(null)
    }
  }

  // ── Single CRUD ──────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!editForm.name.trim()) return
    setSaving(true)
    const { error } = await supabase.from('leads').insert({
      ...editForm,
      agent_id: user.id,
      premium: editForm.premium ? parseFloat(editForm.premium) : null,
    })
    if (!error) {
      await fetchLeads()
      setShowAddModal(false)
      setEditForm(EMPTY_LEAD)
    }
    setSaving(false)
  }

  const handleUpdate = async () => {
    if (!editForm.name.trim()) return
    setSaving(true)
    const { error } = await supabase.from('leads').update({
      name: editForm.name, phone: editForm.phone, email: editForm.email,
      status: editForm.status, product: editForm.product,
      premium: editForm.premium ? parseFloat(editForm.premium) : null,
      notes: editForm.notes, last_contact: editForm.last_contact,
    }).eq('id', editForm.id)
    if (!error) {
      await fetchLeads()
      setSelectedLead({ ...editForm, premium: editForm.premium ? parseFloat(editForm.premium) : null })
      setShowEditModal(false)
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!selectedLead) return
    const { error } = await supabase.from('leads').delete().eq('id', selectedLead.id)
    if (!error) {
      await fetchLeads()
      setSelectedLead(null)
      setShowDeleteConfirm(false)
    }
  }

  const statusCounts = STATUSES.map(s => ({
    ...s,
    count: leads.filter(l => l.status === s.key).length,
  }))

  const signOut = () => supabase.auth.signOut()

  const openAdd = () => { setEditForm(EMPTY_LEAD); setShowAddModal(true) }
  const openEdit = (lead) => {
    setEditForm({ ...lead, premium: lead.premium?.toString() || '' })
    setShowEditModal(true)
  }

  // ── Onboarding ───────────────────────────────────────────────────────────────
  if (showOnboarding) {
    return (
      <div style={S.onboardingOverlay}>
        <div style={S.onboardingCard}>
          <div style={S.onboardingLogo}>LD</div>
          <h1 style={S.onboardingTitle}>Bienvenido a LifeDesk</h1>
          <p style={S.onboardingSubtitle}>Tu CRM para agentes de seguros de vida</p>
          <div style={S.onboardingOptions}>
            <button style={S.onboardingBtnPrimary} onClick={() => { dismissOnboarding(); openAdd() }}>
              <span style={{ fontSize: 20 }}>+</span>
              Agregar lead manualmente
            </button>
            <button style={S.onboardingBtnSecondary} onClick={dismissOnboarding} disabled>
              <span style={{ fontSize: 18 }}>↑</span>
              Importar CSV
              <span style={S.soonBadge}>Próximamente</span>
            </button>
          </div>
          <button style={S.onboardingSkip} onClick={dismissOnboarding}>Ir al dashboard →</button>
        </div>
      </div>
    )
  }

  // ── Main Layout ──────────────────────────────────────────────────────────────
  return (
    <div style={S.root}>

      {/* Sidebar */}
      <aside style={S.sidebar}>
        <div style={S.sidebarLogo}>
          <div style={S.logoMark}>LD</div>
          <span style={S.logoText}>LifeDesk</span>
        </div>
        <nav style={S.nav}>
          <button
            style={{ ...S.navItem, ...(view === 'pipeline' ? S.navItemActive : {}) }}
            onClick={() => { setView('pipeline'); setStatusFilter(''); setSelectedLead(null); setSelectedIds(new Set()) }}
          >⬡ Pipeline</button>
          <button
            style={{ ...S.navItem, ...(view === 'leads' ? S.navItemActive : {}) }}
            onClick={() => { setView('leads'); setSelectedLead(null) }}
          >☰ Leads</button>
        </nav>
        <div style={S.sidebarBottom}>
          <div style={S.userInfo}>
            <div style={S.userAvatar}>{user.email?.[0]?.toUpperCase()}</div>
            <div style={S.userEmail}>{user.email}</div>
          </div>
          <button style={S.signOutBtn} onClick={signOut}>Cerrar sesión</button>
        </div>
      </aside>

      {/* Main */}
      <main style={S.main}>
        <div style={S.header}>
          <div>
            <h1 style={S.pageTitle}>{view === 'pipeline' ? 'Pipeline' : 'Leads'}</h1>
            <p style={S.pageSubtitle}>{leads.length} leads en total</p>
          </div>
          <button style={S.addBtn} onClick={openAdd}>+ Agregar Lead</button>
        </div>

        {/* Pipeline */}
        {view === 'pipeline' && (
          <div style={S.pipeline}>
            {statusCounts.map(s => (
              <div key={s.key} style={S.pipelineCard}
                onClick={() => { setView('leads'); setStatusFilter(s.key) }}>
                <div style={{ ...S.pipelineDot, backgroundColor: s.color }} />
                <div style={S.pipelineCount}>{s.count}</div>
                <div style={S.pipelineLabel}>{s.key}</div>
              </div>
            ))}
          </div>
        )}

        {/* Leads */}
        {view === 'leads' && (
          <div style={S.leadsView}>

            {/* Toolbar */}
            <div style={S.toolbar}>
              <input
                style={S.searchInput}
                placeholder="Buscar lead..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <div style={S.toolbarRight}>
                <select style={S.select} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="">Todos los estados</option>
                  {STATUSES.map(s => <option key={s.key} value={s.key}>{s.key}</option>)}
                </select>
                <select style={S.select} value={timeFilter} onChange={e => setTimeFilter(e.target.value)}>
                  {TIME_FILTERS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
                {(statusFilter || timeFilter || search) && (
                  <button style={S.clearBtn} onClick={() => { setStatusFilter(''); setTimeFilter(''); setSearch('') }}>
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            {/* Bulk action bar — visible when items are selected */}
            {someChecked && (
              <div style={S.bulkBar}>
                <span style={S.bulkCount}>{selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={S.bulkExportBtn} onClick={exportCSV}>↓ Exportar CSV</button>
                  <button style={S.bulkDeleteBtn} onClick={() => setShowBulkDeleteConfirm(true)}>🗑 Eliminar</button>
                  <button style={S.clearBtn} onClick={() => setSelectedIds(new Set())}>Cancelar</button>
                </div>
              </div>
            )}

            {/* Table */}
            <div style={S.tableWrap}>
              {loading ? (
                <div style={S.centered}>Cargando...</div>
              ) : filteredLeads.length === 0 ? (
                <div style={S.emptyState}>
                  <div style={S.emptyIcon}>○</div>
                  <p style={S.emptyText}>
                    {search || statusFilter || timeFilter ? 'Sin resultados' : 'No hay leads aún'}
                  </p>
                  {!search && !statusFilter && !timeFilter && (
                    <button style={S.addBtn} onClick={openAdd}>+ Agregar Lead</button>
                  )}
                </div>
              ) : (
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={{ ...S.th, width: 40 }}>
                        <input
                          type="checkbox"
                          checked={allChecked}
                          ref={el => { if (el) el.indeterminate = someChecked && !allChecked }}
                          onChange={toggleAll}
                          style={S.checkbox}
                        />
                      </th>
                      <th style={S.th}>Nombre</th>
                      <th style={S.th}>Teléfono</th>
                      <th style={S.th}>Producto</th>
                      <th style={S.th}>Prima/mes</th>
                      <th style={S.th}>Estado</th>
                      <th style={S.th}>Último contacto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map(lead => (
                      <tr
                        key={lead.id}
                        style={{
                          ...S.tr,
                          ...(selectedLead?.id === lead.id ? S.trSelected : {}),
                          ...(selectedIds.has(lead.id) ? S.trChecked : {}),
                        }}
                        onClick={() => setSelectedLead(lead)}
                      >
                        <td style={{ ...S.td, width: 40 }} onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(lead.id)}
                            onChange={e => toggleOne(e, lead.id)}
                            style={S.checkbox}
                          />
                        </td>
                        <td style={S.td}><strong>{lead.name}</strong></td>
                        <td style={S.td}>{lead.phone || '—'}</td>
                        <td style={S.td}>{lead.product || '—'}</td>
                        <td style={S.td}>{lead.premium ? `$${lead.premium}` : '—'}</td>
                        <td style={S.td}>
                          <span style={{ ...S.badge, ...getStatusStyle(lead.status) }}>
                            {lead.status}
                          </span>
                        </td>
                        <td style={S.td}>{lead.last_contact || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Export all button (when nothing selected) */}
            {!someChecked && filteredLeads.length > 0 && (
              <div style={S.exportFooter}>
                <button style={S.exportAllBtn} onClick={exportCSV}>↓ Exportar CSV</button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Detail Panel */}
      {selectedLead && (
        <aside style={S.detailPanel}>
          <div style={S.detailHeader}>
            <div>
              <h2 style={S.detailName}>{selectedLead.name}</h2>
              <span style={{ ...S.badge, ...getStatusStyle(selectedLead.status) }}>
                {selectedLead.status}
              </span>
            </div>
            <button style={S.iconBtn} onClick={() => setSelectedLead(null)}>✕</button>
          </div>
          <div style={S.detailBody}>
            <DetailRow label="Teléfono"        value={selectedLead.phone} />
            <DetailRow label="Email"           value={selectedLead.email} />
            <DetailRow label="Producto"        value={selectedLead.product} />
            <DetailRow label="Prima mensual"   value={selectedLead.premium ? `$${selectedLead.premium}` : null} />
            <DetailRow label="Último contacto" value={selectedLead.last_contact} />
            {selectedLead.notes && <div style={S.notesBox}>{selectedLead.notes}</div>}
          </div>
          <div style={S.detailActions}>
            <button style={S.editBtn}   onClick={() => openEdit(selectedLead)}>Editar</button>
            <button style={S.deleteBtn} onClick={() => setShowDeleteConfirm(true)}>Eliminar</button>
          </div>
        </aside>
      )}

      {/* Add / Edit Modal */}
      {(showAddModal || showEditModal) && (
        <Overlay onClose={() => { setShowAddModal(false); setShowEditModal(false) }}>
          <div style={S.modalHeader}>
            <h2 style={S.modalTitle}>{showAddModal ? 'Nuevo Lead' : 'Editar Lead'}</h2>
            <button style={S.iconBtn} onClick={() => { setShowAddModal(false); setShowEditModal(false) }}>✕</button>
          </div>
          <div style={S.modalBody}>
            <div style={S.formGrid}>
              <Field label="Nombre *">
                <input style={S.input} value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
              </Field>
              <Field label="Teléfono">
                <input style={S.input} value={editForm.phone}
                  onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
              </Field>
              <Field label="Email">
                <input style={S.input} type="email" value={editForm.email}
                  onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
              </Field>
              <Field label="Estado">
                <select style={S.input} value={editForm.status}
                  onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                  {STATUSES.map(s => <option key={s.key} value={s.key}>{s.key}</option>)}
                </select>
              </Field>
              <Field label="Producto">
                <input style={S.input} value={editForm.product}
                  onChange={e => setEditForm(f => ({ ...f, product: e.target.value }))} />
              </Field>
              <Field label="Prima mensual ($)">
                <input style={S.input} type="number" value={editForm.premium}
                  onChange={e => setEditForm(f => ({ ...f, premium: e.target.value }))} />
              </Field>
              <Field label="Último contacto">
                <input style={S.input} type="date" value={editForm.last_contact}
                  onChange={e => setEditForm(f => ({ ...f, last_contact: e.target.value }))} />
              </Field>
            </div>
            <Field label="Notas">
              <textarea style={{ ...S.input, height: 80, resize: 'vertical' }}
                value={editForm.notes}
                onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
            </Field>
          </div>
          <div style={S.modalFooter}>
            <button style={S.cancelBtn} onClick={() => { setShowAddModal(false); setShowEditModal(false) }}>
              Cancelar
            </button>
            <button
              style={{ ...S.saveBtn, opacity: (!editForm.name.trim() || saving) ? 0.5 : 1 }}
              disabled={!editForm.name.trim() || saving}
              onClick={showAddModal ? handleAdd : handleUpdate}
            >
              {saving ? 'Guardando...' : showAddModal ? 'Agregar' : 'Guardar cambios'}
            </button>
          </div>
        </Overlay>
      )}

      {/* Single Delete Confirm */}
      {showDeleteConfirm && (
        <Overlay onClose={() => setShowDeleteConfirm(false)} maxWidth={400}>
          <div style={S.modalHeader}>
            <h2 style={S.modalTitle}>Eliminar Lead</h2>
          </div>
          <div style={S.modalBody}>
            <p style={{ color: '#374151', margin: 0 }}>
              ¿Estás seguro que quieres eliminar a <strong>{selectedLead?.name}</strong>?
              Esta acción no se puede deshacer.
            </p>
          </div>
          <div style={S.modalFooter}>
            <button style={S.cancelBtn} onClick={() => setShowDeleteConfirm(false)}>Cancelar</button>
            <button style={{ ...S.saveBtn, backgroundColor: '#ef4444' }} onClick={handleDelete}>Eliminar</button>
          </div>
        </Overlay>
      )}

      {/* Bulk Delete Confirm */}
      {showBulkDeleteConfirm && (
        <Overlay onClose={() => setShowBulkDeleteConfirm(false)} maxWidth={400}>
          <div style={S.modalHeader}>
            <h2 style={S.modalTitle}>Eliminar {selectedIds.size} leads</h2>
          </div>
          <div style={S.modalBody}>
            <p style={{ color: '#374151', margin: 0 }}>
              ¿Estás seguro que quieres eliminar <strong>{selectedIds.size} leads</strong>?
              Esta acción no se puede deshacer.
            </p>
          </div>
          <div style={S.modalFooter}>
            <button style={S.cancelBtn} onClick={() => setShowBulkDeleteConfirm(false)}>Cancelar</button>
            <button style={{ ...S.saveBtn, backgroundColor: '#ef4444' }} onClick={handleBulkDelete}>
              Eliminar {selectedIds.size} leads
            </button>
          </div>
        </Overlay>
      )}
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div style={S.detailRow}>
      <span style={S.detailLabel}>{label}</span>
      <span style={{ color: '#374151' }}>{value || '—'}</span>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={S.fieldLabel}>{label}</label>
      {children}
    </div>
  )
}

function Overlay({ children, onClose, maxWidth = 560 }) {
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.modal, maxWidth }} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

const S = {
  root: {
    display: 'flex', height: '100vh', backgroundColor: '#f9fafb',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: 14, color: '#111827',
  },
  sidebar: {
    width: 220, backgroundColor: '#fff', borderRight: '1px solid #e5e7eb',
    display: 'flex', flexDirection: 'column', padding: '20px 0', flexShrink: 0,
  },
  sidebarLogo: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '0 20px 20px', borderBottom: '1px solid #e5e7eb', marginBottom: 12,
  },
  logoMark: {
    width: 32, height: 32, backgroundColor: '#111827', color: '#fff',
    borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 13,
  },
  logoText: { fontWeight: 600, fontSize: 15 },
  nav: { display: 'flex', flexDirection: 'column', gap: 2, padding: '0 12px' },
  navItem: {
    padding: '8px 12px', borderRadius: 6, border: 'none', background: 'none',
    cursor: 'pointer', textAlign: 'left', fontSize: 14, color: '#6b7280', fontWeight: 500,
  },
  navItemActive: { backgroundColor: '#f3f4f6', color: '#111827' },
  sidebarBottom: { marginTop: 'auto', padding: '16px', borderTop: '1px solid #e5e7eb' },
  userInfo: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  userAvatar: {
    width: 28, height: 28, borderRadius: '50%', backgroundColor: '#111827', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 600, flexShrink: 0,
  },
  userEmail: { fontSize: 12, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  signOutBtn: {
    width: '100%', padding: '6px 0', border: 'none', background: 'none',
    cursor: 'pointer', color: '#9ca3af', fontSize: 13, textAlign: 'left',
  },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: '24px 28px 16px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#fff',
  },
  pageTitle: { fontSize: 20, fontWeight: 600, margin: 0 },
  pageSubtitle: { fontSize: 13, color: '#9ca3af', margin: '2px 0 0' },
  addBtn: {
    padding: '8px 16px', backgroundColor: '#111827', color: '#fff',
    border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500, flexShrink: 0,
  },
  pipeline: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 16, padding: 28,
  },
  pipelineCard: {
    backgroundColor: '#fff', border: '1px solid #e5e7eb',
    borderRadius: 12, padding: '20px 16px', cursor: 'pointer',
  },
  pipelineDot: { width: 8, height: 8, borderRadius: '50%', marginBottom: 12 },
  pipelineCount: { fontSize: 32, fontWeight: 700, lineHeight: 1, marginBottom: 4 },
  pipelineLabel: { fontSize: 13, color: '#6b7280' },
  leadsView: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  toolbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, padding: '14px 28px', backgroundColor: '#fff',
    borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap',
  },
  toolbarRight: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  searchInput: {
    padding: '7px 12px', border: '1px solid #e5e7eb', borderRadius: 8,
    fontSize: 14, width: 240, outline: 'none', backgroundColor: '#f9fafb',
  },
  select: {
    padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 8,
    fontSize: 13, backgroundColor: '#f9fafb', cursor: 'pointer', outline: 'none',
  },
  clearBtn: {
    padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 8,
    fontSize: 13, backgroundColor: '#fff', cursor: 'pointer', color: '#6b7280',
  },

  // Bulk action bar
  bulkBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 28px', backgroundColor: '#eff6ff', borderBottom: '1px solid #bfdbfe',
  },
  bulkCount: { fontSize: 13, fontWeight: 600, color: '#1d4ed8' },
  bulkDeleteBtn: {
    padding: '6px 14px', backgroundColor: '#ef4444', color: '#fff',
    border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500,
  },
  bulkExportBtn: {
    padding: '6px 14px', backgroundColor: '#111827', color: '#fff',
    border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500,
  },

  tableWrap: { flex: 1, overflow: 'auto', padding: '0 28px 0' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: 16 },
  th: {
    textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 600,
    color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em',
    borderBottom: '1px solid #e5e7eb',
  },
  tr: { cursor: 'pointer', borderBottom: '1px solid #f3f4f6' },
  trSelected: { backgroundColor: '#f9fafb' },
  trChecked: { backgroundColor: '#eff6ff' },
  td: { padding: '11px 12px', color: '#374151' },
  checkbox: { cursor: 'pointer', width: 15, height: 15, accentColor: '#111827' },
  badge: {
    display: 'inline-block', padding: '3px 8px',
    borderRadius: 20, fontSize: 12, fontWeight: 500,
  },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 60 },
  emptyIcon: { fontSize: 40, color: '#d1d5db' },
  emptyText: { color: '#9ca3af', fontSize: 15, margin: 0 },
  centered: { padding: 40, textAlign: 'center', color: '#9ca3af' },

  exportFooter: {
    display: 'flex', justifyContent: 'flex-end',
    padding: '12px 28px', borderTop: '1px solid #f3f4f6',
  },
  exportAllBtn: {
    padding: '6px 14px', backgroundColor: '#fff', color: '#374151',
    border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontSize: 13,
  },

  detailPanel: {
    width: 300, backgroundColor: '#fff', borderLeft: '1px solid #e5e7eb',
    display: 'flex', flexDirection: 'column', flexShrink: 0,
  },
  detailHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '20px 20px 16px', borderBottom: '1px solid #e5e7eb',
  },
  detailName: { fontSize: 16, fontWeight: 600, margin: '0 0 6px' },
  detailBody: { flex: 1, padding: 20, overflow: 'auto' },
  detailRow: {
    display: 'flex', justifyContent: 'space-between',
    padding: '9px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13, gap: 8,
  },
  detailLabel: { color: '#9ca3af', fontWeight: 500, flexShrink: 0 },
  notesBox: {
    marginTop: 16, padding: 12, backgroundColor: '#f9fafb',
    borderRadius: 8, fontSize: 13, color: '#374151', lineHeight: 1.5,
  },
  detailActions: { display: 'flex', gap: 8, padding: 16, borderTop: '1px solid #e5e7eb' },
  editBtn: {
    flex: 1, padding: '8px 0', backgroundColor: '#111827', color: '#fff',
    border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500,
  },
  deleteBtn: {
    flex: 1, padding: '8px 0', backgroundColor: '#fff', color: '#ef4444',
    border: '1px solid #fecaca', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500,
  },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#9ca3af', padding: 4 },
  overlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16,
  },
  modal: {
    backgroundColor: '#fff', borderRadius: 12, width: '100%',
    maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '20px 24px 16px', borderBottom: '1px solid #e5e7eb',
  },
  modalTitle: { fontSize: 17, fontWeight: 600, margin: 0 },
  modalBody: {
    padding: '20px 24px', overflow: 'auto', flex: 1,
    display: 'flex', flexDirection: 'column', gap: 16,
  },
  modalFooter: {
    display: 'flex', justifyContent: 'flex-end', gap: 8,
    padding: '16px 24px', borderTop: '1px solid #e5e7eb',
  },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  fieldLabel: {
    fontSize: 11, fontWeight: 600, color: '#6b7280',
    textTransform: 'uppercase', letterSpacing: '0.06em',
  },
  input: {
    padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8,
    fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box',
    backgroundColor: '#fff', fontFamily: 'inherit',
  },
  saveBtn: {
    padding: '8px 20px', backgroundColor: '#111827', color: '#fff',
    border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500,
  },
  cancelBtn: {
    padding: '8px 20px', backgroundColor: '#fff', color: '#374151',
    border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontSize: 14,
  },
  onboardingOverlay: {
    position: 'fixed', inset: 0, backgroundColor: '#f9fafb',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', zIndex: 200,
  },
  onboardingCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: '48px 40px',
    maxWidth: 440, width: '90%', textAlign: 'center',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb',
  },
  onboardingLogo: {
    width: 52, height: 52, backgroundColor: '#111827', color: '#fff',
    borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 18, margin: '0 auto 20px',
  },
  onboardingTitle: { fontSize: 24, fontWeight: 700, margin: '0 0 8px' },
  onboardingSubtitle: { color: '#9ca3af', fontSize: 15, margin: '0 0 32px' },
  onboardingOptions: { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 },
  onboardingBtnPrimary: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '14px 20px', backgroundColor: '#111827', color: '#fff',
    border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: 500,
  },
  onboardingBtnSecondary: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '14px 20px', backgroundColor: '#fff', color: '#9ca3af',
    border: '1px solid #e5e7eb', borderRadius: 10, cursor: 'not-allowed',
    fontSize: 15, fontWeight: 500, position: 'relative',
  },
  soonBadge: {
    position: 'absolute', right: 14, fontSize: 11,
    backgroundColor: '#f3f4f6', color: '#9ca3af', padding: '2px 6px', borderRadius: 4,
  },
  onboardingSkip: { background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 14 },
}
