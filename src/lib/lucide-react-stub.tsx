/**
 * Geen Lucide-iconen in de UI — alle imports renderen niets.
 * tsconfig paths: "lucide-react" → dit bestand.
 */
import type { FC, SVGProps } from 'react'

export type LucideProps = SVGProps<SVGSVGElement> & {
  size?: number | string
  absoluteStrokeWidth?: boolean
}

export type LucideIcon = FC<LucideProps>

const NullIcon: LucideIcon = () => null

export default NullIcon

const icons = [
  'AlertCircle',
  'Ban',
  'BarChart3',
  'Calculator',
  'Calendar',
  'CalendarDays',
  'CheckCircle2',
  'ChefHat',
  'ChevronLeft',
  'ChevronRight',
  'Clock',
  'ExternalLink',
  'Eye',
  'EyeOff',
  'Flame',
  'Globe',
  'GripVertical',
  'LayoutGrid',
  'List',
  'Lock',
  'LockOpen',
  'Mail',
  'MapPin',
  'Maximize2',
  'MessageCircle',
  'MessageSquare',
  'Minimize2',
  'Monitor',
  'Phone',
  'Plus',
  'Rocket',
  'Search',
  'Send',
  'Settings',
  'ShoppingBag',
  'Star',
  'Store',
  'UserCheck',
  'UserX',
  'Users',
  'UtensilsCrossed',
  'Wallet',
  'X',
  'XCircle',
] as const

type IconName = (typeof icons)[number]

const named: Record<IconName, LucideIcon> = Object.fromEntries(
  icons.map((name) => [name, NullIcon]),
) as Record<IconName, LucideIcon>

export const AlertCircle = named.AlertCircle
export const Ban = named.Ban
export const BarChart3 = named.BarChart3
export const Calculator = named.Calculator
export const Calendar = named.Calendar
export const CalendarDays = named.CalendarDays
export const CheckCircle2 = named.CheckCircle2
export const ChefHat = named.ChefHat
export const ChevronLeft = named.ChevronLeft
export const ChevronRight = named.ChevronRight
export const Clock = named.Clock
export const ExternalLink = named.ExternalLink
export const Eye = named.Eye
export const EyeOff = named.EyeOff
export const Flame = named.Flame
export const Globe = named.Globe
export const GripVertical = named.GripVertical
export const LayoutGrid = named.LayoutGrid
export const List = named.List
export const Lock = named.Lock
export const LockOpen = named.LockOpen
export const Mail = named.Mail
export const MapPin = named.MapPin
export const Maximize2 = named.Maximize2
export const MessageCircle = named.MessageCircle
export const MessageSquare = named.MessageSquare
export const Minimize2 = named.Minimize2
export const Monitor = named.Monitor
export const Phone = named.Phone
export const Plus = named.Plus
export const Rocket = named.Rocket
export const Search = named.Search
export const Send = named.Send
export const Settings = named.Settings
export const ShoppingBag = named.ShoppingBag
export const Star = named.Star
export const Store = named.Store
export const UserCheck = named.UserCheck
export const UserX = named.UserX
export const Users = named.Users
export const UtensilsCrossed = named.UtensilsCrossed
export const Wallet = named.Wallet
export const X = named.X
export const XCircle = named.XCircle
