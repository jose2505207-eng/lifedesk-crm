// src/lib/supabase.js
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

/**
 * Fetch per-agent productivity metrics from the database.
 *
 * Calls the `dashboard_metrics` Postgres RPC which is scoped to the
 * currently-authenticated agent via auth.uid().
 *
 * @param {Object} opts
 * @param {'day'|'week'|'month'} opts.period - Time window to aggregate.
 * @param {string} [opts.tz='America/Los_Angeles'] - IANA timezone for the window.
 * @returns {Promise<{
 *   period: string,
 *   window_start: string,
 *   summary: {
 *     new_leads: number,
 *     calls: number,
 *     contacted_calls: number,
 *     followups_created: number,
 *     followups_done: number,
 *     followups_pending: number,
 *     followups_overdue: number,
 *     closed_won: number,
 *     premium_won: number,
 *     pipeline_value: number,
 *     deals_lost: number,
 *     total_leads: number,
 *     conversion_rate: number,
 *   },
 *   series: Array<{date:string, new_leads:number, calls:number,
 *                  followups_created:number, followups_done:number}>,
 * }>}
 */
export async function fetchDashboardMetrics({ period = 'week', tz = 'America/Los_Angeles' } = {}) {
  const { data, error } = await supabase.rpc('dashboard_metrics', {
    p_period: period,
    p_tz: tz,
  })
  if (error) throw error
  return data
}
