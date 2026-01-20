'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent 
} from '@dnd-kit/core'
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  useSortable,
  verticalListSortingStrategy 
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { 
  getProductOptions, 
  saveProductOption, 
  deleteProductOption, 
  ProductOption, 
  ProductOptionChoice 
} from '@/lib/admin-api'
import { useLanguage } from '@/i18n'

// Sortable Choice Component
function SortableChoice({ 
  id, 
  choice, 
  index, 
  onUpdate, 
  onRemove, 
  canRemove,
  placeholder
}: {
  id: string
  choice: ProductOptionChoice
  index: number
  onUpdate: (field: string, value: any) => void
  onRemove: () => void
  canRemove: boolean
  placeholder: string
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className={`flex gap-2 items-center ${isDragging ? 'z-50' : ''}`}>
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="p-2 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
        title="Sleep om te verplaatsen"
      >
        ⠿
      </button>
      <input
        type="text"
        value={choice.name}
        onChange={(e) => {
          const val = e.target.value
          const capitalized = val.charAt(0).toUpperCase() + val.slice(1)
          onUpdate('name', capitalized)
        }}
        className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent capitalize"
        placeholder={placeholder}
      />
      <div className="relative w-28">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={choice.price || ''}
          onChange={(e) => onUpdate('price', parseFloat(e.target.value) || 0)}
          className="w-full pl-8 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          placeholder="0.00"
        />
      </div>
      {canRemove && (
        <button
          onClick={onRemove}
          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          🗑️
        </button>
      )}
    </div>
  )
}

export default function OptiesPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const [options, setOptions] = useState<ProductOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingOption, setEditingOption] = useState<ProductOption | null>(null)
  const [formData, setFormData] = useState<ProductOption>({
    tenant_slug: params.tenant,
    name: '',
    type: 'single',
    required: false,
    sort_order: 0,
    is_active: true,
    choices: []
  })

  // Drag & drop sensors for choices
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handle drag end for choices
  const handleChoiceDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const choices = formData.choices || []
    const oldIndex = choices.findIndex((_, i) => `choice-${i}` === active.id)
    const newIndex = choices.findIndex((_, i) => `choice-${i}` === over.id)

    if (oldIndex !== -1 && newIndex !== -1) {
      const newChoices = arrayMove(choices, oldIndex, newIndex).map((c, i) => ({
        ...c,
        sort_order: i
      }))
      setFormData(prev => ({ ...prev, choices: newChoices }))
    }
  }

  // Load options on mount
  useEffect(() => {
    loadOptions()
  }, [params.tenant])

  const loadOptions = async () => {
    setLoading(true)
    const data = await getProductOptions(params.tenant)
    setOptions(data)
    setLoading(false)
  }

  const openAddModal = () => {
    setFormData({
      tenant_slug: params.tenant,
      name: '',
      type: 'single',
      required: false,
      sort_order: options.length,
      is_active: true,
      choices: [{ tenant_slug: params.tenant, name: '', price: 0, sort_order: 0, is_active: true }]
    })
    setEditingOption(null)
    setShowModal(true)
  }

  const openEditModal = (option: ProductOption) => {
    setFormData({
      ...option,
      choices: option.choices && option.choices.length > 0 
        ? option.choices 
        : [{ tenant_slug: params.tenant, name: '', price: 0, sort_order: 0, is_active: true }]
    })
    setEditingOption(option)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingOption(null)
    setError('')
  }

  const addChoice = () => {
    setFormData(prev => ({
      ...prev,
      choices: [
        ...(prev.choices || []),
        { tenant_slug: params.tenant, name: '', price: 0, sort_order: (prev.choices?.length || 0), is_active: true }
      ]
    }))
  }

  const removeChoice = (index: number) => {
    setFormData(prev => ({
      ...prev,
      choices: prev.choices?.filter((_, i) => i !== index) || []
    }))
  }

  const updateChoice = (index: number, field: keyof ProductOptionChoice, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      choices: prev.choices?.map((choice, i) => 
        i === index ? { ...choice, [field]: value } : choice
      ) || []
    }))
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError(t('adminPages.opties.fillName'))
      return
    }

    const validChoices = formData.choices?.filter(c => c.name.trim() !== '') || []
    if (validChoices.length === 0) {
      setError(t('adminPages.opties.addAtLeastOne'))
      return
    }

    setSaving(true)
    setError('')

    const optionToSave: ProductOption = {
      ...formData,
      id: editingOption?.id,
      choices: validChoices
    }

    const result = await saveProductOption(optionToSave)

    if (result) {
      await loadOptions()
      closeModal()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      setError(t('adminPages.opties.saveFailed'))
    }

    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (confirm(t('adminPages.opties.confirmDelete'))) {
      const success = await deleteProductOption(id)
      if (success) {
        setOptions(prev => prev.filter(o => o.id !== id))
      } else {
        setError(t('adminPages.opties.deleteFailed'))
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-500">{t('adminPages.common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('adminPages.opties.title')}</h1>
          <p className="text-gray-500">{t('adminPages.opties.subtitle')}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openAddModal}
          className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium flex items-center gap-2"
        >
          <span>➕</span>
          <span>{t('adminPages.opties.addOption')}</span>
        </motion.button>
      </div>

      {/* Success Message */}
      {saved && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-600 flex items-center gap-2"
        >
          <span>✓</span> {t('adminPages.common.saved')}
        </motion.div>
      )}

      {/* Error Message */}
      {error && !showModal && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
          {error}
        </div>
      )}

      {/* Options List */}
      <div className="space-y-4">
        {options.map((option, index) => (
          <motion.div
            key={option.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg text-gray-900">{option.name}</h3>
                <div className="flex gap-2 mt-1">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    option.type === 'single' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {option.type === 'single' ? t('adminPages.opties.singleChoice') : t('adminPages.opties.multipleChoice')}
                  </span>
                  {option.required && (
                    <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                      {t('adminPages.opties.required')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => openEditModal(option)}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  ✏️
                </button>
                <button 
                  onClick={() => handleDelete(option.id!)}
                  className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                >
                  🗑️
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
              {option.choices?.map((choice) => (
                <div 
                  key={choice.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                >
                  <span className="text-gray-700">{choice.name}</span>
                  <span className={`font-medium ${choice.price > 0 ? 'text-orange-500' : 'text-gray-400'}`}>
                    {choice.price > 0 ? `+€${choice.price.toFixed(2)}` : t('adminPages.opties.free')}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {options.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl">
          <span className="text-6xl mb-4 block">⚙️</span>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{t('adminPages.opties.noOptions')}</h3>
          <p className="text-gray-500 mb-6">{t('adminPages.opties.noOptionsDesc')}</p>
          <button
            onClick={openAddModal}
            className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-6 py-3 rounded-xl"
          >
            {t('adminPages.opties.addFirstOption')}
          </button>
        </div>
      )}

      {/* Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-6"
      >
        <h3 className="font-semibold text-blue-900 mb-2">{t('adminPages.opties.howItWorks')}</h3>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• <strong>{t('adminPages.opties.singleChoice')}:</strong> {t('adminPages.opties.singleChoiceDesc')}</li>
          <li>• <strong>{t('adminPages.opties.multipleChoice')}:</strong> {t('adminPages.opties.multipleChoiceDesc')}</li>
          <li>• <strong>{t('adminPages.opties.required')}:</strong> {t('adminPages.opties.requiredDesc')}</li>
        </ul>
      </motion.div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b sticky top-0 bg-white z-10">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingOption ? t('adminPages.opties.editOption') : t('adminPages.opties.addOption')}
                  </h2>
                  <button
                    onClick={closeModal}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Error in Modal */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
                    {error}
                  </div>
                )}

                {/* Option Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('adminPages.opties.optionName')} *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      const val = e.target.value
                      const capitalized = val.charAt(0).toUpperCase() + val.slice(1)
                      setFormData(prev => ({ ...prev, name: capitalized }))
                    }}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder={t('adminPages.opties.optionNamePlaceholder')}
                  />
                </div>

                {/* Type & Required */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('adminPages.opties.typeChoice')}
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'single' | 'multiple' }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="single">{t('adminPages.opties.singleChoice')}</option>
                      <option value="multiple">{t('adminPages.opties.multipleChoice')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('adminPages.opties.required')}?
                    </label>
                    <div className="flex items-center gap-4 h-12">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.required}
                          onChange={(e) => setFormData(prev => ({ ...prev, required: e.target.checked }))}
                          className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                        />
                        <span>{t('adminPages.opties.mustChoose')}</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Choices with Drag & Drop */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('adminPages.opties.choices')} * <span className="text-gray-400 font-normal">({t('adminPages.opties.dragToSort')})</span>
                  </label>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleChoiceDragEnd}
                  >
                    <SortableContext
                      items={(formData.choices || []).map((_, i) => `choice-${i}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {formData.choices?.map((choice, index) => (
                          <SortableChoice
                            key={`choice-${index}`}
                            id={`choice-${index}`}
                            choice={choice}
                            index={index}
                            onUpdate={(field, value) => updateChoice(index, field, value)}
                            onRemove={() => removeChoice(index)}
                            canRemove={(formData.choices?.length || 0) > 1}
                            placeholder={t('adminPages.opties.choiceNamePlaceholder')}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                  <button
                    onClick={addChoice}
                    className="mt-3 w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-orange-500 hover:text-orange-500 transition-colors"
                  >
                    {t('adminPages.opties.addChoice')}
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t bg-gray-50 flex justify-end gap-4">
                <button
                  onClick={closeModal}
                  className="px-6 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  {t('adminPages.common.cancel')}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                      <span>{t('adminPages.common.saving')}</span>
                    </>
                  ) : (
                    <span>{editingOption ? t('adminPages.common.save') : t('adminPages.common.add')}</span>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
