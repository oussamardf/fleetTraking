import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Client Supabase pour les Server Components, Server Actions et Route Handlers.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Ignored for Server Component reads
          }
        },
      },
    },
  )
}

type DocumentRow = {
  id: string
  vehicule_id: string
  type_document: string
  date_saisie: string | null
  date_expiration: string | null
  est_renouvelle: boolean
  cal_creeLe: string | null
}

type VehiculeWithDocumentsRow = {
  id: string
  nom: string
  image_url: string | null
  cal_creeLe: string | null
  documents?: DocumentRow[] | null
}

type MappedDocument = {
  id: string
  vehiculeId: string
  typeDocument: 'ASSURANCE' | 'VISITE_TECHNIQUE' | 'VIGNETTE'
  dateSaisie: string | null
  dateExpiration: string | null
  estRenouvele: boolean
  creeLe: string | null
}

/**
 * RPC function to fetch all vehicles with their documents.
 */
export async function getVehiclesWithDocuments() {
  const client = await createClient()

  const { data: vehicles } = await client
    .from('vehicules')
    .select(`
      *,
      documents_vehicule:documents (
        id,
        vehicule_id,
        type_document,
        date_saisie,
        date_expiration,
        est_renouvelle,
        cal_creeLe
      )
    `)
    .order('cal_creeLe', { ascending: true })

  if (!vehicles) return []

  const result = (vehicles as VehiculeWithDocumentsRow[]).map((vehicule) => {
    const documents: Partial<
      Record<'ASSURANCE' | 'VISITE_TECHNIQUE' | 'VIGNETTE', MappedDocument>
    > = {}

    vehicule.documents?.forEach((doc) => {
      const type = (doc.type_document as MappedDocument['typeDocument']) || 'VIGNETTE'
      documents[type] = {
        id: doc.id,
        vehiculeId: doc.vehicule_id,
        typeDocument: type,
        dateSaisie: doc.date_saisie ? new Date(doc.date_saisie).toISOString() : null,
        dateExpiration: doc.date_expiration ? new Date(doc.date_expiration).toISOString() : null,
        estRenouvele: Boolean(doc.est_renouvelle),
        creeLe: doc.cal_creeLe ? new Date(doc.cal_creeLe).toISOString() : null,
      }
    })

    return {
      id: vehicule.id,
      nom: vehicule.nom,
      imageUrl: vehicule.image_url || null,
      creeLe: vehicule.cal_creeLe ? new Date(vehicule.cal_creeLe).toISOString() : null,
      documents,
    }
  })

  return result
}

/**
 * RPC function to fetch a calendar event by ID.
 */
export async function getCalendarEventById(calendarEventId: string) {
  try {
    const client = await createClient()
    const { data } = await client.rpc('get_calendar_event_by_id', {
      calendarEventId,
    })
    return data?.event || null
  } catch (error) {
    console.error('[getCalendarEventById] Error:', error)
    return null
  }
}

/**
 * RPC function to create a new calendar event for document renewal alert.
 * Creates an alert at J-4 (4 days before expiration).
 */
export async function createCalendarAlert(vehicleId: string, docType: string, expirationDate: string) {
  try {
    const client = await createClient()

    // Calculate J-4 date
    const alertDate = new Date(expirationDate)
    alertDate.setDate(alertDate.getDate() - 4)
    const alertDateStr = alertDate.toISOString().split('T')[0]

    // Create the calendar event via RPC
    const { data: event, error } = await client.rpc('create_calendar_event', {
      vehicleId,
      docType,
      alertDateStr,
    })

    if (error || !event) {
      console.error('[createCalendarAlert] Error:', error)
      return null
    }

    return event.id
  } catch (error) {
    console.error('[createCalendarAlert] Error:', error)
    return null
  }
}
