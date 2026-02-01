'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface DailyStats {
  date: string
  page_path: string
  views: number
}

interface TotalStats {
  total_views: number
  days_tracked: number
  views_today: number
  views_week: number
  views_month: number
}

interface TopPage {
  page_path: string
  views: number
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [totals, setTotals] = useState<TotalStats | null>(null)
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [topPages, setTopPages] = useState<TopPage[]>([])
  const [recentViews, setRecentViews] = useState<any[]>([])

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const adminId = localStorage.getItem('superadmin_id')
    if (!adminId) {
      router.push('/superadmin/login')
      return
    }
    await loadData()
  }

  async function loadData() {
    if (!supabase) {
      setLoading(false)
      return
    }

    // Get totals
    const { data: totalsData } = await supabase
      .from('page_view_totals')
      .select('*')
      .single()

    if (totalsData) {
      setTotals(totalsData)
    }

    // Get daily stats (last 7 days)
    const { data: dailyData } = await supabase
      .from('daily_page_views')
      .select('*')
      .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false })
      .limit(50)

    if (dailyData) {
      setDailyStats(dailyData)
    }

    // Get top pages all time
    const { data: topData } = await supabase
      .from('page_views')
      .select('page_path')
    
    if (topData) {
      const counts: Record<string, number> = {}
      topData.forEach(v => {
        counts[v.page_path] = (counts[v.page_path] || 0) + 1
      })
      const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([page_path, views]) => ({ page_path, views }))
      setTopPages(sorted)
    }

    // Get recent views
    const { data: recentData } = await supabase
      .from('page_views')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (recentData) {
      setRecentViews(recentData)
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/superadmin" className="text-slate-400 hover:text-white transition-colors">
              ← Terug
            </Link>
            <h1 className="text-xl font-bold text-white">📊 Website Analytics</h1>
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            🔄 Vernieuwen
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <p className="text-slate-400 text-sm">Vandaag</p>
            <p className="text-4xl font-bold text-green-400 mt-1">{totals?.views_today || 0}</p>
          </div>
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <p className="text-slate-400 text-sm">Deze week</p>
            <p className="text-4xl font-bold text-blue-400 mt-1">{totals?.views_week || 0}</p>
          </div>
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <p className="text-slate-400 text-sm">Deze maand</p>
            <p className="text-4xl font-bold text-purple-400 mt-1">{totals?.views_month || 0}</p>
          </div>
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <p className="text-slate-400 text-sm">Totaal</p>
            <p className="text-4xl font-bold text-orange-400 mt-1">{totals?.total_views || 0}</p>
          </div>
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <p className="text-slate-400 text-sm">Dagen getrackt</p>
            <p className="text-4xl font-bold text-white mt-1">{totals?.days_tracked || 0}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Top Pages */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">🏆 Top Pagina's</h2>
            <div className="space-y-3">
              {topPages.length === 0 ? (
                <p className="text-slate-400">Nog geen data</p>
              ) : (
                topPages.map((page, index) => (
                  <div key={page.page_path} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-slate-500">#{index + 1}</span>
                      <span className="text-white">{page.page_path || '/'}</span>
                    </div>
                    <span className="text-orange-400 font-bold">{page.views} views</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Views */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">🕐 Recente Bezoekers</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {recentViews.length === 0 ? (
                <p className="text-slate-400">Nog geen bezoekers</p>
              ) : (
                recentViews.map((view) => (
                  <div key={view.id} className="flex items-center justify-between py-2 border-b border-slate-700">
                    <div>
                      <p className="text-white text-sm">{view.page_path || '/'}</p>
                      <p className="text-slate-500 text-xs">
                        {view.country && `${view.country} • `}
                        {new Date(view.created_at).toLocaleString('nl-BE')}
                      </p>
                    </div>
                    {view.referrer && (
                      <span className="text-xs text-slate-400 truncate max-w-[150px]">
                        via {new URL(view.referrer).hostname}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Daily Stats */}
        <div className="mt-8 bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">📅 Dagelijkse Stats (afgelopen 7 dagen)</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 text-slate-400">Datum</th>
                  <th className="text-left py-3 text-slate-400">Pagina</th>
                  <th className="text-right py-3 text-slate-400">Views</th>
                </tr>
              </thead>
              <tbody>
                {dailyStats.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-4 text-slate-400 text-center">Nog geen data</td>
                  </tr>
                ) : (
                  dailyStats.map((stat, index) => (
                    <tr key={index} className="border-b border-slate-700/50">
                      <td className="py-3 text-white">{stat.date}</td>
                      <td className="py-3 text-slate-300">{stat.page_path || '/'}</td>
                      <td className="py-3 text-right text-orange-400 font-bold">{stat.views}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
