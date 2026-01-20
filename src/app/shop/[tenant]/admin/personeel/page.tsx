'use client'

import { useLanguage } from '@/i18n'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { 
  getStaff, 
  saveStaff, 
  deleteStaff, 
  Staff, 
  StaffRole,
  ContractType
} from '@/lib/admin-api'

const STAFF_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', 
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e'
]

const getRoles = (t: (key: string) => string): { id: StaffRole; label: string }[] => [
  { id: 'ADMIN', label: t('personeelPage.roles.admin') },
  { id: 'MANAGER', label: t('personeelPage.roles.manager') },
  { id: 'EMPLOYEE', label: t('personeelPage.roles.employee') },
]

const getContractTypes = (t: (key: string) => string): { id: ContractType; label: string }[] => [
  { id: 'VAST', label: t('personeelPage.contractTypes.permanent') },
  { id: 'INTERIM', label: t('personeelPage.contractTypes.interim') },
  { id: 'FLEXI', label: t('personeelPage.contractTypes.flexi') },
  { id: 'STUDENT', label: t('personeelPage.contractTypes.student') },
  { id: 'SEIZOEN', label: t('personeelPage.contractTypes.seasonal') },
  { id: 'FREELANCE', label: t('personeelPage.contractTypes.freelance') },
  { id: 'STAGE', label: t('personeelPage.contractTypes.intern') },
]

export default function PersoneelPage() {
  const { t } = useLanguage()
  const params = useParams()
  const tenant = params.tenant as string
  
  const ROLES = getRoles(t)
  const LOCAL_CONTRACT_TYPES = getContractTypes(t)
  
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showContractModal, setShowContractModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  
  const [formData, setFormData] = useState<Partial<Staff>>({
    name: '',
    email: '',
    phone: '',
    pin: '',
    role: 'EMPLOYEE',
    color: '#3b82f6',
    is_active: true,
  })
  
  const [contractData, setContractData] = useState<Partial<Staff>>({
    contract_type: undefined,
    hours_per_week: undefined,
    hourly_rate: undefined,
    contract_start: '',
    contract_end: '',
    contract_notes: '',
  })

  useEffect(() => {
    loadStaff()
  }, [tenant])

  async function loadStaff() {
    setLoading(true)
    const data = await getStaff(tenant)
    setStaff(data)
    setLoading(false)
  }

  function openAddModal() {
    setEditingStaff(null)
    setFormData({
      name: '',
      email: '',
      phone: '',
      pin: '',
      role: 'EMPLOYEE',
      color: STAFF_COLORS[Math.floor(Math.random() * STAFF_COLORS.length)],
      is_active: true,
    })
    setShowModal(true)
  }

  function openEditModal(member: Staff) {
    setEditingStaff(member)
    setFormData({
      name: member.name,
      email: member.email || '',
      phone: member.phone || '',
      pin: member.pin,
      role: member.role,
      color: member.color,
      is_active: member.is_active,
    })
    setShowModal(true)
  }

  function openContractModal(member: Staff) {
    setEditingStaff(member)
    setContractData({
      contract_type: member.contract_type,
      hours_per_week: member.hours_per_week,
      hourly_rate: member.hourly_rate,
      contract_start: member.contract_start || '',
      contract_end: member.contract_end || '',
      contract_notes: member.contract_notes || '',
    })
    setShowContractModal(true)
  }

  function generatePin(): string {
    return String(Math.floor(1000 + Math.random() * 9000))
  }

  async function handleSave() {
    if (!formData.name?.trim() || !formData.pin) {
      alert(t('personeelPage.alerts.nameAndPinRequired'))
      return
    }
    
    setSaving(true)
    
    const staffData: Staff = {
      ...(editingStaff || {}),
      tenant_slug: tenant,
      name: formData.name.trim(),
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      pin: formData.pin,
      role: formData.role as StaffRole,
      color: formData.color || '#3b82f6',
      is_active: formData.is_active ?? true,
    }
    
    const result = await saveStaff(staffData)
    setSaving(false)
    
    if (result) {
      setShowModal(false)
      loadStaff()
    } else {
      alert(t('adminPages.common.saveFailed'))
    }
  }

  async function handleSaveContract() {
    if (!editingStaff) return
    
    setSaving(true)
    
    const staffData: Staff = {
      ...editingStaff,
      contract_type: contractData.contract_type,
      hours_per_week: contractData.hours_per_week,
      hourly_rate: contractData.hourly_rate,
      contract_start: contractData.contract_start || undefined,
      contract_end: contractData.contract_end || undefined,
      contract_notes: contractData.contract_notes,
    }
    
    const result = await saveStaff(staffData)
    setSaving(false)
    
    if (result) {
      setShowContractModal(false)
      loadStaff()
    } else {
      alert(t('adminPages.common.saveFailed'))
    }
  }

  async function handleDelete(member: Staff) {
    if (!member.id) return
    if (!confirm(`${t('personeelPage.alerts.confirmDelete')} ${member.name}?`)) return
    
    const success = await deleteStaff(member.id)
    if (success) {
      loadStaff()
    } else {
      alert(t('personeelPage.alerts.deleteFailed'))
    }
  }

  async function toggleActive(member: Staff) {
    if (!member.id) return
    
    const updated = await saveStaff({ ...member, is_active: !member.is_active })
    if (updated) {
      loadStaff()
    }
  }

  const filteredStaff = showInactive ? staff : staff.filter(s => s.is_active)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">👥 {t('personeelPage.title')}</h1>
          <p className="text-gray-600">{t('personeelPage.subtitle')}</p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition flex items-center gap-2"
        >
          <span className="text-xl">+</span>
          <span>{t('personeelPage.addEmployee')}</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-3xl font-bold text-gray-800">{staff.filter(s => s.is_active).length}</div>
          <div className="text-gray-600">{t('personeelPage.stats.activeEmployees')}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-3xl font-bold text-blue-600">{staff.filter(s => s.role === 'ADMIN').length}</div>
          <div className="text-gray-600">{t('personeelPage.roles.admin')}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-3xl font-bold text-purple-600">{staff.filter(s => s.role === 'MANAGER').length}</div>
          <div className="text-gray-600">{t('personeelPage.roles.manager')}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-3xl font-bold text-green-600">{staff.filter(s => s.role === 'EMPLOYEE').length}</div>
          <div className="text-gray-600">{t('personeelPage.roles.employees')}</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
          />
          <span className="text-gray-700">{t('personeelPage.showInactive')}</span>
        </label>
      </div>

      {/* Staff List */}
      {filteredStaff.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border">
          <div className="text-5xl mb-4">👥</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">{t('personeelPage.noEmployees')}</h2>
          <p className="text-gray-600 mb-6">{t('personeelPage.noEmployeesDesc')}</p>
          <button
            onClick={openAddModal}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
          >
            + {t('personeelPage.addFirstEmployee')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((member) => (
            <div
              key={member.id}
              className={`bg-white rounded-xl p-5 shadow-sm border transition ${
                !member.is_active ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold"
                    style={{ backgroundColor: member.color }}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{member.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      member.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' :
                      member.role === 'MANAGER' ? 'bg-purple-100 text-purple-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {ROLES.find(r => r.id === member.role)?.label}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => toggleActive(member)}
                  className={`p-2 rounded-lg transition ${
                    member.is_active 
                      ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                  title={member.is_active ? 'Actief' : 'Inactief'}
                >
                  {member.is_active ? '✓' : '○'}
                </button>
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-2">
                  <span>🔢</span>
                  <span>{t('personeelPage.pin')}: <span className="font-mono font-bold text-gray-800">{member.pin}</span></span>
                </div>
                {member.email && (
                  <div className="flex items-center gap-2">
                    <span>📧</span>
                    <span>{member.email}</span>
                  </div>
                )}
                {member.phone && (
                  <div className="flex items-center gap-2">
                    <span>📱</span>
                    <span>{member.phone}</span>
                  </div>
                )}
                {member.contract_type && (
                  <div className="flex items-center gap-2">
                    <span>📋</span>
                    <span>{LOCAL_CONTRACT_TYPES.find(c => c.id === member.contract_type)?.label}</span>
                  </div>
                )}
                {member.hours_per_week && (
                  <div className="flex items-center gap-2">
                    <span>⏰</span>
                    <span>{member.hours_per_week} {t('personeelPage.hoursPerWeek')}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(member)}
                  className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
                >
                  ✏️ {t('adminPages.common.edit')}
                </button>
                <button
                  onClick={() => openContractModal(member)}
                  className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-sm"
                >
                  📋 {t('personeelPage.contract')}
                </button>
                <button
                  onClick={() => handleDelete(member)}
                  className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition text-sm"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">
                {editingStaff ? `✏️ ${t('personeelPage.editEmployee')}` : `➕ ${t('personeelPage.newEmployee')}`}
              </h2>
            </div>
            
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('personeelPage.form.name')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder={t('personeelPage.form.namePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('personeelPage.form.email')}</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder={t('personeelPage.form.emailPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('personeelPage.form.phone')}</label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder={t('personeelPage.form.phonePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('personeelPage.form.pinCode')} <span className="text-red-500">*</span>
                  <span className="text-gray-500 font-normal ml-1">({t('personeelPage.form.pinHint')})</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.pin || ''}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-xl tracking-widest"
                    placeholder={t('personeelPage.form.pinPlaceholder')}
                    maxLength={4}
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, pin: generatePin() })}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                    title="Of genereer willekeurig"
                  >
                    🎲
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('personeelPage.form.role')}</label>
                <select
                  value={formData.role || 'EMPLOYEE'}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as StaffRole })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  {ROLES.map((role) => (
                    <option key={role.id} value={role.id}>{role.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('personeelPage.form.color')}</label>
                <div className="flex flex-wrap gap-2">
                  {STAFF_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full transition ${
                        formData.color === color ? 'ring-2 ring-offset-2 ring-gray-800' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                {t('adminPages.common.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
              >
                {saving ? `${t('adminPages.common.saving')}...` : editingStaff ? t('urenPage.update') : t('urenPage.add')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contract Modal */}
      {showContractModal && editingStaff && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">
                📋 {t('personeelPage.contract')}: {editingStaff.name}
              </h2>
            </div>
            
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('personeelPage.contractForm.type')}</label>
                <select
                  value={contractData.contract_type || ''}
                  onChange={(e) => setContractData({ ...contractData, contract_type: e.target.value as ContractType || undefined })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">{t('personeelPage.contractForm.select')}</option>
                  {LOCAL_CONTRACT_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('personeelPage.contractForm.hoursPerWeek')}</label>
                  <input
                    type="number"
                    value={contractData.hours_per_week || ''}
                    onChange={(e) => setContractData({ ...contractData, hours_per_week: parseFloat(e.target.value) || undefined })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="38"
                    step="0.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('personeelPage.contractForm.hourlyRate')}</label>
                  <input
                    type="number"
                    value={contractData.hourly_rate || ''}
                    onChange={(e) => setContractData({ ...contractData, hourly_rate: parseFloat(e.target.value) || undefined })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="15.00"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('personeelPage.contractForm.startDate')}</label>
                  <input
                    type="date"
                    value={contractData.contract_start || ''}
                    onChange={(e) => setContractData({ ...contractData, contract_start: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('personeelPage.contractForm.endDate')}</label>
                  <input
                    type="date"
                    value={contractData.contract_end || ''}
                    onChange={(e) => setContractData({ ...contractData, contract_end: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('personeelPage.contractForm.notes')}</label>
                <textarea
                  value={contractData.contract_notes || ''}
                  onChange={(e) => setContractData({ ...contractData, contract_notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder={t('personeelPage.contractForm.notesPlaceholder')}
                />
              </div>

              {contractData.hours_per_week && contractData.hourly_rate && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-2">💰 {t('personeelPage.contractForm.calculation')}</h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <div>{t('personeelPage.contractForm.perWeek')}: €{(contractData.hours_per_week * contractData.hourly_rate).toFixed(2)}</div>
                    <div>{t('personeelPage.contractForm.perMonth')}: €{(contractData.hours_per_week * contractData.hourly_rate * 4.33).toFixed(2)}</div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t flex gap-3 justify-end">
              <button
                onClick={() => setShowContractModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                {t('adminPages.common.cancel')}
              </button>
              <button
                onClick={handleSaveContract}
                disabled={saving}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
              >
                {saving ? `${t('adminPages.common.saving')}...` : t('personeelPage.contractForm.saveContract')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
