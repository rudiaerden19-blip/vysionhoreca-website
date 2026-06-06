export type GksVatLabel = 'A' | 'B' | 'C' | 'D' | 'X'

export type GksEventLabel = 'N' | 'P' | 'R'

export type GksTicketMedium = 'PAPER' | 'DIGITAL' | 'PAPER_DIGITAL' | 'NONE'

export type GksLanguage = 'NL' | 'FR' | 'EN' | 'DE'

export type GksCostCenterType = 'TABLE' | 'CHAIR' | 'ON_HOLD' | 'OTHER'

export interface GksCostCenter {
  id: string
  type: GksCostCenterType
  reference: string
}

export interface GksVatInput {
  label: GksVatLabel
  price: number
}

export interface GksProductInput {
  productId: string
  productName: string
  departmentId: string
  departmentName: string
  quantity: number
  unitPrice: number
  vats: GksVatInput[]
}

export interface GksTransactionLineInput {
  lineType: 'SINGLE_PRODUCT'
  mainProduct: GksProductInput
  lineTotal: number
}

export interface GksTransactionInput {
  transactionLines: GksTransactionLineInput[]
  transactionTotal: number
}

export type GksPaymentType = 'CASH' | 'CARD_DEBIT' | 'CARD_UNKNOWN' | 'CARD_CREDIT' | 'OTHER'

export interface GksPaymentLineInput {
  id: string
  name: string
  type: GksPaymentType
  inputMethod: 'MANUAL' | 'AUTOMATIC'
  amount: number
  amountType: 'PAYMENT' | 'ROUNDING'
}

export interface GksPosEnvelope {
  language: GksLanguage
  ticketMedium: GksTicketMedium
  posId: string
  posFiscalTicketNo: number
  posSwVersion: string
  terminalId: string
  deviceId: string
  posDateTime: string
  bookingPeriodId: string
  bookingDate: string
  vatNo: string
  estNo: string
  employeeId: string
}

export interface GksFdmRef {
  fdmId: string
  fdmDateTime: string
  eventLabel: GksEventLabel
  eventCounter: number
  totalCounter: number
}

export interface GksVatCalcItem {
  label: GksVatLabel
  rate: number
  taxableAmount: number
  vatAmount: number
  totalAmount: number
  outOfScope: boolean
}

export interface GksSignResult {
  posId: string
  posFiscalTicketNo: number
  posDateTime: string
  terminalId: string
  deviceId: string
  eventOperation: string
  fdmRef: GksFdmRef
  fdmSwVersion: string
  digitalSignature: string
  shortSignature?: string
  verificationUrl?: string
  vatCalc?: GksVatCalcItem[]
  bufferCapacityUsed: number
  footer: string[]
}

export interface GksFdmStatus {
  initialized: boolean
  operational: boolean
  fdmId: string
  fdmSwVersion: string
  bufferCapacityUsed: number
  messages: string[]
}

export interface GksFiscalJournalEntry {
  id: string
  tenantSlug: string
  createdAt: string
  mutation: 'signOrder' | 'signPreBill' | 'signSale' | 'signReportTurnoverZ' | 'status'
  request: Record<string, unknown>
  response: Record<string, unknown> | GksSignResult | GksFdmStatus
  mock: boolean
}
