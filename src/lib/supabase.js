import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const normLead = r => ({ ...r, lastContact: r.last_contact })
const normFU   = r => ({ ...r, leadId: r.lead_id, date: r.due_date })

export async function fetchLeads() {
  const { data, error } = await supabase
    .from('leads').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data.map(normLead)
}

export async function createLead(lead) {
  const { data, error } = await supabase.from('leads').insert([{
    name: lead.name, phone: lead.phone, email: lead.email || null,
    city: lead.city || null, age: lead.age ? parseInt(lead.age) : null,
    status: lead.status || 'New Lead', product: lead.product || 'Term Life',
    premium: lead.premium || 0, notes: lead.notes || '',
    last_contact: new Date().toISOString().slice(0, 10),
  }]).select().single()
  if (error) throw error
  return normLead(data)
}

export async function updateLead(id, fields) {
  const mapped = {}
  if (fields.status       !== undefined) mapped.status       = fields.status
  if (fields.notes        !== undefined) mapped.notes        = fields.notes
  if (fields.premium      !== undefined) mapped.premium      = fields.premium
  if (fields.product      !== undefined) mapped.product      = fields.product
  if (fields.last_contact !== undefined) mapped.last_contact = fields.last_contact
  if (fields.lastContact  !== undefined) mapped.last_contact = fields.lastContact
  if (fields.name         !== undefined) mapped.name         = fields.name
  if (fields.phone        !== undefined) mapped.phone        = fields.phone
  if (fields.email        !== undefined) mapped.email        = fields.email
  if (fields.city         !== undefined) mapped.city         = fields.city
  if (fields.age          !== undefined) mapped.age          = fields.age ? parseInt(fields.age) : null
  const { data, error } = await supabase.from('leads').update(mapped).eq('id', id).select().single()
  if (error) throw error
  return normLead(data)
}

export async function bulkCreateLeads(leads) {
  const rows = leads.map(l => ({
    name: l.name, phone: l.phone, email: l.email || null, city: l.city || null,
    age: l.age ? parseInt(l.age) : null, status: 'New Lead',
    product: l.product || 'Term Life', premium: 0, notes: l.notes || '',
    last_contact: new Date().toISOString().slice(0, 10),
  }))
  const { data, error } = await supabase.from('leads').insert(rows).select()
  if (error) throw error
  return data.map(normLead)
}

export async function fetchFollowUps() {
  const { data, error } = await supabase
    .from('follow_ups').select('*').order('due_date', { ascending: true })
  if (error) throw error
  return data.map(normFU)
}

export async function createFollowUp({ leadId, date, note }) {
  const { data, error } = await supabase.from('follow_ups')
    .insert([{ lead_id: leadId, due_date: date, note, done: false }]).select().single()
  if (error) throw error
  return normFU(data)
}

export async function updateFollowUp(id, fields) {
  const mapped = {}
  if (fields.note     !== undefined) mapped.note     = fields.note
  if (fields.date     !== undefined) mapped.due_date = fields.date
  if (fields.due_date !== undefined) mapped.due_date = fields.due_date
  if (fields.done     !== undefined) mapped.done     = fields.done
  if (fields.leadId   !== undefined) mapped.lead_id  = fields.leadId
  const { data, error } = await supabase.from('follow_ups').update(mapped).eq('id', id).select().single()
  if (error) throw error
  return normFU(data)
}

export async function deleteFollowUp(id) {
  const { error } = await supabase.from('follow_ups').delete().eq('id', id)
  if (error) throw error
}

export async function logCall({ leadId, outcome, durationSec, fromNumber }) {
  const { data, error } = await supabase.from('call_log').insert([{
    lead_id: leadId, outcome, duration_sec: durationSec || 0, from_number: fromNumber || null,
  }]).select().single()
  if (error) throw error
  return data
}

// ── Workspaces ────────────────────────────────────────────────────────────────

export async function fetchWorkspaces() {
  const { data, error } = await supabase
    .from('workspaces').select('*').order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createWorkspace({ name, color }) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.from('workspaces')
    .insert([{ name, color, created_by: user.id }]).select().single()
  if (error) throw error
  // Auto-add creator as admin member
  await supabase.from('workspace_members')
    .insert([{ workspace_id: data.id, user_id: user.id, role: 'admin' }])
  return data
}

export async function joinWorkspace(inviteCode) {
  const { data: ws, error: wsErr } = await supabase
    .from('workspaces').select('id').eq('invite_code', inviteCode.toUpperCase()).single()
  if (wsErr) throw new Error('Código inválido')
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.from('workspace_members')
    .insert([{ workspace_id: ws.id, user_id: user.id, role: 'member' }])
  if (error && error.code !== '23505') throw error // ignore duplicate
  return ws
}

export async function fetchWorkspaceMembers(workspaceId) {
  const { data, error } = await supabase
    .from('workspace_members').select('*').eq('workspace_id', workspaceId)
  if (error) throw error
  return data || []
}

export async function updateMemberRole(workspaceId, userId, role) {
  const { error } = await supabase.from('workspace_members')
    .update({ role }).eq('workspace_id', workspaceId).eq('user_id', userId)
  if (error) throw error
}

export async function removeMember(workspaceId, userId) {
  const { error } = await supabase.from('workspace_members')
    .delete().eq('workspace_id', workspaceId).eq('user_id', userId)
  if (error) throw error
}

export async function fetchWorkspaceLeads(workspaceId) {
  const { data, error } = await supabase
    .from('workspace_leads')
    .select('lead_id, leads(*)')
    .eq('workspace_id', workspaceId)
  if (error) throw error
  return (data || []).map(row => normLead(row.leads))
}

export async function addLeadsToWorkspace(workspaceId, leadIds) {
  const { data: { user } } = await supabase.auth.getUser()
  const rows = leadIds.map(lead_id => ({ workspace_id: workspaceId, lead_id, added_by: user.id }))
  const { error } = await supabase.from('workspace_leads').insert(rows)
  if (error && error.code !== '23505') throw error
}

export async function removeLeadFromWorkspace(workspaceId, leadId) {
  const { error } = await supabase.from('workspace_leads')
    .delete().eq('workspace_id', workspaceId).eq('lead_id', leadId)
  if (error) throw error
}

export async function updateWorkspace(id, fields) {
  const { error } = await supabase.from('workspaces').update(fields).eq('id', id)
  if (error) throw error
}

export async function deleteWorkspace(id) {
  const { error } = await supabase.from('workspaces').delete().eq('id', id)
  if (error) throw error
}
