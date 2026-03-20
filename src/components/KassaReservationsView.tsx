'use client'

/**
 * KassaReservationsView - Professioneel Reservatiesysteem
 * Exact gekopieerd van ReservationsView (vysion-horeca) + Supabase + email
 */

import { useState, useMemo, useEffect, useRef } from 'react'
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
type ViewMode = 'today' | 'calendar' | 'month' | 'list' | 'floorplan' | 'timeline' | 'guests' | 'stats' | 'settings'

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

interface FloorPlanTable {
  id: string
  number: string
  seats: number
  shape: 'ROUND' | 'SQUARE' | 'RECTANGLE'
  x: number
  y: number
  rotation: number
  status: string
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
  const [isPro, setIsPro] = useState(true)
  const [floorPlanTablesDB, setFloorPlanTablesDB] = useState<FloorPlanTable[]>([])
  // Floor plan editor state
  const [selectedFloorTable, setSelectedFloorTable] = useState<FloorPlanTable | null>(null)
  const [showAddFloorTable, setShowAddFloorTable] = useState(false)
  const [addFloorNumber, setAddFloorNumber] = useState('')
  const [addFloorSeats, setAddFloorSeats] = useState(4)
  const [addFloorShape, setAddFloorShape] = useState<'SQUARE' | 'ROUND' | 'RECTANGLE'>('SQUARE')
  const [isDraggingFloor, setIsDraggingFloor] = useState(false)
  const floorDraggingId = useRef<string | null>(null)
  const floorDragOffset = useRef({ x: 0, y: 0 })
  const floorDragMoved = useRef(false)
  const floorPointerStart = useRef({ x: 0, y: 0 })
  const [timelineDate, setTimelineDate] = useState(new Date().toISOString().split('T')[0])
  const [floorPlanTime, setFloorPlanTime] = useState(() => {
    const now = new Date()
    const h = now.getHours().toString().padStart(2, '0')
    const m = now.getMinutes() < 30 ? '00' : '30'
    return `${h}:${m}`
  })
  const [monthDate, setMonthDate] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [reservationSettings, setReservationSettings] = useState<ReservationSettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS
    try {
      const saved = localStorage.getItem(`reservationSettings_${tenant}`)
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS
    } catch { return DEFAULT_SETTINGS }
  })
  // Tenant info for emails
  const [businessInfo, setBusinessInfo] = useState({ name: '', phone: '', email: '' })

  // Load tenant info + reservatie instellingen vanuit Supabase
  useEffect(() => {
    supabase.from('tenants').select('name,phone,email,subscription_status,trial_ends_at,plan').eq('slug', tenant).single()
      .then(({ data }) => {
        if (data) {
          setBusinessInfo({ name: data.name || '', phone: data.phone || '', email: data.email || '' })
          const status = data.subscription_status || 'trial'
          const trialEnd = data.trial_ends_at ? new Date(data.trial_ends_at) : null
          const isTrial = (status === 'trial' || status === 'TRIAL') && trialEnd && trialEnd > new Date()
          setIsPro(data.plan === 'pro' || status === 'active' || !!isTrial)
        }
      })
    // Laad reservatie instellingen vanuit Supabase (overschrijft localStorage)
    supabase.from('reservation_settings').select('*').eq('tenant_slug', tenant).single()
      .then(({ data }) => {
        if (data) {
          const loaded = { ...DEFAULT_SETTINGS, ...data }
          setReservationSettings(loaded)
          localStorage.setItem(`reservationSettings_${tenant}`, JSON.stringify(loaded))
        }
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadReservations(); loadGuestProfiles() }, [tenant])

  // Load floor plan tables from Supabase
  useEffect(() => {
    supabase.from('floor_plan_tables').select('data').eq('tenant_slug', tenant).single()
      .then(({ data }) => { if (data?.data) setFloorPlanTablesDB(data.data as FloorPlanTable[]) })
  }, [tenant])

  // Sla instellingen op in localStorage + Supabase (zodat publieke boekingspagina ze ook leest)
  const updateSettings = (updates: Partial<ReservationSettings>) => {
    const newSettings = { ...reservationSettings, ...updates }
    setReservationSettings(newSettings)
    localStorage.setItem(`reservationSettings_${tenant}`, JSON.stringify(newSettings))
    supabase.from('reservation_settings').upsert(
      { tenant_slug: tenant, ...newSettings },
      { onConflict: 'tenant_slug' }
    ).then(() => {})
  }

  // ---- Floor plan editor helpers ----
  const saveFloorPlan = async (updated: FloorPlanTable[]) => {
    setFloorPlanTablesDB(updated)
    await supabase.from('floor_plan_tables').upsert({ tenant_slug: tenant, data: updated }, { onConflict: 'tenant_slug' })
  }

  const addFloorTable = async () => {
    if (!addFloorNumber.trim()) return
    const newTable: FloorPlanTable = {
      id: Math.random().toString(36).slice(2, 10),
      number: addFloorNumber.trim(),
      seats: addFloorSeats,
      shape: addFloorShape,
      x: 15 + Math.random() * 60,
      y: 15 + Math.random() * 60,
      rotation: 0,
      status: 'FREE',
    }
    await saveFloorPlan([...floorPlanTablesDB, newTable])
    setAddFloorNumber('')
    setAddFloorSeats(4)
    setShowAddFloorTable(false)
    toast.success(`Tafel ${newTable.number} toegevoegd`)
  }

  const deleteFloorTable = async (id: string) => {
    await saveFloorPlan(floorPlanTablesDB.filter(t => t.id !== id))
    setSelectedFloorTable(null)
    toast.success('Tafel verwijderd')
  }

  const handleFloorPointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    const canvas = document.querySelector('.res-floor-canvas') as HTMLElement
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const table = floorPlanTablesDB.find(t => t.id === id)!
    floorDraggingId.current = id
    floorDragMoved.current = false
    floorPointerStart.current = { x: e.clientX, y: e.clientY }
    floorDragOffset.current = {
      x: e.clientX - rect.left - (table.x / 100) * rect.width,
      y: e.clientY - rect.top - (table.y / 100) * rect.height,
    }
    setIsDraggingFloor(true)
  }

  const handleFloorPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!floorDraggingId.current) return
    const dx = Math.abs(e.clientX - floorPointerStart.current.x)
    const dy = Math.abs(e.clientY - floorPointerStart.current.y)
    if (dx < 6 && dy < 6) return
    floorDragMoved.current = true
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.max(3, Math.min(95, ((e.clientX - rect.left - floorDragOffset.current.x) / rect.width) * 100))
    const y = Math.max(3, Math.min(93, ((e.clientY - rect.top - floorDragOffset.current.y) / rect.height) * 100))
    setFloorPlanTablesDB(prev => prev.map(t => t.id === floorDraggingId.current ? { ...t, x, y } : t))
  }

  const handleFloorPointerUp = async (e: React.PointerEvent) => {
    if (!floorDraggingId.current) return
    await supabase.from('floor_plan_tables').upsert({ tenant_slug: tenant, data: floorPlanTablesDB }, { onConflict: 'tenant_slug' })
    floorDraggingId.current = null
    setIsDraggingFloor(false)
    setTimeout(() => { floorDragMoved.current = false }, 0)
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

  const waitlistReservations = useMemo(() =>
    reservations.filter(r => r.status === 'WAITLIST' && r.reservation_date === today)
      .sort((a, b) => (a.waitlist_position || 0) - (b.waitlist_position || 0)),
    [reservations, today]
  )

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
    base = base.filter(r => r.status !== 'WAITLIST')
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
              onClick={onClose}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Kassa
            </button>
            <button
              onClick={() => setShowNewReservationModal(true)}
              className="px-4 py-2 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 transition-colors flex items-center gap-2"
            >
              <Plus size={20} />
              Nieuwe Reservatie
            </button>
          </div>
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
              { id: 'today', label: 'Dag', icon: <Clock size={16} /> },
              { id: 'timeline', label: 'Tijdlijn', icon: <LayoutGrid size={16} /> },
              { id: 'month', label: 'Maand', icon: <CalendarDays size={16} /> },
              { id: 'list', label: 'Lijst', icon: <List size={16} /> },
              { id: 'floorplan', label: 'Plattegrond', icon: <MapPin size={16} /> },
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
      <div className={`flex-1 p-4 ${viewMode === 'today' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && viewMode === 'today' && (
          <div className="flex -m-4 h-full" style={{ height: 'calc(100vh - 130px)' }}>

            {/* LEFT PANEL — reservatielijst */}
            <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {formatDate(today)} • {todayStats.covers} personen • {todayStats.total} reservaties
                </p>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                {todayReservations.filter(r => r.status !== 'WAITLIST').length === 0 && (
                  <div className="p-6 text-center text-gray-400 text-sm">Geen reservaties vandaag</div>
                )}
                {todayReservations.filter(r => r.status !== 'WAITLIST').map(r => {
                  const status = STATUS_CONFIG[r.status]
                  const isSelected = selectedReservation?.id === r.id
                  const guest = guestProfiles.find(g => g.phone === r.guest_phone || g.email === r.guest_email)
                  return (
                    <div
                      key={r.id}
                      onClick={() => setSelectedReservation(r)}
                      className={`px-3 py-2.5 cursor-pointer transition-colors hover:bg-gray-50 ${isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: status.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-sm font-bold text-gray-900">{r.reservation_time}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                              style={{ backgroundColor: status.bgColor, color: status.color }}>
                              {status.label}
                            </span>
                          </div>
                          <p className="font-semibold text-gray-900 text-sm truncate">
                            {r.guest_name}
                            {guest?.isVip && <span className="ml-1 text-amber-400">★</span>}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                            <span className="flex items-center gap-0.5"><Users size={10} /> {r.party_size}p</span>
                            {r.table_number && <span className="flex items-center gap-0.5"><MapPin size={10} /> T{r.table_number}</span>}
                            {r.guest_phone && <span className="flex items-center gap-0.5"><Phone size={10} /></span>}
                            {r.notes && <span className="flex items-center gap-0.5"><MessageSquare size={10} /></span>}
                            {r.occasion && <span className="text-purple-400">🎉</span>}
                          </div>
                          {/* Quick actions */}
                          {(r.status === 'CONFIRMED' || r.status === 'PENDING') && (
                            <div className="flex gap-1 mt-1.5">
                              {r.status === 'PENDING' && (
                                <button onClick={e => { e.stopPropagation(); handleConfirm(r) }}
                                  className="text-[10px] px-2 py-1 rounded-md bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors">
                                  Bevestigen
                                </button>
                              )}
                              {r.status === 'CONFIRMED' && (
                                <button onClick={e => { e.stopPropagation(); handleCheckIn(r) }}
                                  className="text-[10px] px-2 py-1 rounded-md bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors">
                                  Check-in
                                </button>
                              )}
                              <button onClick={e => { e.stopPropagation(); handleNoShow(r) }}
                                className="text-[10px] px-2 py-1 rounded-md bg-red-100 text-red-500 font-medium hover:bg-red-200 transition-colors">
                                No-show
                              </button>
                            </div>
                          )}
                          {r.status === 'CHECKED_IN' && (
                            <div className="flex gap-1 mt-1.5">
                              <button onClick={e => { e.stopPropagation(); handleStartOrder(r) }}
                                className="text-[10px] px-2 py-1 rounded-md bg-[#3C4D6B] text-white font-medium hover:bg-[#4a5d7b] transition-colors">
                                Naar Kassa
                              </button>
                              <button onClick={e => { e.stopPropagation(); handleComplete(r) }}
                                className="text-[10px] px-2 py-1 rounded-md bg-gray-100 text-gray-500 font-medium hover:bg-gray-200 transition-colors">
                                Afronden
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Wachtlijst */}
                {waitlistReservations.length > 0 && (
                  <div>
                    <div className="px-3 py-2 bg-purple-50 border-y border-purple-100">
                      <p className="text-xs font-bold text-purple-600">WACHTLIJST ({waitlistReservations.length})</p>
                    </div>
                    {waitlistReservations.map(r => (
                      <div key={r.id} onClick={() => setSelectedReservation(r)}
                        className="px-3 py-2.5 border-l-4 border-purple-400 cursor-pointer hover:bg-purple-50 transition-colors">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-sm font-bold">{r.reservation_time}</span>
                          {r.waitlist_position && <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">#{r.waitlist_position}</span>}
                        </div>
                        <p className="font-semibold text-sm text-gray-900 truncate">{r.guest_name}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                          <span>{r.party_size}p</span>
                        </div>
                        <button onClick={e => { e.stopPropagation(); handleConfirmFromWaitlist(r) }}
                          className="mt-1.5 text-[10px] px-2 py-1 rounded-md bg-purple-500 text-white font-medium hover:bg-purple-600 transition-colors">
                          Bevestigen
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT PANEL — tafelplan */}
            <div className="flex-1 relative overflow-hidden" style={{ backgroundColor: '#e3e3e3' }}>
              {/* Grid achtergrond */}
              <div className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage: 'linear-gradient(to right, #999 1px, transparent 1px), linear-gradient(to bottom, #999 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                }} />

              {floorPlanTablesDB.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center bg-white/80 rounded-2xl p-8 shadow-sm">
                    <LayoutGrid size={48} className="mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-600 font-semibold mb-1">Nog geen tafels aangemaakt</p>
                    <p className="text-sm text-gray-400 mb-4">Maak je plattegrond aan om tafels te zien</p>
                    <button
                      onClick={() => setViewMode('floorplan')}
                      className="px-5 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition-colors flex items-center gap-2 mx-auto"
                    >
                      <Plus size={16} />
                      Tafels aanmaken
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {floorPlanTablesDB.map(table => {
                    const tableRes = todayReservations.find(r =>
                      r.table_number === table.number && r.status !== 'CANCELLED' && r.status !== 'COMPLETED'
                    )
                    const isSelected = selectedReservation?.table_number === table.number
                    let bgColor = '#4ade80'
                    if (tableRes?.status === 'CHECKED_IN') bgColor = '#60a5fa'
                    else if (tableRes?.status === 'CONFIRMED') bgColor = '#a78bfa'
                    else if (tableRes?.status === 'PENDING') bgColor = '#fbbf24'

                    const tw = table.shape === 'RECTANGLE' ? 100 : 70
                    const th = table.shape === 'RECTANGLE' ? 50 : 70

                    return (
                      <div
                        key={table.id}
                        onClick={() => tableRes ? setSelectedReservation(tableRes) : null}
                        className="absolute transition-all"
                        style={{
                          left: `${table.x}%`,
                          top: `${table.y}%`,
                          transform: `translate(-50%, -50%) rotate(${table.rotation}deg)`,
                          cursor: tableRes ? 'pointer' : 'default',
                          zIndex: isSelected ? 10 : 1,
                        }}
                      >
                        <div
                          className="flex flex-col items-center justify-center relative transition-all"
                          style={{
                            width: tw,
                            height: th,
                            backgroundColor: bgColor,
                            borderRadius: table.shape === 'ROUND' ? '50%' : 10,
                            border: isSelected ? '3px solid #1d4ed8' : '2px solid rgba(0,0,0,0.15)',
                            boxShadow: isSelected
                              ? '0 0 0 4px rgba(29,78,216,0.25), 0 4px 12px rgba(0,0,0,0.2)'
                              : '0 2px 8px rgba(0,0,0,0.15)',
                          }}
                        >
                          <span className="text-white text-sm font-bold drop-shadow">{table.number}</span>
                          <span className="text-white/80 text-[10px]">{table.seats}p</span>
                          {tableRes && (
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white shadow-md rounded-lg px-2 py-0.5 text-[10px] font-semibold text-gray-700 border border-gray-200 pointer-events-none z-10">
                              {tableRes.guest_name} • {tableRes.reservation_time}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {/* Legenda */}
                  <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-xl px-4 py-2.5 flex items-center gap-4 shadow-md text-xs font-medium">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-400" /><span>Vrij</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-violet-400" /><span>Gereserveerd</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-400" /><span>Bezet</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-400" /><span>Afwachting</span></div>
                  </div>

                  {/* Datum badge */}
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur rounded-xl px-3 py-1.5 shadow text-xs font-bold text-gray-600">
                    {formatDate(today)}
                  </div>
                </>
              )}
            </div>
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

        {!loading && viewMode === 'timeline' && (() => {
          // Time slots from 10:00 to 23:00 in 30-min steps
          const SLOT_W = 72 // px per 30-min slot
          const ROW_H = 56
          const LABEL_W = 80
          const START_MIN = 10 * 60 // 10:00
          const END_MIN = 23 * 60   // 23:00
          const totalSlots = (END_MIN - START_MIN) / 30
          const timeSlots: string[] = []
          for (let m = START_MIN; m < END_MIN; m += 30) {
            const h = Math.floor(m / 60).toString().padStart(2, '0')
            const min = (m % 60).toString().padStart(2, '0')
            timeSlots.push(`${h}:${min}`)
          }

          // Tables to show: floor plan tables first, then any table in reservations
          const tableNumbers = floorPlanTablesDB.length > 0
            ? floorPlanTablesDB.map(t => t.number)
            : [...new Set(reservations.filter(r => r.table_number).map(r => r.table_number!))]
          const sortedTables = tableNumbers.length > 0 ? tableNumbers : ['(geen tafel)']

          // Filter reservations for this date
          const dayRes = reservations.filter(r => r.reservation_date === timelineDate && r.status !== 'CANCELLED')

          // Current time marker
          const now = new Date()
          const isToday = timelineDate === now.toISOString().split('T')[0]
          const nowMin = now.getHours() * 60 + now.getMinutes()
          const nowPx = isToday && nowMin >= START_MIN && nowMin <= END_MIN
            ? LABEL_W + ((nowMin - START_MIN) / 30) * SLOT_W
            : null

          const statusColors: Record<string, string> = {
            CONFIRMED: '#3b82f6',
            CHECKED_IN: '#22c55e',
            PENDING: '#f59e0b',
            COMPLETED: '#9ca3af',
            NO_SHOW: '#ef4444',
            WAITLIST: '#8b5cf6',
          }

          return (
            <div className="flex flex-col gap-0">
              {/* Date nav */}
              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => { const d = new Date(timelineDate); d.setDate(d.getDate() - 1); setTimelineDate(d.toISOString().split('T')[0]) }}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"><ChevronLeft size={18} /></button>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-lg">{formatDate(timelineDate)}</p>
                  <input type="date" value={timelineDate} onChange={e => setTimelineDate(e.target.value)}
                    className="px-2 py-1 rounded-lg bg-gray-100 border border-gray-200 text-sm" />
                </div>
                <button onClick={() => { const d = new Date(timelineDate); d.setDate(d.getDate() + 1); setTimelineDate(d.toISOString().split('T')[0]) }}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"><ChevronRight size={18} /></button>
                <div className="ml-auto text-sm text-gray-400">
                  {dayRes.length} reservaties • {dayRes.reduce((s, r) => s + r.party_size, 0)} personen
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mb-3 text-xs">
                {Object.entries(STATUS_CONFIG).filter(([k]) => k !== 'CANCELLED').map(([key, cfg]) => (
                  <div key={key} className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: statusColors[key] || '#ccc' }} />
                    <span className="text-gray-500">{cfg.label}</span>
                  </div>
                ))}
              </div>

              {/* Grid */}
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                <div className="overflow-x-auto">
                  <div style={{ minWidth: LABEL_W + totalSlots * SLOT_W + 40, position: 'relative' }}>
                    {/* Time header */}
                    <div className="flex border-b border-gray-200 bg-gray-50" style={{ height: 36 }}>
                      <div style={{ width: LABEL_W, flexShrink: 0 }} className="border-r border-gray-200 flex items-center px-3">
                        <span className="text-xs font-bold text-gray-400">Tafel</span>
                      </div>
                      {timeSlots.map((t, i) => (
                        <div key={t} style={{ width: SLOT_W, flexShrink: 0 }}
                          className="border-r border-gray-100 flex items-center justify-center">
                          {i % 2 === 0 && <span className="text-xs font-medium text-gray-400">{t}</span>}
                        </div>
                      ))}
                    </div>

                    {/* Table rows */}
                    {sortedTables.map((tableNum, rowIdx) => {
                      const tableRes = dayRes.filter(r => (r.table_number || '(geen tafel)') === tableNum)
                      const fpTable = floorPlanTablesDB.find(t => t.number === tableNum)
                      return (
                        <div key={tableNum} className="flex relative"
                          style={{ height: ROW_H, backgroundColor: rowIdx % 2 === 0 ? 'white' : '#f9fafb', borderBottom: '1px solid #f0f0f0' }}>
                          {/* Table label */}
                          <div style={{ width: LABEL_W, flexShrink: 0 }}
                            className="border-r border-gray-200 flex flex-col items-center justify-center px-2">
                            <span className="text-base font-bold text-gray-800">{tableNum}</span>
                            {fpTable && <span className="text-xs text-gray-400">{fpTable.seats}p</span>}
                          </div>
                          {/* Slot grid lines */}
                          <div className="flex absolute" style={{ left: LABEL_W, top: 0, bottom: 0 }}>
                            {timeSlots.map((t, i) => (
                              <div key={t} style={{ width: SLOT_W, flexShrink: 0, height: ROW_H }}
                                className={`border-r ${i % 2 === 0 ? 'border-gray-100' : 'border-gray-50'}`} />
                            ))}
                          </div>
                          {/* Reservation blocks */}
                          {tableRes.map(r => {
                            const [rh, rm] = r.reservation_time.split(':').map(Number)
                            const startMin = rh * 60 + rm
                            const dur = r.duration_minutes || 90
                            const left = LABEL_W + ((startMin - START_MIN) / 30) * SLOT_W
                            const width = (dur / 30) * SLOT_W - 4
                            if (left < LABEL_W || startMin > END_MIN) return null
                            const color = statusColors[r.status] || '#9ca3af'
                            return (
                              <div
                                key={r.id}
                                onClick={() => setSelectedReservation(r)}
                                className="absolute top-2 bottom-2 rounded-lg cursor-pointer flex flex-col justify-center px-2 overflow-hidden hover:opacity-90 transition-opacity"
                                style={{ left, width: Math.max(width, 40), backgroundColor: color + 'dd', borderLeft: `3px solid ${color}`, zIndex: 2 }}
                              >
                                <span className="text-white text-xs font-bold truncate">{r.guest_name}</span>
                                <span className="text-white/80 text-xs truncate">{r.reservation_time} • {r.party_size}p</span>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}

                    {/* Current time line */}
                    {nowPx !== null && (
                      <div className="absolute top-9 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
                        style={{ left: nowPx }}>
                        <div className="absolute -top-1 -left-1.5 w-3 h-3 rounded-full bg-red-500" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {dayRes.length === 0 && (
                <div className="text-center py-12">
                  <CalendarDays size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-400">Geen reservaties op {formatDate(timelineDate)}</p>
                </div>
              )}
            </div>
          )
        })()}

        {!loading && viewMode === 'month' && (() => {
          const { year, month } = monthDate
          const firstDay = new Date(year, month, 1)
          const lastDay = new Date(year, month + 1, 0)
          // Start on Monday
          let startDow = firstDay.getDay() // 0=Sun, 1=Mon...
          if (startDow === 0) startDow = 7
          const paddingDays = startDow - 1

          const days: (Date | null)[] = []
          for (let i = 0; i < paddingDays; i++) days.push(null)
          for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d))
          while (days.length % 7 !== 0) days.push(null)

          const activeShifts = (reservationSettings.shifts || []).filter(s => s.isActive)
          const todayStr = new Date().toISOString().split('T')[0]

          const getDateStr = (d: Date) => d.toISOString().split('T')[0]

          const monthNames = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December']

          return (
            <div>
              {/* Month nav */}
              <div className="flex items-center justify-between mb-6">
                <button onClick={() => setMonthDate(prev => {
                  const d = new Date(prev.year, prev.month - 1, 1)
                  return { year: d.getFullYear(), month: d.getMonth() }
                })} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"><ChevronLeft size={20} /></button>
                <h2 className="text-xl font-bold">{monthNames[month]} {year}</h2>
                <button onClick={() => setMonthDate(prev => {
                  const d = new Date(prev.year, prev.month + 1, 1)
                  return { year: d.getFullYear(), month: d.getMonth() }
                })} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"><ChevronRight size={20} /></button>
              </div>

              {/* Shift filter tabs */}
              {activeShifts.length > 0 && (
                <div className="flex gap-2 mb-4">
                  {activeShifts.map(s => (
                    <div key={s.id} className="px-4 py-1.5 rounded-lg bg-[#3C4D6B] text-white text-sm font-medium">
                      {s.name}
                    </div>
                  ))}
                </div>
              )}

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-2">
                {['Ma','Di','Wo','Do','Vr','Za','Zo'].map(d => (
                  <div key={d} className="text-center text-xs font-bold text-gray-400 py-2">{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} className="h-24 rounded-xl" />
                  const dateStr = getDateStr(day)
                  const isToday = dateStr === todayStr
                  const dayRes = reservations.filter(r => r.reservation_date === dateStr && r.status !== 'CANCELLED' && r.status !== 'NO_SHOW')
                  const totalCovers = dayRes.reduce((s, r) => s + r.party_size, 0)

                  return (
                    <div
                      key={dateStr}
                      onClick={() => { setTimelineDate(dateStr); setViewMode('timeline') }}
                      className={`min-h-24 rounded-xl p-2 cursor-pointer transition-all hover:border-[#3C4D6B] border-2 ${
                        isToday ? 'bg-[#3C4D6B]/10 border-[#3C4D6B]' : 'bg-white border-gray-100 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`text-sm font-bold mb-1 ${isToday ? 'text-[#3C4D6B]' : 'text-gray-700'}`}>
                        {day.getDate()}
                      </div>
                      {dayRes.length > 0 && (
                        <div className="space-y-0.5">
                          {activeShifts.length > 0 ? activeShifts.map(shift => {
                            const shiftRes = dayRes.filter(r =>
                              r.reservation_time >= shift.startTime && r.reservation_time <= shift.endTime
                            )
                            if (shiftRes.length === 0) return (
                              <div key={shift.id} className="text-xs text-gray-300 truncate">{shift.name}</div>
                            )
                            const covers = shiftRes.reduce((s, r) => s + r.party_size, 0)
                            return (
                              <div key={shift.id} className="text-xs font-medium px-1.5 py-0.5 rounded-md bg-[#3C4D6B]/15 text-[#3C4D6B] truncate">
                                {shift.name} <span className="font-bold">{covers}</span>
                              </div>
                            )
                          }) : (
                            <div className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-green-100 text-green-700">
                              {dayRes.length}× • {totalCovers}p
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {!loading && viewMode === 'calendar' && (
          <CalendarView
            reservations={reservations}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onSelectReservation={setSelectedReservation}
            onNewReservation={() => setShowNewReservationModal(true)}
            renderReservationCard={renderReservationCard}
          />
        )}

        {!loading && viewMode === 'floorplan' && (() => {
          // Reservation status per table for selected date
          const floorRes = reservations.filter(r =>
            r.reservation_date === selectedDate &&
            r.status !== 'CANCELLED' && r.status !== 'COMPLETED'
          )
          const getFloorTableInfo = (tableNum: string) => {
            const res = floorRes.find(r => r.table_number === tableNum)
            if (!res) return { color: '#4ade80', borderColor: '#22c55e', label: 'Vrij', res: null }
            if (res.status === 'CHECKED_IN') return { color: '#60a5fa', borderColor: '#3b82f6', label: 'Bezet', res }
            if (res.status === 'CONFIRMED') return { color: '#a78bfa', borderColor: '#8b5cf6', label: 'Gereserveerd', res }
            if (res.status === 'PENDING') return { color: '#fbbf24', borderColor: '#f59e0b', label: 'Afwachting', res }
            return { color: '#9ca3af', borderColor: '#6b7280', label: res.status, res }
          }

          return (
            <div className="flex flex-col h-full -m-4" style={{ height: 'calc(100vh - 130px)' }}>
              {/* Toolbar */}
              <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
                {/* Date nav */}
                <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]) }}
                  className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200"><ChevronLeft size={16} /></button>
                <span className="font-semibold text-sm min-w-28 text-center">{formatDate(selectedDate)}</span>
                <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().split('T')[0]) }}
                  className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200"><ChevronRight size={16} /></button>
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                  className="px-2 py-1.5 rounded-lg bg-gray-100 border border-gray-200 text-xs" />

                <div className="flex-1" />

                {/* Legend */}
                <div className="hidden md:flex items-center gap-3 text-xs font-medium">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-green-400" /><span>Vrij</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-violet-400" /><span>Gereserveerd</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-blue-400" /><span>Bezet</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-amber-400" /><span>Afwachting</span></div>
                </div>

                <div className="flex-1" />

                <button onClick={() => { setSelectedFloorTable(null); setShowAddFloorTable(true) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition-colors">
                  <Plus size={16} />
                  Tafel toevoegen
                </button>
                {selectedFloorTable && (
                  <button onClick={() => deleteFloorTable(selectedFloorTable.id)}
                    className="px-3 py-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-500 text-sm font-semibold transition-colors">
                    Verwijder
                  </button>
                )}
              </div>

              {/* Canvas + optional sidebar */}
              <div className="flex flex-1 overflow-hidden">
                {/* Canvas */}
                <div
                  className="res-floor-canvas flex-1 relative overflow-hidden select-none"
                  style={{
                    backgroundColor: '#e3e3e3',
                    backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.07) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                    cursor: isDraggingFloor ? 'grabbing' : 'default',
                    touchAction: 'none',
                  }}
                  onPointerMove={handleFloorPointerMove}
                  onPointerUp={handleFloorPointerUp}
                  onClick={() => { if (!isDraggingFloor) setSelectedFloorTable(null) }}
                >
                  {floorPlanTablesDB.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center bg-white/80 rounded-2xl px-10 py-8 shadow-sm">
                        <LayoutGrid size={48} className="mx-auto text-gray-400 mb-3" />
                        <p className="text-gray-600 font-semibold mb-1">Nog geen tafels</p>
                        <p className="text-sm text-gray-400">Klik op &ldquo;Tafel toevoegen&rdquo; om te starten</p>
                      </div>
                    </div>
                  )}

                  {floorPlanTablesDB.map(table => {
                    const { color, borderColor, res } = getFloorTableInfo(table.number)
                    const isSelected = selectedFloorTable?.id === table.id
                    const tw = table.shape === 'RECTANGLE' ? 100 : 72
                    const th = table.shape === 'RECTANGLE' ? 52 : 72

                    return (
                      <div
                        key={table.id}
                        className="absolute"
                        style={{
                          left: `${table.x}%`,
                          top: `${table.y}%`,
                          transform: `translate(-50%, -50%) rotate(${table.rotation}deg)`,
                          zIndex: isSelected ? 10 : 1,
                          cursor: isDraggingFloor ? 'grabbing' : 'grab',
                          touchAction: 'none',
                        }}
                        onPointerDown={e => handleFloorPointerDown(e, table.id)}
                        onPointerUp={e => {
                          e.stopPropagation()
                          handleFloorPointerUp(e)
                          if (!floorDragMoved.current) {
                            setSelectedFloorTable(prev => prev?.id === table.id ? null : table)
                            if (res) setSelectedReservation(res)
                          }
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        <div
                          className="flex flex-col items-center justify-center relative transition-shadow"
                          style={{
                            width: tw, height: th,
                            backgroundColor: color,
                            borderRadius: table.shape === 'ROUND' ? '50%' : 10,
                            border: isSelected ? `3px solid #1d4ed8` : `2px solid ${borderColor}`,
                            boxShadow: isSelected
                              ? '0 0 0 4px rgba(29,78,216,0.2), 0 4px 16px rgba(0,0,0,0.2)'
                              : '0 2px 8px rgba(0,0,0,0.18)',
                          }}
                        >
                          <span className="text-white text-sm font-bold drop-shadow-sm leading-none">{table.number}</span>
                          <span className="text-white/80 text-[10px]">{table.seats}p</span>
                        </div>
                        {res && (
                          <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white shadow-md rounded-lg px-2 py-0.5 text-[10px] font-semibold text-gray-700 border border-gray-200 pointer-events-none z-20">
                            {res.guest_name} {res.reservation_time}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Sidebar — selected table detail */}
                {selectedFloorTable && (() => {
                  const { res, label, color } = getFloorTableInfo(selectedFloorTable.number)
                  return (
                    <div className="w-72 flex-shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-y-auto">
                      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-lg">Tafel {selectedFloorTable.number}</h3>
                          <p className="text-xs text-gray-400">{selectedFloorTable.seats} plaatsen • {selectedFloorTable.shape}</p>
                        </div>
                        <button onClick={() => setSelectedFloorTable(null)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                          <X size={18} />
                        </button>
                      </div>

                      {/* Status badge */}
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-white text-sm font-medium" style={{ backgroundColor: color }}>
                          <div className="w-2 h-2 rounded-full bg-white/70" />
                          {label}
                        </div>
                      </div>

                      {/* Reservation detail */}
                      {res ? (
                        <div className="p-4 space-y-3">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Reservatie</p>
                          <div>
                            <p className="font-bold text-gray-900">{res.guest_name}</p>
                            <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                              <span className="flex items-center gap-1"><Clock size={13} />{res.reservation_time}</span>
                              <span className="flex items-center gap-1"><Users size={13} />{res.party_size}p</span>
                            </div>
                            {res.guest_phone && (
                              <a href={`tel:${res.guest_phone}`} className="flex items-center gap-1 text-sm text-blue-500 mt-1 hover:underline">
                                <Phone size={13} />{res.guest_phone}
                              </a>
                            )}
                            {res.notes && <p className="text-xs text-gray-400 mt-1 italic">{res.notes}</p>}
                            {res.occasion && <p className="text-xs text-purple-500 mt-1">🎉 {res.occasion}</p>}
                          </div>
                          <div className="space-y-2 pt-2 border-t border-gray-100">
                            {res.status === 'PENDING' && (
                              <button onClick={() => { handleConfirm(res); setSelectedFloorTable(null) }}
                                className="w-full py-2.5 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
                                <CheckCircle2 size={16} /> Bevestigen
                              </button>
                            )}
                            {res.status === 'CONFIRMED' && (
                              <>
                                <button onClick={() => { handleCheckIn(res); setSelectedFloorTable(null) }}
                                  className="w-full py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2">
                                  <UserCheck size={16} /> Check-in
                                </button>
                                <button onClick={() => { handleStartOrder(res); setSelectedFloorTable(null) }}
                                  className="w-full py-2.5 rounded-xl bg-[#3C4D6B] text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                                  <UtensilsCrossed size={16} /> Naar Kassa
                                </button>
                              </>
                            )}
                            {res.status === 'CHECKED_IN' && (
                              <button onClick={() => { handleStartOrder(res); setSelectedFloorTable(null) }}
                                className="w-full py-2.5 rounded-xl bg-[#3C4D6B] text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                                <UtensilsCrossed size={16} /> Naar Kassa
                              </button>
                            )}
                            {(res.status === 'CONFIRMED' || res.status === 'PENDING') && (
                              <button onClick={() => { handleNoShow(res); setSelectedFloorTable(null) }}
                                className="w-full py-2 rounded-xl bg-red-50 text-red-400 text-sm font-semibold hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                                <UserX size={16} /> No-show
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-4">
                          <p className="text-sm text-gray-400 text-center py-4">Geen reservatie voor {formatDate(selectedDate)}</p>
                          <button onClick={() => {
                            setShowNewReservationModal(true)
                            setSelectedFloorTable(null)
                          }}
                            className="w-full py-2.5 rounded-xl bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors flex items-center justify-center gap-2">
                            <Plus size={16} /> Reservatie aanmaken
                          </button>
                          <button onClick={() => deleteFloorTable(selectedFloorTable.id)}
                            className="w-full py-2 mt-2 rounded-xl bg-red-50 text-red-400 text-sm font-semibold hover:bg-red-100 transition-colors">
                            Tafel verwijderen
                          </button>
                        </div>
                      )}

                      {/* Rotate */}
                      <div className="px-4 py-3 border-t border-gray-100 mt-auto">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Draaien</p>
                        <div className="flex gap-2">
                          <button onClick={async () => {
                            const updated = floorPlanTablesDB.map(t => t.id === selectedFloorTable.id ? { ...t, rotation: (t.rotation - 45 + 360) % 360 } : t)
                            await saveFloorPlan(updated)
                            setSelectedFloorTable(prev => prev ? { ...prev, rotation: (prev.rotation - 45 + 360) % 360 } : null)
                          }} className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold text-lg">↺</button>
                          <button onClick={async () => {
                            const updated = floorPlanTablesDB.map(t => t.id === selectedFloorTable.id ? { ...t, rotation: (t.rotation + 45) % 360 } : t)
                            await saveFloorPlan(updated)
                            setSelectedFloorTable(prev => prev ? { ...prev, rotation: (prev.rotation + 45) % 360 } : null)
                          }} className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold text-lg">↻</button>
                          <button onClick={async () => {
                            const updated = floorPlanTablesDB.map(t => t.id === selectedFloorTable.id ? { ...t, rotation: 0 } : t)
                            await saveFloorPlan(updated)
                            setSelectedFloorTable(prev => prev ? { ...prev, rotation: 0 } : null)
                          }} className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-semibold">Reset</button>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Add table modal */}
              {showAddFloorTable && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
                  <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                    <div className="p-5 border-b flex items-center justify-between">
                      <h3 className="font-bold text-lg">Tafel toevoegen</h3>
                      <button onClick={() => setShowAddFloorTable(false)} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
                    </div>
                    <div className="p-5 space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Tafelnummer *</label>
                        <input autoFocus value={addFloorNumber} onChange={e => setAddFloorNumber(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addFloorTable()}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 outline-none text-xl font-bold text-center"
                          placeholder="bv. 1, 2A, Toog" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-2">Aantal plaatsen</label>
                        <div className="grid grid-cols-5 gap-2">
                          {[2, 4, 6, 8, 10].map(n => (
                            <button key={n} onClick={() => setAddFloorSeats(n)}
                              className={`py-2 rounded-xl font-bold transition-colors ${addFloorSeats === n ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-2">Vorm</label>
                        <div className="grid grid-cols-3 gap-2">
                          {([['SQUARE', '⬛ Vierkant'], ['ROUND', '⭕ Rond'], ['RECTANGLE', '▬ Rechthoek']] as const).map(([s, label]) => (
                            <button key={s} onClick={() => setAddFloorShape(s)}
                              className={`py-2 rounded-xl text-xs font-bold transition-colors ${addFloorShape === s ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="p-4 border-t flex gap-3">
                      <button onClick={() => setShowAddFloorTable(false)} className="flex-1 py-3 rounded-xl bg-gray-100 font-semibold">Annuleer</button>
                      <button onClick={addFloorTable} className="flex-[2] py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold transition-colors">Toevoegen</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })()}

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
// CALENDAR VIEW — maand / week / dag (uur-per-uur)
// ============================================================

const NL_DAYS_SHORT = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']
const NL_MONTHS_LONG = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December']
const HOURS = Array.from({ length: 13 }, (_, i) => i + 10) // 10:00–22:00
const HOUR_HEIGHT = 64 // px per uur

interface CalendarViewProps {
  reservations: Reservation[]
  selectedDate: string
  onSelectDate: (d: string) => void
  onSelectReservation: (r: Reservation) => void
  onNewReservation: () => void
  renderReservationCard: (r: Reservation) => React.ReactNode
}

function CalendarView({ reservations, selectedDate, onSelectDate, onSelectReservation, onNewReservation }: CalendarViewProps) {
  const [calMode, setCalMode] = useState<'week' | 'day' | 'month'>('week')

  // Huidige referentiedatum (geselecteerde dag)
  const refDate = new Date(selectedDate + 'T12:00:00')
  const refYear = refDate.getFullYear()
  const refMonth = refDate.getMonth()

  // Helpers
  const toISO = (d: Date) => d.toISOString().split('T')[0]
  const todayISO = toISO(new Date())

  const resByDate = (dateISO: string) =>
    reservations.filter(r => r.reservation_date === dateISO && r.status !== 'CANCELLED')

  // ─── WEEK VIEW: heatmap + tellers per uur ─────────────────
  const renderWeek = () => {
    const dow = (refDate.getDay() + 6) % 7
    const monday = new Date(refDate)
    monday.setDate(refDate.getDate() - dow)
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday); d.setDate(monday.getDate() + i); return d
    })
    const prevWeek = () => { const d = new Date(monday); d.setDate(monday.getDate() - 7); onSelectDate(toISO(d)) }
    const nextWeek = () => { const d = new Date(monday); d.setDate(monday.getDate() + 7); onSelectDate(toISO(d)) }
    const weekLabel = `${weekDays[0].toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })} – ${weekDays[6].toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })}`

    // Reservaties per (dag, uur) groeperen
    const resByDayHour = (iso: string, hour: number) =>
      reservations.filter(r => {
        if (r.reservation_date !== iso || r.status === 'CANCELLED') return false
        const h = parseInt(r.reservation_time?.split(':')[0] || '0', 10)
        return h === hour
      })

    // Maximale count in de week (voor kleurintensiteit)
    const maxCount = Math.max(1, ...HOURS.flatMap(h =>
      weekDays.map(d => resByDayHour(toISO(d), h).length)
    ))

    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevWeek} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"><ChevronLeft size={18} /></button>
          <span className="font-bold text-gray-800">{weekLabel}</span>
          <button onClick={nextWeek} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"><ChevronRight size={18} /></button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full border-collapse" style={{ minWidth: 560 }}>
            <thead>
              <tr>
                <th className="w-14 border-b border-r border-gray-200 bg-gray-50" />
                {weekDays.map((d, i) => {
                  const iso = toISO(d)
                  const isToday = iso === todayISO
                  const isSelected = iso === selectedDate
                  const cnt = resByDate(iso).length
                  const covers = resByDate(iso).reduce((s, r) => s + r.party_size, 0)
                  return (
                    <th key={iso}
                      onClick={() => { onSelectDate(iso); setCalMode('day') }}
                      className={`border-b border-r border-gray-200 last:border-r-0 py-2 px-1 text-center cursor-pointer transition-colors ${isSelected ? 'bg-green-50' : isToday ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                    >
                      <div className={`text-[11px] font-bold uppercase tracking-wide mb-0.5 ${isToday ? 'text-blue-500' : 'text-gray-400'}`}>{NL_DAYS_SHORT[i]}</div>
                      <div className={`text-lg font-bold w-8 h-8 rounded-full flex items-center justify-center mx-auto ${isToday ? 'bg-blue-500 text-white' : isSelected ? 'bg-green-500 text-white' : 'text-gray-800'}`}>{d.getDate()}</div>
                      {cnt > 0
                        ? <div className="text-[10px] text-green-700 font-semibold mt-0.5">{cnt}×&nbsp;·&nbsp;{covers}p</div>
                        : <div className="text-[10px] text-gray-300 mt-0.5">–</div>
                      }
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {HOURS.map(h => (
                <tr key={h} className="border-t border-gray-100">
                  <td className="text-[11px] text-gray-400 text-right pr-2 w-14 border-r border-gray-200 font-medium select-none py-0"
                    style={{ height: 40 }}>{h}:00</td>
                  {weekDays.map(d => {
                    const iso = toISO(d)
                    const cell = resByDayHour(iso, h)
                    const cnt = cell.length
                    const covers = cell.reduce((s, r) => s + r.party_size, 0)
                    const intensity = cnt === 0 ? 0 : Math.max(0.12, cnt / maxCount)
                    const isToday = iso === todayISO
                    return (
                      <td key={iso}
                        onClick={() => { onSelectDate(iso); setCalMode('day') }}
                        className={`border-r border-gray-100 last:border-r-0 text-center align-middle cursor-pointer transition-colors ${isToday ? 'bg-blue-50/40' : ''}`}
                        style={{ height: 40 }}
                      >
                        {cnt > 0 && (
                          <div
                            className="mx-auto rounded-lg flex flex-col items-center justify-center text-white font-bold cursor-pointer transition-transform hover:scale-105"
                            style={{
                              backgroundColor: `rgba(22, 163, 74, ${intensity})`,
                              border: `1px solid rgba(22,163,74,0.3)`,
                              width: '90%', height: 32,
                              color: intensity > 0.5 ? 'white' : '#166534',
                            }}
                          >
                            <span className="text-[11px] leading-none font-bold">{cnt} res.</span>
                            <span className="text-[9px] leading-none opacity-80">{covers} pers.</span>
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">Klik op een dag of cel om alle reservaties te zien</p>
      </div>
    )
  }

  // ─── DAG VIEW: tijdsgegroepeerde lijst (onbeperkt schaalbaar) ────────────
  const renderDay = () => {
    const prevDay = () => { const d = new Date(refDate); d.setDate(refDate.getDate() - 1); onSelectDate(toISO(d)) }
    const nextDay = () => { const d = new Date(refDate); d.setDate(refDate.getDate() + 1); onSelectDate(toISO(d)) }
    const dayRes = resByDate(selectedDate).sort((a, b) => (a.reservation_time || '').localeCompare(b.reservation_time || ''))
    const dayLabel = refDate.toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    const covers = dayRes.reduce((s, r) => s + r.party_size, 0)

    // Groepeer op tijdstip
    const groups: Record<string, Reservation[]> = {}
    dayRes.forEach(r => {
      const t = r.reservation_time || '00:00'
      if (!groups[t]) groups[t] = []
      groups[t].push(r)
    })
    const sortedTimes = Object.keys(groups).sort()

    return (
      <div>
        {/* Navigatie */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevDay} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"><ChevronLeft size={18} /></button>
          <div className="text-center">
            <div className="font-bold text-gray-800 capitalize">{dayLabel}</div>
            {dayRes.length > 0
              ? <div className="text-sm text-gray-500">{dayRes.length} reservaties &nbsp;·&nbsp; {covers} personen</div>
              : <div className="text-sm text-gray-400">Geen reservaties</div>
            }
          </div>
          <button onClick={nextDay} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"><ChevronRight size={18} /></button>
        </div>

        {dayRes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-gray-200 bg-white">
            <CalendarDays size={44} className="text-gray-300 mb-3" />
            <p className="text-gray-400 font-medium">Geen reservaties op deze dag</p>
            <button onClick={onNewReservation} className="mt-4 px-5 py-2 rounded-xl bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors">
              + Reservatie aanmaken
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedTimes.map(time => {
              const group = groups[time]
              const groupCovers = group.reduce((s, r) => s + r.party_size, 0)
              return (
                <div key={time} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  {/* Tijdstip-header */}
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                    <div className="text-lg font-black text-[#3C4D6B]">{time}</div>
                    <div className="flex items-center gap-2">
                      <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                        {group.length} {group.length === 1 ? 'reservatie' : 'reservaties'}
                      </span>
                      <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                        {groupCovers} personen
                      </span>
                    </div>
                  </div>

                  {/* Reservaties in deze tijdslot */}
                  <div className="divide-y divide-gray-100">
                    {group.map(r => {
                      const sc = STATUS_CONFIG[r.status]
                      return (
                        <div
                          key={r.id}
                          onClick={() => onSelectReservation(r)}
                          className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          {/* Status-streep */}
                          <div className="w-1 self-stretch rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: sc.color }} />

                          {/* Hoofdinfo */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-gray-900 text-sm">{r.guest_name}</span>
                              {r.occasion && <span className="text-sm">🎉</span>}
                              {r.special_requests && <span className="text-amber-500 text-xs font-semibold">⚠️ Opmerking</span>}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                              {r.guest_phone && (
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <Phone size={10} />{r.guest_phone}
                                </span>
                              )}
                              {r.special_requests && (
                                <span className="text-xs text-amber-600 truncate max-w-[200px]">{r.special_requests}</span>
                              )}
                            </div>
                          </div>

                          {/* Rechts: personen, tafel, status */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="text-center">
                              <div className="flex items-center gap-1 text-gray-700">
                                <Users size={13} />
                                <span className="font-black text-base leading-none">{r.party_size}</span>
                              </div>
                              <div className="text-[10px] text-gray-400 leading-none">pers.</div>
                            </div>
                            {r.table_number && (
                              <div className="bg-[#3C4D6B] text-white text-xs font-bold px-2 py-1 rounded-lg">
                                T{r.table_number}
                              </div>
                            )}
                            <div className="px-2 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: sc.bgColor, color: sc.color }}>
                              {sc.label}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            <button onClick={onNewReservation} className="w-full py-3 rounded-xl border-2 border-dashed border-green-300 text-green-600 text-sm font-semibold hover:bg-green-50 transition-colors">
              + Nieuwe reservatie aanmaken
            </button>
          </div>
        )}
      </div>
    )
  }

  // ─── MAAND VIEW ────────────────────────────────────────────
  const renderMonth = () => {
    const firstDay = new Date(refYear, refMonth, 1)
    const startDow = (firstDay.getDay() + 6) % 7
    const daysInMonth = new Date(refYear, refMonth + 1, 0).getDate()
    const totalCells = Math.ceil((startDow + daysInMonth) / 7) * 7
    const cells: (number | null)[] = [
      ...Array(startDow).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
      ...Array(totalCells - startDow - daysInMonth).fill(null),
    ]
    const prevMonth = () => { const d = new Date(refYear, refMonth - 1, 1); onSelectDate(toISO(d)) }
    const nextMonth = () => { const d = new Date(refYear, refMonth + 1, 1); onSelectDate(toISO(d)) }

    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"><ChevronLeft size={18} /></button>
          <span className="font-bold text-gray-800 text-lg">{NL_MONTHS_LONG[refMonth]} {refYear}</span>
          <button onClick={nextMonth} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"><ChevronRight size={18} /></button>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-200">
            {NL_DAYS_SHORT.map(d => (
              <div key={d} className="text-center text-xs font-bold text-gray-400 py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              if (day === null) return <div key={`e-${idx}`} className="min-h-[90px] border-r border-b border-gray-100 last:border-r-0 bg-gray-50/50" />
              const dateISO = toISO(new Date(refYear, refMonth, day))
              const dayRes = resByDate(dateISO)
              const isToday = dateISO === todayISO
              const isSelected = dateISO === selectedDate
              return (
                <div
                  key={dateISO}
                  onClick={() => { onSelectDate(dateISO); setCalMode('day') }}
                  className={`min-h-[90px] p-1.5 border-r border-b border-gray-100 last:border-r-0 cursor-pointer transition-colors ${isToday ? 'bg-blue-50' : isSelected ? 'bg-green-50' : 'hover:bg-gray-50'}`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold mb-1 ${isToday ? 'bg-blue-500 text-white' : isSelected ? 'bg-green-500 text-white' : 'text-gray-700'}`}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayRes.slice(0, 3).map(r => {
                      const sc = STATUS_CONFIG[r.status]
                      return (
                        <div key={r.id} className="text-[10px] rounded px-1 py-0.5 font-medium truncate leading-tight"
                          style={{ backgroundColor: sc.bgColor, color: sc.color }}>
                          {r.reservation_time} {r.guest_name}
                        </div>
                      )
                    })}
                    {dayRes.length > 3 && (
                      <div className="text-[10px] text-gray-400 font-medium pl-1">+{dayRes.length - 3} meer</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Sub-navigatie */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex bg-gray-100 rounded-xl p-1">
          {(['week', 'day', 'month'] as const).map(m => (
            <button key={m} onClick={() => setCalMode(m)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${calMode === m ? 'bg-[#3C4D6B] text-white' : 'text-gray-500 hover:text-gray-900'}`}>
              {m === 'week' ? 'Week' : m === 'day' ? 'Dag' : 'Maand'}
            </button>
          ))}
        </div>
        <button
          onClick={() => { onSelectDate(new Date().toISOString().split('T')[0]); setCalMode('day') }}
          className="px-3 py-2 rounded-xl bg-green-100 text-green-700 text-sm font-medium hover:bg-green-200 transition-colors"
        >
          Vandaag
        </button>
      </div>

      {calMode === 'week' && renderWeek()}
      {calMode === 'day' && renderDay()}
      {calMode === 'month' && renderMonth()}
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
