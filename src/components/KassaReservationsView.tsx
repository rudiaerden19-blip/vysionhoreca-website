'use client'

/**
 * KassaReservationsView - Professioneel Reservatiesysteem
 * Exact gekopieerd van ReservationsView (vysion-horeca) + Supabase + email
 */

import { useState, useMemo, useEffect } from 'react'
import {
  CalendarDays,
  Users,
  Clock,
  MapPin,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  UserCheck,
  UserX,
  Phone,
  Mail,
  MessageSquare,
  Settings,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  Star,
  Ban,
  X,
  UtensilsCrossed,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ---- Types ----
type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED' | 'WAITLIST'
type ViewMode = 'today' | 'calendar' | 'list' | 'floorplan' | 'guests' | 'stats' | 'settings'

interface Reservation {
  id: string
  tenant_slug: string
  guest_name: string
  guest_phone?: string
  guest_email?: string
  party_size: number
  reservation_date: string
  reservation_time: string
  duration_minutes: number
  table_number?: string
  notes?: string
  special_requests?: string
  occasion?: string
  status: ReservationStatus
  checked_in_at?: string
  completed_at?: string
  total_spent: number
  created_at?: string
  payment_status?: string
  stripe_session_id?: string
  stripe_payment_method_id?: string
  deposit_amount?: number
  waitlist_position?: number
}

interface KassaTable {
  id: string
  number: string
  seats: number
  status: string
}

interface Shift {
  id: string
  name: string
  startTime: string
  endTime: string
  isActive: boolean
}

interface ReservationSettings {
  isEnabled: boolean
  acceptOnline: boolean
  maxPartySize: number
  defaultDurationMinutes: number
  bufferMinutes: number
  slotDurationMinutes: number
  maxReservationsPerSlot: number
  maxCoversPerSlot: number
  minAdvanceHours: number
  maxAdvanceDays: number
  kitchenCapacityEnabled: boolean
  kitchenMaxCoversPer15min: number
  closedDays: number[]
  // z2 - Shifts
  shifts: Shift[]
  // z4 - Annuleringsbeleid
  cancellationDeadlineHours: number
  cancellationMessage: string
  // z5 - Review
  reviewLink: string
  autoSendReview: boolean
  // z8/z9 - Betaling
  depositRequired: boolean
  depositAmount: number
  noShowProtection: boolean
  noShowFee: number
  // Booking widget URL label
  bookingPageEnabled: boolean
}

interface GuestProfile {
  id: string
  name: string
  phone?: string
  email?: string
  isVip: boolean
  isBlocked: boolean
  totalVisits: number
  totalNoShows: number
  totalSpent: number
  lastVisit?: string
  notes?: string
}

// ---- Props ----
interface KassaReservationsViewProps {
  tenant: string
  kassaTables: KassaTable[]
  onClose: () => void
  onStartOrder: (tableNr: string) => void
}

// ---- Status config (exact kopie) ----
const STATUS_CONFIG: Record<ReservationStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  PENDING: { label: 'In afwachting', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.15)', icon: <Clock size={14} /> },
  CONFIRMED: { label: 'Bevestigd', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.15)', icon: <CheckCircle2 size={14} /> },
  CHECKED_IN: { label: 'Ingecheckt', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.15)', icon: <UserCheck size={14} /> },
  COMPLETED: { label: 'Afgerond', color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.15)', icon: <CheckCircle2 size={14} /> },
  NO_SHOW: { label: 'No-show', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.15)', icon: <UserX size={14} /> },
  CANCELLED: { label: 'Geannuleerd', color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.15)', icon: <XCircle size={14} /> },
  WAITLIST: { label: 'Wachtlijst', color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.15)', icon: <Clock size={14} /> },
}

// ---- Default settings ----
const DEFAULT_SETTINGS: ReservationSettings = {
  isEnabled: true,
  acceptOnline: false,
  maxPartySize: 12,
  defaultDurationMinutes: 90,
  bufferMinutes: 15,
  slotDurationMinutes: 30,
  maxReservationsPerSlot: 0,
  maxCoversPerSlot: 0,
  minAdvanceHours: 2,
  maxAdvanceDays: 60,
  kitchenCapacityEnabled: false,
  kitchenMaxCoversPer15min: 20,
  closedDays: [],
  shifts: [
    { id: '1', name: 'Lunch', startTime: '12:00', endTime: '15:00', isActive: false },
    { id: '2', name: 'Diner', startTime: '18:00', endTime: '23:00', isActive: false },
  ],
  cancellationDeadlineHours: 24,
  cancellationMessage: 'Annulering is niet meer mogelijk, het afgesproken tijdstip is verstreken.',
  reviewLink: '',
  autoSendReview: false,
  depositRequired: false,
  depositAmount: 10,
  noShowProtection: false,
  noShowFee: 25,
  bookingPageEnabled: true,
}

// ---- Toast simple ----
function useToast() {
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  useEffect(() => {
    if (msg) {
      const t = setTimeout(() => setMsg(null), 3000)
      return () => clearTimeout(t)
    }
  }, [msg])
  const success = (text: string) => setMsg({ text, type: 'success' })
  const error = (text: string) => setMsg({ text, type: 'error' })
  return { msg, success, error }
}

// ---- Email helper ----
async function sendReservationEmail(data: {
  customerEmail: string
  customerName: string
  customerPhone?: string
  reservationDate: string
  reservationTime: string
  partySize: number
  tableName?: string
  notes?: string
  specialRequests?: string
  occasion?: string
  status: string
  businessName: string
  businessPhone?: string
  businessEmail?: string
  cancellationReason?: string
  reviewLink?: string
}) {
  try {
    await fetch('/api/send-reservation-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  } catch { /* Stille fout */ }
}

// ---- SMS helper ----
async function sendSMS(data: {
  to: string
  guestName: string
  reservationDate: string
  reservationTime: string
  partySize: number
  businessName: string
  businessPhone?: string
  type: 'confirmation' | 'reminder' | 'cancellation' | 'checkin'
}) {
  try {
    await fetch('/api/reservation-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  } catch { /* Stille fout */ }
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function KassaReservationsView({
  tenant,
  kassaTables,
  onClose,
  onStartOrder,
}: KassaReservationsViewProps) {
  const toast = useToast()

  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('today')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewReservationModal, setShowNewReservationModal] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [selectedShift, setSelectedShift] = useState<string | null>(null)
  const [guestProfilesDB, setGuestProfilesDB] = useState<GuestProfile[]>([])
  const [cancelConfirm, setCancelConfirm] = useState<Reservation | null>(null)
  const [reservationSettings, setReservationSettings] = useState<ReservationSettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS
    try {
      const saved = localStorage.getItem(`reservationSettings_${tenant}`)
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS
    } catch { return DEFAULT_SETTINGS }
  })
  // Tenant info for emails
  const [businessInfo, setBusinessInfo] = useState({ name: '', phone: '', email: '' })

  // Load tenant info
  useEffect(() => {
    supabase.from('tenants').select('name,phone,email').eq('slug', tenant).single()
      .then(({ data }) => {
        if (data) setBusinessInfo({ name: data.name || '', phone: data.phone || '', email: data.email || '' })
      })
  }, [tenant])

  // Load reservations from Supabase
  const loadReservations = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('reservations')
      .select('*')
      .eq('tenant_slug', tenant)
      .order('reservation_date', { ascending: true })
      .order('reservation_time', { ascending: true })
    if (data) setReservations(data as Reservation[])
    setLoading(false)
  }

  // Load guest profiles from Supabase (z6)
  const loadGuestProfiles = async () => {
    const { data } = await supabase
      .from('guest_profiles')
      .select('*')
      .eq('tenant_slug', tenant)
    if (data) {
      setGuestProfilesDB(data.map(g => ({
        id: g.id,
        name: g.name,
        phone: g.phone,
        email: g.email,
        isVip: g.is_vip,
        isBlocked: g.is_blocked,
        totalVisits: g.total_visits,
        totalNoShows: g.total_no_shows,
        totalSpent: g.total_spent,
        lastVisit: g.last_visit,
        notes: g.notes,
      })))
    }
  }

  useEffect(() => { loadReservations(); loadGuestProfiles() }, [tenant])

  // Save settings to localStorage
  const updateSettings = (updates: Partial<ReservationSettings>) => {
    const newSettings = { ...reservationSettings, ...updates }
    setReservationSettings(newSettings)
    localStorage.setItem(`reservationSettings_${tenant}`, JSON.stringify(newSettings))
  }

  // ---- Derived data ----
  const today = new Date().toISOString().split('T')[0]

  const todayReservations = useMemo(() =>
    reservations.filter(r => r.reservation_date === today && r.status !== 'CANCELLED')
      .sort((a, b) => a.reservation_time.localeCompare(b.reservation_time)),
    [reservations, today])

  const upcomingReservations = useMemo(() =>
    reservations.filter(r => r.reservation_date >= today && r.status !== 'CANCELLED')
      .sort((a, b) => a.reservation_date.localeCompare(b.reservation_date) || a.reservation_time.localeCompare(b.reservation_time)),
    [reservations, today])

  const todayStats = useMemo(() => ({
    total: todayReservations.filter(r => r.status !== 'WAITLIST').length,
    confirmed: todayReservations.filter(r => r.status === 'CONFIRMED').length,
    checkedIn: todayReservations.filter(r => r.status === 'CHECKED_IN').length,
    completed: todayReservations.filter(r => r.status === 'COMPLETED').length,
    noShow: todayReservations.filter(r => r.status === 'NO_SHOW').length,
    covers: todayReservations.filter(r => r.status !== 'WAITLIST').reduce((s, r) => s + r.party_size, 0),
    waitlist: waitlistReservations.length,
  }), [todayReservations, waitlistReservations])

  const filteredReservations = useMemo(() => {
    let base = viewMode === 'today' ? todayReservations : upcomingReservations
    // Filter wachtlijst uit normale weergave
    base = base.filter(r => r.status !== 'WAITLIST')
    // Filter op shift
    if (selectedShift) {
      const shift = reservationSettings.shifts?.find(s => s.id === selectedShift)
      if (shift) {
        base = base.filter(r => r.reservation_time >= shift.startTime && r.reservation_time <= shift.endTime)
      }
    }
    if (!searchQuery) return base
    const q = searchQuery.toLowerCase()
    return base.filter(r =>
      r.guest_name.toLowerCase().includes(q) ||
      r.guest_phone?.includes(q) ||
      r.guest_email?.toLowerCase().includes(q)
    )
  }, [searchQuery, viewMode, todayReservations, upcomingReservations, selectedShift, reservationSettings.shifts])

  const waitlistReservations = useMemo(() =>
    reservations.filter(r => r.status === 'WAITLIST' && r.reservation_date === today)
      .sort((a, b) => (a.waitlist_position || 0) - (b.waitlist_position || 0)),
    [reservations, today]
  )

  // Guest profiles (derived)
  // Combineer afgeleide profielen (reservaties) met Supabase VIP/blocked data
  const guestProfiles = useMemo<GuestProfile[]>(() => {
    const map = new Map<string, GuestProfile>()
    reservations.forEach(r => {
      const key = r.guest_phone || r.guest_email || r.guest_name
      if (!key) return
      // Check of er Supabase profiel is voor VIP/blocked
      const dbProfile = guestProfilesDB.find(g => 
        (g.phone && g.phone === r.guest_phone) || 
        (g.email && g.email === r.guest_email) ||
        g.name === r.guest_name
      )
      const existing = map.get(key)
      if (existing) {
        existing.totalVisits++
        if (r.status === 'NO_SHOW') existing.totalNoShows++
        if (r.status === 'COMPLETED') existing.totalSpent += r.total_spent || 0
        if (!existing.lastVisit || r.reservation_date > existing.lastVisit) existing.lastVisit = r.reservation_date
      } else {
        map.set(key, {
          id: dbProfile?.id || key,
          name: r.guest_name,
          phone: r.guest_phone,
          email: r.guest_email,
          isVip: dbProfile?.isVip || false,
          isBlocked: dbProfile?.isBlocked || false,
          totalVisits: 1,
          totalNoShows: r.status === 'NO_SHOW' ? 1 : 0,
          totalSpent: r.status === 'COMPLETED' ? (r.total_spent || 0) : 0,
          lastVisit: r.reservation_date,
          notes: dbProfile?.notes,
        })
      }
    })
    return Array.from(map.values())
  }, [reservations, guestProfilesDB])

  // Stats helpers
  const getNoShowRate = () => {
    const total = reservations.filter(r => r.status !== 'CANCELLED').length
    if (total === 0) return 0
    return Math.round((reservations.filter(r => r.status === 'NO_SHOW').length / total) * 100)
  }
  const getTodayCovers = () => todayReservations.reduce((s, r) => s + r.party_size, 0)

  // ---- CRUD actions ----
  const updateStatus = async (id: string, status: ReservationStatus, extra?: Partial<Reservation>) => {
    const updates: Record<string, unknown> = { status, ...extra }
    if (status === 'CHECKED_IN') updates.checked_in_at = new Date().toISOString()
    if (status === 'COMPLETED') updates.completed_at = new Date().toISOString()
    await supabase.from('reservations').update(updates).eq('id', id)
    await loadReservations()
  }

  const handleCheckIn = async (r: Reservation) => {
    await updateStatus(r.id, 'CHECKED_IN')
    toast.success(`${r.guest_name} ingecheckt!`)
    if (r.guest_email) {
      await sendReservationEmail({
        customerEmail: r.guest_email,
        customerName: r.guest_name,
        customerPhone: r.guest_phone,
        reservationDate: r.reservation_date,
        reservationTime: r.reservation_time,
        partySize: r.party_size,
        tableName: r.table_number,
        status: 'confirmed',
        businessName: businessInfo.name,
        businessPhone: businessInfo.phone,
        businessEmail: businessInfo.email,
      })
    }
    // z10 - SMS bij check-in
    if (r.guest_phone) {
      await sendSMS({
        to: r.guest_phone,
        guestName: r.guest_name,
        reservationDate: r.reservation_date,
        reservationTime: r.reservation_time,
        partySize: r.party_size,
        businessName: businessInfo.name,
        businessPhone: businessInfo.phone,
        type: 'checkin',
      })
    }
  }

  const handleNoShow = async (r: Reservation) => {
    await updateStatus(r.id, 'NO_SHOW')
    toast.error(`${r.guest_name} gemarkeerd als no-show`)
    // z9 - No-show fee aanrekenen als bescherming actief
    if (reservationSettings.noShowProtection && r.stripe_payment_method_id && r.guest_name) {
      try {
        await fetch('/api/reservation-card-auth', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentMethodId: r.stripe_payment_method_id,
            amount: reservationSettings.noShowFee || 25,
            businessName: businessInfo.name,
            guestName: r.guest_name,
          }),
        })
        toast.success(`No-show kost €${reservationSettings.noShowFee} aangerekend`)
      } catch { /* stille fout */ }
    }
  }

  const handleCancel = async (r: Reservation) => {
    // z4 - Check annuleringsbeleid deadline
    if (reservationSettings.cancellationDeadlineHours > 0) {
      const resDateTime = new Date(`${r.reservation_date}T${r.reservation_time}`)
      const deadlineTime = new Date(resDateTime.getTime() - reservationSettings.cancellationDeadlineHours * 60 * 60 * 1000)
      if (new Date() > deadlineTime && r.status !== 'WAITLIST') {
        setCancelConfirm(r)
        return
      }
    }
    await doCancelReservation(r)
  }

  const doCancelReservation = async (r: Reservation) => {
    await updateStatus(r.id, 'CANCELLED')
    setCancelConfirm(null)
    toast.success('Reservatie geannuleerd')
    if (r.guest_email) {
      await sendReservationEmail({
        customerEmail: r.guest_email,
        customerName: r.guest_name,
        reservationDate: r.reservation_date,
        reservationTime: r.reservation_time,
        partySize: r.party_size,
        status: 'cancelled',
        businessName: businessInfo.name,
        businessPhone: businessInfo.phone,
        businessEmail: businessInfo.email,
        cancellationReason: 'Geannuleerd door personeel',
      })
    }
    if (r.guest_phone) {
      await sendSMS({
        to: r.guest_phone,
        guestName: r.guest_name,
        reservationDate: r.reservation_date,
        reservationTime: r.reservation_time,
        partySize: r.party_size,
        businessName: businessInfo.name,
        type: 'cancellation',
      })
    }
  }

  const handleComplete = async (r: Reservation) => {
    await updateStatus(r.id, 'COMPLETED')
    toast.success('Reservatie afgerond')
    // z5 - Review uitnodiging automatisch sturen
    if (reservationSettings.autoSendReview && r.guest_email) {
      await sendReservationEmail({
        customerEmail: r.guest_email,
        customerName: r.guest_name,
        reservationDate: r.reservation_date,
        reservationTime: r.reservation_time,
        partySize: r.party_size,
        status: 'review',
        businessName: businessInfo.name,
        businessPhone: businessInfo.phone,
        businessEmail: businessInfo.email,
        reviewLink: reservationSettings.reviewLink,
      })
    }
  }

  // z3 - Wachtlijst bevestigen
  const handleConfirmFromWaitlist = async (r: Reservation) => {
    await updateStatus(r.id, 'CONFIRMED')
    toast.success(`${r.guest_name} bevestigd vanuit wachtlijst`)
    if (r.guest_email) {
      await sendReservationEmail({
        customerEmail: r.guest_email,
        customerName: r.guest_name,
        customerPhone: r.guest_phone,
        reservationDate: r.reservation_date,
        reservationTime: r.reservation_time,
        partySize: r.party_size,
        status: 'confirmed',
        businessName: businessInfo.name,
        businessPhone: businessInfo.phone,
        businessEmail: businessInfo.email,
      })
    }
    if (r.guest_phone) {
      await sendSMS({
        to: r.guest_phone,
        guestName: r.guest_name,
        reservationDate: r.reservation_date,
        reservationTime: r.reservation_time,
        partySize: r.party_size,
        businessName: businessInfo.name,
        businessPhone: businessInfo.phone,
        type: 'confirmation',
      })
    }
  }

  const handleConfirm = async (r: Reservation) => {
    await updateStatus(r.id, 'CONFIRMED')
    toast.success('Reservatie bevestigd')
    if (r.guest_email) {
      await sendReservationEmail({
        customerEmail: r.guest_email,
        customerName: r.guest_name,
        customerPhone: r.guest_phone,
        reservationDate: r.reservation_date,
        reservationTime: r.reservation_time,
        partySize: r.party_size,
        tableName: r.table_number,
        status: 'confirmed',
        businessName: businessInfo.name,
        businessPhone: businessInfo.phone,
        businessEmail: businessInfo.email,
      })
    }
    // z10 - SMS bevestiging
    if (r.guest_phone) {
      await sendSMS({
        to: r.guest_phone,
        guestName: r.guest_name,
        reservationDate: r.reservation_date,
        reservationTime: r.reservation_time,
        partySize: r.party_size,
        businessName: businessInfo.name,
        businessPhone: businessInfo.phone,
        type: 'confirmation',
      })
    }
  }

  // z6 - VIP/geblokkeerd opslaan in Supabase
  const handleToggleVip = async (guest: GuestProfile) => {
    const newVip = !guest.isVip
    await supabase.from('guest_profiles').upsert({
      tenant_slug: tenant,
      name: guest.name,
      phone: guest.phone || null,
      email: guest.email || null,
      is_vip: newVip,
      is_blocked: guest.isBlocked,
      notes: guest.notes || '',
    }, { onConflict: 'tenant_slug,phone' })
    await loadGuestProfiles()
    toast.success(newVip ? 'VIP status toegevoegd' : 'VIP status verwijderd')
  }

  const handleToggleBlocked = async (guest: GuestProfile) => {
    const newBlocked = !guest.isBlocked
    await supabase.from('guest_profiles').upsert({
      tenant_slug: tenant,
      name: guest.name,
      phone: guest.phone || null,
      email: guest.email || null,
      is_vip: guest.isVip,
      is_blocked: newBlocked,
      notes: guest.notes || '',
    }, { onConflict: 'tenant_slug,phone' })
    await loadGuestProfiles()
    toast.success(newBlocked ? 'Gast geblokkeerd' : 'Gast gedeblokkeerd')
  }

  const handleAssignTable = async (reservationId: string, tableNumber: string) => {
    await supabase.from('reservations').update({ table_number: tableNumber }).eq('id', reservationId)
    await loadReservations()
    toast.success('Tafel toegewezen')
  }

  const handleDeleteReservation = async (id: string) => {
    await supabase.from('reservations').delete().eq('id', id)
    await loadReservations()
    toast.success('Reservatie verwijderd')
  }

  const handleStartOrder = async (r: Reservation) => {
    if (r.status === 'CONFIRMED' || r.status === 'PENDING') {
      await updateStatus(r.id, 'CHECKED_IN')
    }
    const tableNr = r.table_number || ''
    if (tableNr) {
      onStartOrder(tableNr)
      toast.success(`Order gestart voor tafel ${tableNr}`)
    } else {
      toast.error('Wijs eerst een tafel toe aan deze reservatie')
    }
  }

  const handleAddReservation = async (data: Omit<Reservation, 'id' | 'tenant_slug' | 'total_spent' | 'created_at'>) => {
    const { data: inserted } = await supabase.from('reservations').insert([{
      ...data,
      tenant_slug: tenant,
      total_spent: 0,
    }]).select().single()

    await loadReservations()
    toast.success(`Reservatie voor ${data.guest_name} aangemaakt!`)
    setShowNewReservationModal(false)

    // Email sturen
    if (data.guest_email && inserted) {
      await sendReservationEmail({
        customerEmail: data.guest_email,
        customerName: data.guest_name,
        customerPhone: data.guest_phone,
        reservationDate: data.reservation_date,
        reservationTime: data.reservation_time,
        partySize: data.party_size,
        tableName: data.table_number,
        notes: data.notes,
        specialRequests: data.special_requests,
        occasion: data.occasion,
        status: data.status === 'CONFIRMED' ? 'confirmed' : 'pending',
        businessName: businessInfo.name,
        businessPhone: businessInfo.phone,
        businessEmail: businessInfo.email,
      })
    }
  }

  // ---- Formatting ----
  const formatDate = (date: string) => {
    const d = new Date(date)
    return d.toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  // ---- Render card (exact kopie) ----
  const renderReservationCard = (reservation: Reservation) => {
    const status = STATUS_CONFIG[reservation.status]
    const guest = guestProfiles.find(g => g.id === (reservation.guest_phone || reservation.guest_email || reservation.guest_name))

    return (
      <div
        key={reservation.id}
        className="bg-white rounded-xl border border-gray-200 p-4 hover:border-[#3C4D6B] transition-all cursor-pointer shadow-sm"
        onClick={() => setSelectedReservation(reservation)}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">{reservation.reservation_time}</span>
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1"
                style={{ backgroundColor: status.bgColor, color: status.color }}
              >
                {status.icon}
                {status.label}
              </span>
            </div>
            <h3 className="font-semibold text-lg mt-1">{reservation.guest_name}</h3>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-lg">
            <Users size={16} className="text-gray-400" />
            <span className="font-bold">{reservation.party_size}</span>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-1 text-sm text-gray-500 mb-3">
          {reservation.guest_phone && (
            <div className="flex items-center gap-2">
              <Phone size={14} />
              <span>{reservation.guest_phone}</span>
            </div>
          )}
          {reservation.table_number && (
            <div className="flex items-center gap-2">
              <MapPin size={14} />
              <span>Tafel {reservation.table_number}</span>
            </div>
          )}
          {reservation.notes && (
            <div className="flex items-center gap-2">
              <MessageSquare size={14} />
              <span className="truncate">{reservation.notes}</span>
            </div>
          )}
        </div>

        {/* Guest badges */}
        {guest && (
          <div className="flex items-center gap-2 mb-3">
            {guest.isVip && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-600 flex items-center gap-1">
                <Star size={12} /> VIP
              </span>
            )}
            {guest.totalNoShows > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-500">
                {guest.totalNoShows} no-shows
              </span>
            )}
            {guest.totalVisits > 5 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-600">
                {guest.totalVisits} bezoeken
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {reservation.status === 'CONFIRMED' && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); handleStartOrder(reservation) }}
                className="flex-1 py-2 px-3 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center gap-1"
              >
                <UtensilsCrossed size={16} />
                Start Order
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleNoShow(reservation) }}
                className="py-2 px-3 rounded-lg bg-red-500/20 text-red-500 text-sm font-medium hover:bg-red-500/30 transition-colors"
              >
                <UserX size={16} />
              </button>
            </>
          )}
          {reservation.status === 'CHECKED_IN' && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); handleStartOrder(reservation) }}
                className="flex-1 py-2 px-3 rounded-lg bg-[#3C4D6B] text-white text-sm font-medium hover:bg-[#4A5D7B] transition-colors flex items-center justify-center gap-1"
              >
                <UtensilsCrossed size={16} />
                Naar Kassa
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleComplete(reservation) }}
                className="py-2 px-3 rounded-lg bg-gray-500/20 text-gray-500 text-sm font-medium hover:bg-gray-500/30 transition-colors"
              >
                <CheckCircle2 size={16} />
              </button>
            </>
          )}
          {reservation.status === 'PENDING' && (
            <button
              onClick={(e) => { e.stopPropagation(); handleConfirm(reservation) }}
              className="flex-1 py-2 px-3 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-1"
            >
              <CheckCircle2 size={16} />
              Bevestigen
            </button>
          )}
        </div>
      </div>
    )
  }

  const isEnabled = reservationSettings.isEnabled

  // ---- If not enabled ----
  if (!isEnabled) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CalendarDays size={40} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Reservatiesysteem</h2>
          <p className="text-gray-500 mb-6">
            Beheer tafelreservaties, ontvang online boekingen en houd uw bezetting bij.
            Perfect voor restaurants, brasseries en cafés.
          </p>
          <button
            onClick={() => updateSettings({ isEnabled: true })}
            className="px-6 py-3 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors"
          >
            Reservaties Inschakelen
          </button>
          <button onClick={onClose} className="block mx-auto mt-4 text-gray-400 hover:text-gray-600 text-sm">Sluiten</button>
        </div>
      </div>
    )
  }

  // ---- Main render ----
  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Toast */}
      {toast.msg && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-xl text-white font-medium shadow-lg transition-all ${toast.msg.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.msg.text}
        </div>
      )}

      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-green-100">
              <CalendarDays size={24} className="text-green-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Reservaties</h1>
              <p className="text-sm text-gray-400">
                {formatDate(selectedDate)} • {todayStats.covers} personen verwacht
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewReservationModal(true)}
              className="px-4 py-2 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 transition-colors flex items-center gap-2"
            >
              <Plus size={20} />
              Nieuwe Reservatie
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-6 gap-3 mb-4">
          <div className="bg-gray-100 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{todayStats.total}</p>
            <p className="text-xs text-gray-400">Totaal</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-500">{todayStats.confirmed}</p>
            <p className="text-xs text-blue-400">Bevestigd</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-emerald-500">{todayStats.checkedIn}</p>
            <p className="text-xs text-emerald-400">Ingecheckt</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-gray-400">{todayStats.completed}</p>
            <p className="text-xs text-gray-400">Afgerond</p>
          </div>
          <div className="bg-red-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-red-400">{todayStats.noShow}</p>
            <p className="text-xs text-red-400">No-show</p>
          </div>
          <div className="bg-[#3C4D6B]/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{todayStats.covers}</p>
            <p className="text-xs text-gray-400">Personen</p>
          </div>
          {todayStats.waitlist > 0 && (
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-purple-500">{todayStats.waitlist}</p>
              <p className="text-xs text-purple-400">Wachtlijst</p>
            </div>
          )}
        </div>

        {/* Shift filter (z2) */}
        {reservationSettings.shifts?.some(s => s.isActive) && viewMode === 'today' && (
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setSelectedShift(null)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedShift === null ? 'bg-[#3C4D6B] text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-900'}`}
            >
              Alle shifts
            </button>
            {reservationSettings.shifts.filter(s => s.isActive).map(shift => (
              <button
                key={shift.id}
                onClick={() => setSelectedShift(shift.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedShift === shift.id ? 'bg-[#3C4D6B] text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-900'}`}
              >
                {shift.name} {shift.startTime}–{shift.endTime}
              </button>
            ))}
          </div>
        )}

        {/* View Toggle & Search */}
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-xl p-1 overflow-x-auto">
            {[
              { id: 'today', label: 'Vandaag', icon: <Clock size={16} /> },
              { id: 'calendar', label: 'Kalender', icon: <CalendarDays size={16} /> },
              { id: 'list', label: 'Lijst', icon: <List size={16} /> },
              { id: 'floorplan', label: 'Plattegrond', icon: <LayoutGrid size={16} /> },
              { id: 'guests', label: 'Gasten', icon: <Users size={16} /> },
              { id: 'stats', label: 'Rapporten', icon: <AlertCircle size={16} /> },
              { id: 'settings', label: 'Instellingen', icon: <Settings size={16} /> },
            ].map((view) => (
              <button
                key={view.id}
                onClick={() => setViewMode(view.id as ViewMode)}
                className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  viewMode === view.id
                    ? 'bg-[#3C4D6B] text-white'
                    : 'text-gray-400 hover:text-gray-900'
                }`}
              >
                {view.icon}
                {view.label}
              </button>
            ))}
          </div>

          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Zoek op naam, telefoon of email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-100 border border-gray-200 focus:border-[#3C4D6B] outline-none"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && viewMode === 'today' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredReservations.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <CalendarDays size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-400">Geen reservaties vandaag</p>
                  <button
                    onClick={() => setShowNewReservationModal(true)}
                    className="mt-4 px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors"
                  >
                    Eerste reservatie aanmaken
                  </button>
                </div>
              ) : (
                filteredReservations.map(renderReservationCard)
              )}
            </div>

            {/* z3 - Wachtlijst sectie */}
            {waitlistReservations.length > 0 && (
              <div>
                <h3 className="font-bold text-purple-600 mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-purple-500 inline-block" />
                  Wachtlijst ({waitlistReservations.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {waitlistReservations.map((r) => (
                    <div key={r.id} className="bg-purple-50 border border-purple-200 rounded-xl p-4 cursor-pointer hover:border-purple-400 transition-colors" onClick={() => setSelectedReservation(r)}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-sm font-bold text-purple-600">{r.reservation_time}</span>
                          {r.waitlist_position && <span className="ml-2 text-xs bg-purple-200 text-purple-700 px-2 py-0.5 rounded-full">#{r.waitlist_position}</span>}
                        </div>
                        <span className="flex items-center gap-1 text-sm text-purple-500"><Users size={14} />{r.party_size}</span>
                      </div>
                      <p className="font-semibold text-gray-900">{r.guest_name}</p>
                      {r.guest_phone && <p className="text-sm text-gray-500">{r.guest_phone}</p>}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleConfirmFromWaitlist(r) }}
                        className="mt-3 w-full py-2 rounded-lg bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 transition-colors"
                      >
                        Bevestigen
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && viewMode === 'list' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-[100px_1fr_120px_100px_150px_120px] gap-4 p-4 border-b border-gray-200 bg-gray-50 text-sm font-medium text-gray-400">
              <span>Tijd</span>
              <span>Gast</span>
              <span>Personen</span>
              <span>Tafel</span>
              <span>Status</span>
              <span>Acties</span>
            </div>
            {filteredReservations.map((r) => {
              const status = STATUS_CONFIG[r.status]
              return (
                <div
                  key={r.id}
                  className="grid grid-cols-[100px_1fr_120px_100px_150px_120px] gap-4 p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer items-center"
                  onClick={() => setSelectedReservation(r)}
                >
                  <span className="font-bold">{r.reservation_time}</span>
                  <div>
                    <p className="font-medium">{r.guest_name}</p>
                    {r.guest_phone && <p className="text-sm text-gray-400">{r.guest_phone}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-gray-400" />
                    <span>{r.party_size}</span>
                  </div>
                  <span>{r.table_number || '-'}</span>
                  <span
                    className="px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 w-fit"
                    style={{ backgroundColor: status.bgColor, color: status.color }}
                  >
                    {status.icon}
                    {status.label}
                  </span>
                  <div className="flex gap-1">
                    {r.status === 'CONFIRMED' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCheckIn(r) }}
                        className="p-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600"
                      >
                        <UserCheck size={16} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!loading && viewMode === 'calendar' && (
          <div>
            {/* Date selector */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                onClick={() => {
                  const d = new Date(selectedDate)
                  d.setDate(d.getDate() - 1)
                  setSelectedDate(d.toISOString().split('T')[0])
                }}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="text-center">
                <p className="text-xl font-bold">{formatDate(selectedDate)}</p>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="mt-2 px-3 py-1 rounded-lg bg-gray-100 border border-gray-200 text-sm"
                />
              </div>
              <button
                onClick={() => {
                  const d = new Date(selectedDate)
                  d.setDate(d.getDate() + 1)
                  setSelectedDate(d.toISOString().split('T')[0])
                }}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {reservations.filter(r => r.reservation_date === selectedDate && r.status !== 'CANCELLED').length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <CalendarDays size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-400">Geen reservaties op {formatDate(selectedDate)}</p>
                </div>
              ) : (
                reservations
                  .filter(r => r.reservation_date === selectedDate && r.status !== 'CANCELLED')
                  .sort((a, b) => a.reservation_time.localeCompare(b.reservation_time))
                  .map(renderReservationCard)
              )}
            </div>
          </div>
        )}

        {!loading && viewMode === 'floorplan' && (
          <div>
            {/* Legend */}
            <div className="flex items-center gap-4 mb-4 text-sm">
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-emerald-500" /><span>Vrij</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-purple-500" /><span>Gereserveerd</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-blue-500" /><span>Bezet</span></div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 min-h-[500px]">
              {kassaTables.length === 0 ? (
                <div className="text-center py-12">
                  <LayoutGrid size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-400">Nog geen tafels aangemaakt</p>
                  <p className="text-sm text-gray-400 mt-1">Maak tafels aan via de Kassa → Plattegrond</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                  {kassaTables.map((table) => {
                    const tableReservation = todayReservations.find(
                      r => r.table_number === table.number && r.status !== 'CANCELLED' && r.status !== 'COMPLETED'
                    )
                    const statusColor = table.status === 'FREE' ? 'bg-emerald-500'
                      : table.status === 'RESERVED' ? 'bg-purple-500'
                      : table.status === 'OCCUPIED' ? 'bg-blue-500'
                      : 'bg-amber-500'
                    return (
                      <div
                        key={table.id}
                        onClick={() => tableReservation && setSelectedReservation(tableReservation)}
                        className={`aspect-square rounded-xl ${statusColor} p-3 flex flex-col items-center justify-center cursor-pointer hover:opacity-90 transition-opacity relative`}
                      >
                        <span className="text-white text-2xl font-bold">{table.number}</span>
                        <span className="text-white/80 text-xs">{table.seats} pers.</span>
                        {tableReservation && (
                          <div className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow">
                            <CalendarDays size={14} className="text-purple-600" />
                          </div>
                        )}
                        {tableReservation && (
                          <div className="absolute bottom-1 left-1 right-1 bg-black/30 rounded px-1 py-0.5 text-center">
                            <span className="text-white text-[10px] truncate block">{tableReservation.guest_name}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && viewMode === 'guests' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-400">Totaal Gasten</p>
                <p className="text-2xl font-bold">{guestProfiles.length}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-400">VIP Gasten</p>
                <p className="text-2xl font-bold text-amber-500">{guestProfiles.filter(g => g.isVip).length}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-400">Geblokkeerd</p>
                <p className="text-2xl font-bold text-red-400">{guestProfiles.filter(g => g.isBlocked).length}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-400">Totaal Omzet</p>
                <p className="text-2xl font-bold text-green-500">€{guestProfiles.reduce((s, g) => s + g.totalSpent, 0).toFixed(2)}</p>
              </div>
            </div>

            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Zoek gast op naam, telefoon of email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-gray-200"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {guestProfiles.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Users size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-400">Nog geen gastprofielen</p>
                  <p className="text-sm text-gray-400 mt-1">Profielen worden automatisch aangemaakt bij reservaties</p>
                </div>
              ) : (
                guestProfiles
                  .filter(g => {
                    if (!searchQuery) return true
                    const q = searchQuery.toLowerCase()
                    return g.name.toLowerCase().includes(q) ||
                      g.phone?.toLowerCase().includes(q) ||
                      g.email?.toLowerCase().includes(q)
                  })
                  .sort((a, b) => b.totalSpent - a.totalSpent)
                  .map((guest) => (
                    <div key={guest.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{guest.name}</h3>
                            {guest.isVip && <Star size={16} className="text-amber-400 fill-amber-400" />}
                            {guest.isBlocked && <Ban size={16} className="text-red-400" />}
                          </div>
                          {guest.phone && (
                            <a href={`tel:${guest.phone}`} className="text-sm text-gray-400 hover:underline flex items-center gap-1">
                              <Phone size={12} /> {guest.phone}
                            </a>
                          )}
                          {guest.email && (
                            <a href={`mailto:${guest.email}`} className="text-sm text-gray-400 hover:underline flex items-center gap-1">
                              <Mail size={12} /> {guest.email}
                            </a>
                          )}
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-bold text-lg">{guest.totalVisits}</p>
                          <p className="text-gray-400 text-xs">bezoeken</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm mb-3 py-2 border-t border-b border-gray-100">
                        <span className="text-green-500 font-medium">€{guest.totalSpent.toFixed(2)} besteed</span>
                        {guest.totalNoShows > 0 && (
                          <span className="text-red-400 flex items-center gap-1">
                            <AlertCircle size={12} /> {guest.totalNoShows} no-shows
                          </span>
                        )}
                        {guest.lastVisit && (
                          <span className="text-gray-400">
                            Laatst: {new Date(guest.lastVisit).toLocaleDateString('nl-BE')}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleVip(guest)}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                            guest.isVip
                              ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                              : 'bg-gray-100 border border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <Star size={14} /> VIP
                        </button>
                        <button
                          onClick={() => handleToggleBlocked(guest)}
                          className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                            guest.isBlocked
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-gray-100 border border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <Ban size={14} />
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {!loading && viewMode === 'stats' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold">📊 Reservatie Rapporten</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="text-sm text-gray-400 mb-1">No-show Rate</p>
                <p className="text-3xl font-bold text-red-400">{getNoShowRate()}%</p>
                <p className="text-xs text-gray-400 mt-1">Totaal van alle reservaties</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="text-sm text-gray-400 mb-1">Covers Vandaag</p>
                <p className="text-3xl font-bold text-green-500">{getTodayCovers()}</p>
                <p className="text-xs text-gray-400 mt-1">Aantal gasten verwacht</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="text-sm text-gray-400 mb-1">Totaal Reservaties</p>
                <p className="text-3xl font-bold">{reservations.length}</p>
                <p className="text-xs text-gray-400 mt-1">Alle tijd</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="text-sm text-gray-400 mb-1">Omzet</p>
                <p className="text-3xl font-bold text-green-500">
                  €{reservations.filter(r => r.status === 'COMPLETED').reduce((s, r) => s + (r.total_spent || 0), 0).toFixed(2)}
                </p>
                <p className="text-xs text-gray-400 mt-1">Afgeronde reservaties</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h4 className="font-bold mb-4">Status Overzicht</h4>
              <div className="space-y-3">
                {[
                  { status: 'CONFIRMED', label: 'Bevestigd', color: '#3b82f6' },
                  { status: 'CHECKED_IN', label: 'Ingecheckt', color: '#22c55e' },
                  { status: 'COMPLETED', label: 'Afgerond', color: '#6b7280' },
                  { status: 'NO_SHOW', label: 'No-show', color: '#ef4444' },
                  { status: 'CANCELLED', label: 'Geannuleerd', color: '#9ca3af' },
                ].map(({ status, label, color }) => {
                  const count = reservations.filter(r => r.status === status).length
                  const percentage = reservations.length > 0 ? (count / reservations.length) * 100 : 0
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <span className="w-24 text-sm">{label}</span>
                      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${percentage}%`, backgroundColor: color }} />
                      </div>
                      <span className="w-12 text-right text-sm font-medium">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h4 className="font-bold mb-4">🏆 Top 5 Gasten (Omzet)</h4>
              <div className="space-y-3">
                {guestProfiles.sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5).map((guest, index) => (
                  <div key={guest.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold">{index + 1}</span>
                      <div>
                        <p className="font-medium">{guest.name}</p>
                        <p className="text-xs text-gray-400">{guest.totalVisits} bezoeken</p>
                      </div>
                    </div>
                    <span className="font-bold text-green-500">€{guest.totalSpent.toFixed(2)}</span>
                  </div>
                ))}
                {guestProfiles.length === 0 && <p className="text-gray-400 text-center py-4">Nog geen gastdata</p>}
              </div>
            </div>
          </div>
        )}

        {!loading && viewMode === 'settings' && (
          <div className="max-w-2xl">
            <h3 className="text-lg font-bold mb-4">Reservatie Instellingen</h3>
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
              {/* Enable toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Reservaties ingeschakeld</p>
                  <p className="text-sm text-gray-400">Toon reservaties in de kassa</p>
                </div>
                <button
                  onClick={() => updateSettings({ isEnabled: !isEnabled })}
                  className={`w-14 h-7 rounded-full transition-colors ${isEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-8' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Online reservations */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Online reservaties</p>
                  <p className="text-sm text-gray-400">Laat klanten online reserveren</p>
                </div>
                <button
                  onClick={() => updateSettings({ acceptOnline: !reservationSettings.acceptOnline })}
                  className={`w-14 h-7 rounded-full transition-colors ${reservationSettings.acceptOnline ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${reservationSettings.acceptOnline ? 'translate-x-8' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Max party size */}
              <div>
                <label className="font-medium block mb-2">Max. groepsgrootte</label>
                <input
                  type="number"
                  value={reservationSettings.maxPartySize}
                  onChange={(e) => updateSettings({ maxPartySize: parseInt(e.target.value) || 12 })}
                  className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-200"
                />
              </div>

              {/* Default duration */}
              <div>
                <label className="font-medium block mb-2">Standaard reservatieduur (minuten)</label>
                <input
                  type="number"
                  value={reservationSettings.defaultDurationMinutes}
                  onChange={(e) => updateSettings({ defaultDurationMinutes: parseInt(e.target.value) || 90 })}
                  className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-200"
                />
              </div>

              {/* Slot duration */}
              <div>
                <label className="font-medium block mb-2">Tijdslot interval (minuten)</label>
                <select
                  value={reservationSettings.slotDurationMinutes}
                  onChange={(e) => updateSettings({ slotDurationMinutes: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-200"
                >
                  <option value={15}>Elke 15 minuten</option>
                  <option value={30}>Elke 30 minuten</option>
                  <option value={60}>Elk uur</option>
                </select>
              </div>

              {/* Booking window */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium block mb-2">Min. vooraf (uren)</label>
                  <input
                    type="number"
                    min="0"
                    value={reservationSettings.minAdvanceHours}
                    onChange={(e) => updateSettings({ minAdvanceHours: parseInt(e.target.value) || 2 })}
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-200"
                  />
                </div>
                <div>
                  <label className="font-medium block mb-2">Max. vooraf (dagen)</label>
                  <input
                    type="number"
                    min="1"
                    value={reservationSettings.maxAdvanceDays}
                    onChange={(e) => updateSettings({ maxAdvanceDays: parseInt(e.target.value) || 60 })}
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-200"
                  />
                </div>
              </div>

              {/* Closed days */}
              <div className="border-t border-gray-100 pt-6">
                <label className="font-medium block mb-2">Gesloten dagen</label>
                <p className="text-sm text-gray-400 mb-4">Dagen waarop geen reservaties mogelijk zijn</p>
                <div className="flex flex-wrap gap-2">
                  {['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'].map((day, index) => {
                    const isClosed = reservationSettings.closedDays?.includes(index)
                    return (
                      <button
                        key={day}
                        onClick={() => {
                          const currentDays = reservationSettings.closedDays || []
                          const newDays = isClosed
                            ? currentDays.filter(d => d !== index)
                            : [...currentDays, index]
                          updateSettings({ closedDays: newDays })
                        }}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          isClosed
                            ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                            : 'bg-gray-100 border border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* z2 - Shifts beheer */}
              <div className="border-t border-gray-100 pt-6">
                <h4 className="font-bold mb-4">🍽️ Shifts Beheer</h4>
                <p className="text-sm text-gray-400 mb-4">Definieer lunch en diner shifts om reservaties te filteren.</p>
                <div className="space-y-3">
                  {(reservationSettings.shifts || []).map((shift, idx) => (
                    <div key={shift.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <button
                        onClick={() => {
                          const newShifts = [...(reservationSettings.shifts || [])]
                          newShifts[idx] = { ...shift, isActive: !shift.isActive }
                          updateSettings({ shifts: newShifts })
                        }}
                        className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 ${shift.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform mx-auto ${shift.isActive ? 'translate-x-2' : '-translate-x-2'}`} />
                      </button>
                      <input
                        type="text"
                        value={shift.name}
                        onChange={(e) => {
                          const newShifts = [...(reservationSettings.shifts || [])]
                          newShifts[idx] = { ...shift, name: e.target.value }
                          updateSettings({ shifts: newShifts })
                        }}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm"
                      />
                      <input type="time" value={shift.startTime}
                        onChange={(e) => {
                          const newShifts = [...(reservationSettings.shifts || [])]
                          newShifts[idx] = { ...shift, startTime: e.target.value }
                          updateSettings({ shifts: newShifts })
                        }}
                        className="px-2 py-1.5 rounded-lg border border-gray-200 text-sm"
                      />
                      <span className="text-gray-400 text-sm">→</span>
                      <input type="time" value={shift.endTime}
                        onChange={(e) => {
                          const newShifts = [...(reservationSettings.shifts || [])]
                          newShifts[idx] = { ...shift, endTime: e.target.value }
                          updateSettings({ shifts: newShifts })
                        }}
                        className="px-2 py-1.5 rounded-lg border border-gray-200 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* z4 - Annuleringsbeleid */}
              <div className="border-t border-gray-100 pt-6">
                <h4 className="font-bold mb-4">❌ Annuleringsbeleid</h4>
                <div className="space-y-4">
                  <div>
                    <label className="font-medium block mb-2">Annulering mogelijk tot (uren voor reservatie)</label>
                    <p className="text-sm text-gray-400 mb-2">0 = altijd mogelijk, 24 = tot 24u van tevoren</p>
                    <input type="number" min="0"
                      value={reservationSettings.cancellationDeadlineHours}
                      onChange={(e) => updateSettings({ cancellationDeadlineHours: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-200"
                    />
                  </div>
                  <div>
                    <label className="font-medium block mb-2">Boodschap bij te late annulering</label>
                    <textarea
                      value={reservationSettings.cancellationMessage}
                      onChange={(e) => updateSettings({ cancellationMessage: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-200 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* z5 - Review uitnodiging */}
              <div className="border-t border-gray-100 pt-6">
                <h4 className="font-bold mb-4">⭐ Review Uitnodiging</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Automatisch review email sturen</p>
                      <p className="text-sm text-gray-400">Bij afronden van reservatie</p>
                    </div>
                    <button
                      onClick={() => updateSettings({ autoSendReview: !reservationSettings.autoSendReview })}
                      className={`w-14 h-7 rounded-full transition-colors ${reservationSettings.autoSendReview ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${reservationSettings.autoSendReview ? 'translate-x-8' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  <div>
                    <label className="font-medium block mb-2">Review link (Google Maps / TripAdvisor)</label>
                    <input type="url"
                      value={reservationSettings.reviewLink}
                      onChange={(e) => updateSettings({ reviewLink: e.target.value })}
                      placeholder="https://g.page/jouwzaak/review"
                      className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-200"
                    />
                  </div>
                </div>
              </div>

              {/* z8 - Borg/aanbetaling */}
              <div className="border-t border-gray-100 pt-6">
                <h4 className="font-bold mb-4">💳 Borg & Aanbetaling</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Borg vereisen bij online reservatie</p>
                      <p className="text-sm text-gray-400">Klant betaalt borg via Stripe</p>
                    </div>
                    <button
                      onClick={() => updateSettings({ depositRequired: !reservationSettings.depositRequired })}
                      className={`w-14 h-7 rounded-full transition-colors ${reservationSettings.depositRequired ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${reservationSettings.depositRequired ? 'translate-x-8' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  {reservationSettings.depositRequired && (
                    <div>
                      <label className="font-medium block mb-2">Borgbedrag (€)</label>
                      <input type="number" min="0" step="5"
                        value={reservationSettings.depositAmount}
                        onChange={(e) => updateSettings({ depositAmount: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-200"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* z9 - No-show bescherming */}
              <div className="border-t border-gray-100 pt-6">
                <h4 className="font-bold mb-4">🛡️ No-show Bescherming</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Creditcard registreren bij reservatie</p>
                      <p className="text-sm text-gray-400">Kaart wordt bewaard, pas belast bij no-show</p>
                    </div>
                    <button
                      onClick={() => updateSettings({ noShowProtection: !reservationSettings.noShowProtection })}
                      className={`w-14 h-7 rounded-full transition-colors ${reservationSettings.noShowProtection ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${reservationSettings.noShowProtection ? 'translate-x-8' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  {reservationSettings.noShowProtection && (
                    <div>
                      <label className="font-medium block mb-2">No-show kost (€)</label>
                      <input type="number" min="0" step="5"
                        value={reservationSettings.noShowFee}
                        onChange={(e) => updateSettings({ noShowFee: parseFloat(e.target.value) || 25 })}
                        className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-200"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* z7 - Online booking widget */}
              <div className="border-t border-gray-100 pt-6">
                <h4 className="font-bold mb-4">🌐 Online Booking Widget</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Online reserveren inschakelen</p>
                      <p className="text-sm text-gray-400">Klanten kunnen online reserveren</p>
                    </div>
                    <button
                      onClick={() => updateSettings({ bookingPageEnabled: !reservationSettings.bookingPageEnabled })}
                      className={`w-14 h-7 rounded-full transition-colors ${reservationSettings.bookingPageEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${reservationSettings.bookingPageEnabled ? 'translate-x-8' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-sm font-medium text-blue-700 mb-1">📎 Booking link voor klanten:</p>
                    <p className="text-xs text-blue-600 font-mono break-all">
                      {typeof window !== 'undefined' ? `${window.location.origin}/shop/${tenant}/reserveren` : `/shop/${tenant}/reserveren`}
                    </p>
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/shop/${tenant}/reserveren`
                        navigator.clipboard?.writeText(url)
                        toast.success('Link gekopieerd!')
                      }}
                      className="mt-2 px-3 py-1.5 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Kopieer link
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* z4 - Annulering deadline modal */}
      {cancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-lg mb-2">⚠️ Annulering na deadline</h3>
            <p className="text-gray-600 text-sm mb-4">{reservationSettings.cancellationMessage}</p>
            <p className="text-gray-500 text-sm mb-6">Wilt u toch annuleren?</p>
            <div className="flex gap-3">
              <button onClick={() => setCancelConfirm(null)} className="flex-1 py-3 rounded-xl bg-gray-100 font-medium">Nee, terug</button>
              <button onClick={() => doCancelReservation(cancelConfirm)} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium">Ja, annuleren</button>
            </div>
          </div>
        </div>
      )}

      {/* New Reservation Modal */}
      {showNewReservationModal && (
        <NewReservationModal
          onClose={() => setShowNewReservationModal(false)}
          onSave={handleAddReservation}
          tables={kassaTables}
          defaultDurationMinutes={reservationSettings.defaultDurationMinutes}
          maxPartySize={reservationSettings.maxPartySize}
        />
      )}

      {/* Reservation Detail Modal */}
      {selectedReservation && (
        <ReservationDetailModal
          reservation={selectedReservation}
          onClose={() => setSelectedReservation(null)}
          onCheckIn={async () => { await handleCheckIn(selectedReservation); setSelectedReservation(null) }}
          onNoShow={async () => { await handleNoShow(selectedReservation); setSelectedReservation(null) }}
          onCancel={async () => { await handleCancel(selectedReservation); setSelectedReservation(null) }}
          onComplete={async () => { await handleComplete(selectedReservation); setSelectedReservation(null) }}
          onConfirm={async () => { await handleConfirm(selectedReservation); setSelectedReservation(null) }}
          onAssignTable={async (tableNumber) => { await handleAssignTable(selectedReservation.id, tableNumber); setSelectedReservation(null) }}
          onDelete={async () => { await handleDeleteReservation(selectedReservation.id); setSelectedReservation(null) }}
          onStartOrder={() => { handleStartOrder(selectedReservation); setSelectedReservation(null) }}
          tables={kassaTables}
          guestProfile={guestProfiles.find(g => g.id === (selectedReservation.guest_phone || selectedReservation.guest_email || selectedReservation.guest_name))}
        />
      )}
    </div>
  )
}

// ============================================================
// NEW RESERVATION MODAL (exact kopie)
// ============================================================

interface NewReservationModalProps {
  onClose: () => void
  onSave: (data: Omit<Reservation, 'id' | 'tenant_slug' | 'total_spent' | 'created_at'>) => void
  tables: KassaTable[]
  defaultDurationMinutes: number
  maxPartySize: number
}

function NewReservationModal({ onClose, onSave, tables, defaultDurationMinutes, maxPartySize }: NewReservationModalProps) {
  const [formData, setFormData] = useState({
    guest_name: '',
    guest_phone: '',
    guest_email: '',
    party_size: 2,
    reservation_date: new Date().toISOString().split('T')[0],
    reservation_time: '19:00',
    duration_minutes: defaultDurationMinutes,
    table_number: '',
    notes: '',
    special_requests: '',
    occasion: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.guest_name.trim()) newErrors.guest_name = 'Naam is verplicht'
    if (!formData.reservation_date) newErrors.reservation_date = 'Datum is verplicht'
    if (!formData.reservation_time) newErrors.reservation_time = 'Tijd is verplicht'
    if (formData.party_size < 1) newErrors.party_size = 'Min. 1 persoon'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validateForm()) return
    onSave({ ...formData, status: 'CONFIRMED' })
  }

  const timeSlots: string[] = []
  for (let h = 11; h <= 22; h++) {
    timeSlots.push(`${h.toString().padStart(2, '0')}:00`)
    timeSlots.push(`${h.toString().padStart(2, '0')}:30`)
  }

  const availableTables = tables.filter(t => t.seats >= formData.party_size)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white p-6 pb-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <CalendarDays size={24} className="text-green-500" />
              Nieuwe Reservatie
            </h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {/* Naam */}
          <div>
            <label className="block text-sm font-medium mb-1">Naam gast *</label>
            <input
              type="text"
              value={formData.guest_name}
              onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
              placeholder="Jan Janssen"
              className={`w-full px-4 py-3 rounded-xl bg-gray-100 border ${errors.guest_name ? 'border-red-500' : 'border-gray-200'} focus:border-green-500 outline-none`}
            />
            {errors.guest_name && <p className="text-red-500 text-xs mt-1">{errors.guest_name}</p>}
          </div>

          {/* Telefoon & Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Telefoon</label>
              <input
                type="tel"
                value={formData.guest_phone}
                onChange={(e) => setFormData({ ...formData, guest_phone: e.target.value })}
                placeholder="+32 ..."
                className="w-full px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 focus:border-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={formData.guest_email}
                onChange={(e) => setFormData({ ...formData, guest_email: e.target.value })}
                placeholder="jan@email.be"
                className="w-full px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 focus:border-green-500 outline-none"
              />
            </div>
          </div>

          {/* Datum & Tijd */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Datum *</label>
              <input
                type="date"
                value={formData.reservation_date}
                onChange={(e) => setFormData({ ...formData, reservation_date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className={`w-full px-4 py-3 rounded-xl bg-gray-100 border ${errors.reservation_date ? 'border-red-500' : 'border-gray-200'} focus:border-green-500 outline-none`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tijd *</label>
              <select
                value={formData.reservation_time}
                onChange={(e) => setFormData({ ...formData, reservation_time: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 focus:border-green-500 outline-none"
              >
                {timeSlots.map((time) => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Personen & Duur */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Aantal personen *</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, party_size: Math.max(1, formData.party_size - 1) })}
                  className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-xl font-bold hover:bg-gray-50"
                >-</button>
                <div className="flex-1 text-center">
                  <span className="text-2xl font-bold">{formData.party_size}</span>
                  <span className="text-sm text-gray-400 ml-1">pers.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, party_size: Math.min(maxPartySize || 20, formData.party_size + 1) })}
                  className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-xl font-bold hover:bg-gray-50"
                >+</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Duur</label>
              <select
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 focus:border-green-500 outline-none"
              >
                <option value={60}>1 uur</option>
                <option value={90}>1,5 uur</option>
                <option value={120}>2 uur</option>
                <option value={150}>2,5 uur</option>
                <option value={180}>3 uur</option>
              </select>
            </div>
          </div>

          {/* Tafel */}
          <div>
            <label className="block text-sm font-medium mb-1">Tafel (optioneel)</label>
            <select
              value={formData.table_number}
              onChange={(e) => setFormData({ ...formData, table_number: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 focus:border-green-500 outline-none"
            >
              <option value="">Automatisch toewijzen</option>
              {availableTables.map((table) => (
                <option key={table.id} value={table.number}>
                  Tafel {table.number} ({table.seats} pers.)
                </option>
              ))}
            </select>
          </div>

          {/* Gelegenheid */}
          <div>
            <label className="block text-sm font-medium mb-1">Gelegenheid</label>
            <div className="flex flex-wrap gap-2">
              {['', 'Verjaardag', 'Jubileum', 'Zakelijk', 'Romantisch', 'Feest'].map((occ) => (
                <button
                  key={occ}
                  type="button"
                  onClick={() => setFormData({ ...formData, occasion: occ })}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    formData.occasion === occ
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-400 hover:text-gray-900'
                  }`}
                >
                  {occ || 'Geen'}
                </button>
              ))}
            </div>
          </div>

          {/* Opmerkingen */}
          <div>
            <label className="block text-sm font-medium mb-1">Opmerkingen</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Interne opmerkingen..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 focus:border-green-500 outline-none resize-none"
            />
          </div>

          {/* Speciale wensen */}
          <div>
            <label className="block text-sm font-medium mb-1">Speciale wensen gast</label>
            <textarea
              value={formData.special_requests}
              onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
              placeholder="Allergieën, kinderstoel, rolstoel..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 focus:border-green-500 outline-none resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white p-6 pt-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-gray-100 font-medium hover:bg-gray-200 transition-colors"
          >
            Annuleren
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 transition-colors"
          >
            Reservatie Aanmaken
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// RESERVATION DETAIL MODAL (exact kopie)
// ============================================================

interface ReservationDetailModalProps {
  reservation: Reservation
  onClose: () => void
  onCheckIn: () => void
  onNoShow: () => void
  onCancel: () => void
  onComplete: () => void
  onConfirm: () => void
  onAssignTable: (tableNumber: string) => void
  onDelete: () => void
  onStartOrder: () => void
  tables: KassaTable[]
  guestProfile?: GuestProfile
}

function ReservationDetailModal({
  reservation,
  onClose,
  onCheckIn,
  onNoShow,
  onCancel,
  onComplete,
  onConfirm,
  onAssignTable,
  onDelete,
  onStartOrder,
  tables,
  guestProfile,
}: ReservationDetailModalProps) {
  const status = STATUS_CONFIG[reservation.status]
  const [showTableSelect, setShowTableSelect] = useState(false)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl w-full max-w-md relative">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1"
                style={{ backgroundColor: status.bgColor, color: status.color }}
              >
                {status.icon}
                {status.label}
              </span>
              <h2 className="text-xl font-bold mt-2">{reservation.guest_name}</h2>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Details */}
        <div className="p-6 space-y-4">
          {/* Datum & Tijd */}
          <div className="flex items-center gap-4 p-4 bg-gray-100 rounded-xl">
            <div className="p-3 rounded-xl bg-green-100">
              <CalendarDays size={24} className="text-green-500" />
            </div>
            <div>
              <p className="font-bold text-lg">{reservation.reservation_time}</p>
              <p className="text-sm text-gray-400">
                {new Date(reservation.reservation_date).toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>

          {/* Personen & Tafel */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-100 rounded-xl text-center">
              <Users size={24} className="mx-auto text-gray-400 mb-1" />
              <p className="text-2xl font-bold">{reservation.party_size}</p>
              <p className="text-xs text-gray-400">personen</p>
            </div>
            <div
              className="p-4 bg-gray-100 rounded-xl text-center cursor-pointer hover:bg-gray-200 transition-colors"
              onClick={() => setShowTableSelect(true)}
            >
              <MapPin size={24} className="mx-auto text-gray-400 mb-1" />
              <p className="text-2xl font-bold">{reservation.table_number || '-'}</p>
              <p className="text-xs text-gray-400">tafel (klik om te kiezen)</p>
            </div>
          </div>

          {/* Contact */}
          {(reservation.guest_phone || reservation.guest_email) && (
            <div className="space-y-2">
              {reservation.guest_phone && (
                <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-xl">
                  <Phone size={18} className="text-gray-400" />
                  <a href={`tel:${reservation.guest_phone}`} className="hover:underline">{reservation.guest_phone}</a>
                </div>
              )}
              {reservation.guest_email && (
                <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-xl">
                  <Mail size={18} className="text-gray-400" />
                  <a href={`mailto:${reservation.guest_email}`} className="hover:underline">{reservation.guest_email}</a>
                </div>
              )}
            </div>
          )}

          {/* Guest profile badges */}
          {guestProfile && (
            <div className="flex items-center gap-2 flex-wrap">
              {guestProfile.isVip && (
                <span className="px-2 py-1 rounded-full text-xs bg-amber-500/20 text-amber-500 flex items-center gap-1">
                  <Star size={12} /> VIP
                </span>
              )}
              <span className="px-2 py-1 rounded-full text-xs bg-gray-100">{guestProfile.totalVisits} bezoeken</span>
              {guestProfile.totalNoShows > 0 && (
                <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400">
                  {guestProfile.totalNoShows} no-shows
                </span>
              )}
            </div>
          )}

          {/* Notes */}
          {reservation.notes && (
            <div className="p-3 bg-gray-100 rounded-xl">
              <p className="text-xs text-gray-400 mb-1">Opmerkingen</p>
              <p className="text-sm">{reservation.notes}</p>
            </div>
          )}

          {/* Special Requests */}
          {reservation.special_requests && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs text-amber-500 mb-1">Speciale wensen</p>
              <p className="text-sm">{reservation.special_requests}</p>
            </div>
          )}

          {/* Occasion */}
          {reservation.occasion && (
            <div className="text-center">
              <span className="px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-600">
                🎉 {reservation.occasion}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 space-y-2">
          {reservation.status === 'PENDING' && (
            <button
              onClick={onConfirm}
              className="w-full py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={18} />
              Bevestigen
            </button>
          )}

          {reservation.status === 'CONFIRMED' && (
            <>
              <button
                onClick={onStartOrder}
                className="w-full py-3 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
              >
                <UtensilsCrossed size={18} />
                Start Order → Kassa
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onCheckIn}
                  className="py-3 rounded-xl bg-emerald-500/20 text-emerald-600 font-medium hover:bg-emerald-500/30 transition-colors flex items-center justify-center gap-2"
                >
                  <UserCheck size={18} />
                  Check-in
                </button>
                <button
                  onClick={onNoShow}
                  className="py-3 rounded-xl bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
                >
                  <UserX size={18} />
                  No-show
                </button>
              </div>
            </>
          )}

          {reservation.status === 'CHECKED_IN' && (
            <>
              <button
                onClick={onStartOrder}
                className="w-full py-3 rounded-xl bg-[#3C4D6B] text-white font-medium hover:bg-[#4A5D7B] transition-colors flex items-center justify-center gap-2"
              >
                <UtensilsCrossed size={18} />
                Naar Kassa
              </button>
              <button
                onClick={onComplete}
                className="w-full py-3 rounded-xl bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18} />
                Afronden
              </button>
            </>
          )}

          {(reservation.status === 'PENDING' || reservation.status === 'CONFIRMED') && (
            <button
              onClick={onCancel}
              className="w-full py-3 rounded-xl bg-gray-100 text-gray-400 font-medium hover:text-red-400 transition-colors"
            >
              Annuleren
            </button>
          )}

          <div className="flex gap-2">
            <button
              onClick={onDelete}
              className="flex-1 py-3 rounded-xl bg-red-50 text-red-400 font-medium hover:bg-red-100 transition-colors text-sm"
            >
              Verwijderen
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-gray-100 font-medium hover:bg-gray-200 transition-colors"
            >
              Sluiten
            </button>
          </div>
        </div>

        {/* Table Select Popup */}
        {showTableSelect && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 rounded-2xl">
            <div className="bg-white rounded-xl p-4 w-full max-w-sm">
              <h3 className="font-bold mb-3">Kies tafel</h3>
              <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                {tables.filter(t => t.seats >= reservation.party_size).map((table) => (
                  <button
                    key={table.id}
                    onClick={() => {
                      onAssignTable(table.number)
                      setShowTableSelect(false)
                    }}
                    className={`p-3 rounded-lg text-center ${
                      table.number === reservation.table_number
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    <span className="font-bold">{table.number}</span>
                    <span className="text-xs block">{table.seats}p</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowTableSelect(false)}
                className="w-full mt-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
              >
                Annuleren
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
