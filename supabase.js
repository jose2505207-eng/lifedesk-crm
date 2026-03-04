// src/lib/supabase.js
// ─────────────────────────────────────────────────────────────
// Cliente Supabase + todos los helpers de base de datos
// Importa este archivo desde cualquier componente que necesite datos
// ─────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '❌ Faltan variables de entorno de Supabase.\n' +
    'Copia .env.example como .env y llena los valores.'
  )
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)


// ════════════════════════════════════════════════════════════
// LEADS
// ════════════════════════════════════════════════════════════

/** Trae todos los leads, ordenados por fecha de creación desc */
export async function fetchLeads() {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

/** Crea un nuevo lead */
export async function createLead(lead) {
  const { data, error } = await supabase
    .from('leads')
    .insert([{
      name:         lead.name,
      phone:        lead.phone,
      email:        lead.email        || null,
      city:         lead.city         || null,
      age:          lead.age          ? parseInt(lead.age) : null,
      status:       lead.status       || 'New Lead',
      product:      lead.product      || 'Term Life',
      premium:      lead.premium      || 0,
      notes:        lead.notes        || '',
      last_contact: new Date().toISOString().slice(0, 10),
    }])
    .select()
    .single()
  if (error) throw error
  return data
}

/** Actualiza campos de un lead existente */
export async function updateLead(id, fields) {
  // Convierte snake_case si vienen camelCase del front
  const mapped = {}
  if (fields.status      !== undefined) mapped.status       = fields.status
  if (fields.notes       !== undefined) mapped.notes        = fields.notes
  if (fields.premium     !== undefined) mapped.premium      = fields.premium
  if (fields.product     !== undefined) mapped.product      = fields.product
  if (fields.lastContact !== undefined) mapped.last_contact = fields.lastContact
  if (fields.last_contact!== undefined) mapped.last_contact = fields.last_contact
  if (fields.name        !== undefined) mapped.name         = fields.name
  if (fields.phone       !== undefined) mapped.phone        = fields.phone
  if (fields.email       !== undefined) mapped.email        = fields.email
  if (fields.city        !== undefined) mapped.city         = fields.city
  if (fields.age         !== undefined) mapped.age          = fields.age ? parseInt(fields.age) : null

  const { data, error } = await supabase
    .from('leads')
    .update(mapped)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Elimina un lead (y sus follow-ups en cascada) */
export async function deleteLead(id) {
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id)
  if (error) throw error
}

/** Importa un array de leads en bulk (para CSV) */
export async function bulkCreateLeads(leads) {
  const rows = leads.map(l => ({
    name:         l.name,
    phone:        l.phone,
    email:        l.email    || null,
    city:         l.city     || null,
    age:          l.age      ? parseInt(l.age) : null,
    status:       'New Lead',
    product:      l.product  || 'Term Life',
    premium:      0,
    notes:        l.notes    || '',
    last_contact: new Date().toISOString().slice(0, 10),
  }))

  const { data, error } = await supabase
    .from('leads')
    .insert(rows)
    .select()
  if (error) throw error
  return data
}


// ════════════════════════════════════════════════════════════
// FOLLOW-UPS
// ════════════════════════════════════════════════════════════

/** Trae todos los follow-ups con datos del lead relacionado */
export async function fetchFollowUps() {
  const { data, error } = await supabase
    .from('follow_ups')
    .select(`
      *,
      leads ( id, name, status )
    `)
    .order('due_date', { ascending: true })
  if (error) throw error
  return data
}

/** Crea un follow-up */
export async function createFollowUp({ leadId, date, note }) {
  const { data, error } = await supabase
    .from('follow_ups')
    .insert([{
      lead_id:  leadId,
      due_date: date,
      note,
      done:     false,
    }])
    .select(`*, leads(id, name, status)`)
    .single()
  if (error) throw error
  return data
}

/** Actualiza un follow-up (note, date, done, lead_id) */
export async function updateFollowUp(id, fields) {
  const mapped = {}
  if (fields.note    !== undefined) mapped.note     = fields.note
  if (fields.date    !== undefined) mapped.due_date = fields.date
  if (fields.due_date!== undefined) mapped.due_date = fields.due_date
  if (fields.done    !== undefined) mapped.done     = fields.done
  if (fields.leadId  !== undefined) mapped.lead_id  = fields.leadId

  const { data, error } = await supabase
    .from('follow_ups')
    .update(mapped)
    .eq('id', id)
    .select(`*, leads(id, name, status)`)
    .single()
  if (error) throw error
  return data
}

/** Elimina un follow-up */
export async function deleteFollowUp(id) {
  const { error } = await supabase
    .from('follow_ups')
    .delete()
    .eq('id', id)
  if (error) throw error
}


// ════════════════════════════════════════════════════════════
// CALL LOG
// ════════════════════════════════════════════════════════════

/** Trae el historial de llamadas (últimas 100) */
export async function fetchCallLog() {
  const { data, error } = await supabase
    .from('call_log')
    .select(`*, leads(id, name, phone)`)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return data
}

/** Registra una llamada al terminar */
export async function logCall({ leadId, outcome, durationSec, fromNumber, notes }) {
  const { data, error } = await supabase
    .from('call_log')
    .insert([{
      lead_id:      leadId,
      outcome,
      duration_sec: durationSec || 0,
      from_number:  fromNumber  || null,
      notes:        notes       || null,
    }])
    .select()
    .single()
  if (error) throw error
  return data
}


// ════════════════════════════════════════════════════════════
// REAL-TIME (suscripciones en vivo)
// ════════════════════════════════════════════════════════════
// Úsalas en useEffect para que el UI se actualice automáticamente
// cuando otro agente modifica datos (multi-agente futuro).

/**
 * Suscribirse a cambios en leads
 * @param {function} onInsert - callback(lead)
 * @param {function} onUpdate - callback(lead)
 * @param {function} onDelete - callback({ id })
 * @returns unsubscribe function
 */
export function subscribeLeads(onInsert, onUpdate, onDelete) {
  const channel = supabase
    .channel('leads-changes')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'leads' },
      payload => onInsert?.(payload.new)
    )
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'leads' },
      payload => onUpdate?.(payload.new)
    )
    .on('postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'leads' },
      payload => onDelete?.(payload.old)
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}

/**
 * Suscribirse a cambios en follow_ups
 */
export function subscribeFollowUps(onInsert, onUpdate, onDelete) {
  const channel = supabase
    .channel('fu-changes')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'follow_ups' },
      payload => onInsert?.(payload.new)
    )
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'follow_ups' },
      payload => onUpdate?.(payload.new)
    )
    .on('postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'follow_ups' },
      payload => onDelete?.(payload.old)
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}
