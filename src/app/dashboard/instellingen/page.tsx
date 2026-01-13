'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/i18n'

export default function InstellingenPage() {
  const [saved, setSaved] = useState(false)
  const { t } = useLanguage()
  const trans = (key: string) => t(`settingsPage.${key}`)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{trans('title')}</h1>
        <p className="text-gray-500 mt-1">{trans('subtitle')}</p>
      </div>

      {saved && (
        <div className="bg-green-100 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {trans('saved')}
        </div>
      )}

      {/* Account Section */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{trans('sections.account.title')}</h2>
          <p className="text-sm text-gray-500">{trans('sections.account.subtitle')}</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{trans('sections.account.firstName')}</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none"
                placeholder="Jan"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{trans('sections.account.lastName')}</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none"
                placeholder="Janssen"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{trans('sections.account.email')}</label>
            <input 
              type="email" 
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none"
              placeholder="jan@voorbeeld.be"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{trans('sections.account.phone')}</label>
            <input 
              type="tel" 
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none"
              placeholder="+32 123 45 67 89"
            />
          </div>
        </div>
      </div>

      {/* Subscription Section */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{trans('sections.subscription.title')}</h2>
          <p className="text-sm text-gray-500">{trans('sections.subscription.subtitle')}</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Standard Package */}
            <div className="border-2 border-gray-200 rounded-xl p-6 hover:border-accent transition-colors">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{trans('sections.subscription.standardPackage')}</h3>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  {trans('sections.subscription.active')}
                </span>
              </div>
              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-900">{trans('sections.subscription.standardPrice')}</span>
                <span className="text-gray-500 ml-2">{trans('sections.subscription.perMonth')}</span>
              </div>
              <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors">
                {trans('sections.subscription.manageSubscription')}
              </button>
            </div>

            {/* Premium Package */}
            <div className="border-2 border-gray-200 rounded-xl p-6 hover:border-accent transition-colors">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{trans('sections.subscription.premiumPackage')}</h3>
                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                  {trans('sections.subscription.upgrade')}
                </span>
              </div>
              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-900">{trans('sections.subscription.premiumPrice')}</span>
                <span className="text-gray-500 ml-2">{trans('sections.subscription.perMonth')}</span>
              </div>
              <button className="w-full px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors">
                {trans('sections.subscription.upgrade')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Method Section */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            {trans('sections.paymentMethod.title')}
          </h2>
          <p className="text-sm text-gray-500 mt-1">{trans('sections.paymentMethod.subtitle')}</p>
        </div>
        <div className="p-6">
          <div className="p-4 bg-gray-50 rounded-xl text-center">
            <p className="text-gray-600 mb-3">{trans('sections.paymentMethod.noPaymentMethod')}</p>
            <button 
              onClick={async () => {
                try {
                  const response = await fetch('/api/billing/portal', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                  });
                  const data = await response.json();
                  if (data.url) {
                    window.location.href = data.url;
                  }
                } catch (error) {
                  console.error('Portal error:', error);
                }
              }}
              className="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors"
            >
              {trans('sections.paymentMethod.addPaymentMethod')}
            </button>
          </div>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{trans('sections.notifications.title')}</h2>
          <p className="text-sm text-gray-500">{trans('sections.notifications.subtitle')}</p>
        </div>
        <div className="p-6 space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="font-medium text-gray-900">{trans('sections.notifications.email.title')}</p>
              <p className="text-sm text-gray-500">{trans('sections.notifications.email.description')}</p>
            </div>
            <input type="checkbox" className="w-5 h-5 text-accent rounded" defaultChecked />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="font-medium text-gray-900">{trans('sections.notifications.daily.title')}</p>
              <p className="text-sm text-gray-500">{trans('sections.notifications.daily.description')}</p>
            </div>
            <input type="checkbox" className="w-5 h-5 text-accent rounded" />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="font-medium text-gray-900">{trans('sections.notifications.orders.title')}</p>
              <p className="text-sm text-gray-500">{trans('sections.notifications.orders.description')}</p>
            </div>
            <input type="checkbox" className="w-5 h-5 text-accent rounded" defaultChecked />
          </label>
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{trans('sections.security.title')}</h2>
          <p className="text-sm text-gray-500">{trans('sections.security.subtitle')}</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{trans('sections.security.currentPassword')}</label>
            <input 
              type="password" 
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{trans('sections.security.newPassword')}</label>
            <input 
              type="password" 
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{trans('sections.security.confirmPassword')}</label>
            <input 
              type="password" 
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none"
              placeholder="••••••••"
            />
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{trans('sections.help.title')}</h2>
          <p className="text-sm text-gray-500">{trans('sections.help.subtitle')}</p>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link 
            href="/login/troubleshooting"
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-accent transition-colors"
          >
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">{trans('sections.help.troubleshooting')}</p>
              <p className="text-sm text-gray-500">{trans('sections.help.troubleshootingDesc')}</p>
            </div>
          </Link>
          <a 
            href="mailto:info@vysionhoreca.com"
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-accent transition-colors"
          >
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">{trans('sections.help.emailSupport')}</p>
              <p className="text-sm text-gray-500">info@vysionhoreca.com</p>
            </div>
          </a>
          <a 
            href="tel:+32492129383"
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-accent transition-colors"
          >
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">{trans('sections.help.callSupport')}</p>
              <p className="text-sm text-gray-500">+32 492 12 93 83</p>
            </div>
          </a>
          <a 
            href="https://wa.me/32492129383"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-accent transition-colors"
          >
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">{trans('sections.help.whatsapp')}</p>
              <p className="text-sm text-gray-500">{trans('sections.help.whatsappDesc')}</p>
            </div>
          </a>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-6 py-3 bg-accent text-white rounded-lg font-semibold hover:bg-accent/90 transition-colors"
        >
          {trans('saveChanges')}
        </button>
      </div>
    </div>
  )
}
