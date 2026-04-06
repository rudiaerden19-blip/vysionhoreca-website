/** Afhaal-/bezorgmoment tonen (scheduled_date + scheduled_time), tenant-onafhankelijk. */

export function formatOrderScheduleDetail(
  order: { scheduled_date?: string | null; scheduled_time?: string | null },
  locale: string
): string | null {
  const loc =
    locale === 'nl'
      ? 'nl-BE'
      : locale === 'fr'
        ? 'fr-BE'
        : locale === 'de'
          ? 'de-BE'
          : locale === 'es'
            ? 'es-ES'
            : locale === 'it'
              ? 'it-IT'
              : locale === 'ja'
                ? 'ja-JP'
                : locale === 'zh'
                  ? 'zh-CN'
                  : locale === 'ar'
                    ? 'ar-SA'
                    : 'en-BE'

  const dateStr = order.scheduled_date
    ? new Date(order.scheduled_date).toLocaleDateString(loc, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : ''

  const timeStr = (order.scheduled_time || '').trim()
  if (!dateStr && !timeStr) return null

  if (dateStr && timeStr) {
    const connector =
      locale === 'nl'
        ? 'om'
        : locale === 'de'
          ? 'um'
          : locale === 'fr'
            ? 'à'
            : locale === 'it'
              ? 'alle'
              : locale === 'es'
                ? 'a las'
                : locale === 'ar'
                  ? 'في'
                  : 'at'
    if (locale === 'ja' || locale === 'zh') {
      return `${dateStr} · ${timeStr}`
    }
    return `${dateStr} ${connector} ${timeStr}`
  }
  return dateStr || timeStr
}
