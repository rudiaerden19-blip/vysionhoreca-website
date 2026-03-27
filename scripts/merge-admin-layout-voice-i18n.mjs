import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const ADMIN_LAYOUT = {
  nl: {
    loading: 'Laden...',
    shopNotFound: 'Shop niet gevonden',
    shopNotFoundDesc: 'Deze shop bestaat niet of is verwijderd.',
    backToVysion: '← Terug naar Vysion',
    pos: 'Kassa',
    onlineDisplay: 'Onlinescherm',
    lock: 'Vergrendel',
  },
  en: {
    loading: 'Loading...',
    shopNotFound: 'Shop not found',
    shopNotFoundDesc: 'This shop does not exist or was removed.',
    backToVysion: '← Back to Vysion',
    pos: 'POS',
    onlineDisplay: 'Customer display',
    lock: 'Lock',
  },
  de: {
    loading: 'Laden...',
    shopNotFound: 'Shop nicht gefunden',
    shopNotFoundDesc: 'Dieser Shop existiert nicht oder wurde entfernt.',
    backToVysion: '← Zurück zu Vysion',
    pos: 'Kasse',
    onlineDisplay: 'Kundendisplay',
    lock: 'Sperren',
  },
  fr: {
    loading: 'Chargement...',
    shopNotFound: 'Boutique introuvable',
    shopNotFoundDesc: "Cette boutique n'existe pas ou a été supprimée.",
    backToVysion: '← Retour à Vysion',
    pos: 'Caisse',
    onlineDisplay: 'Écran client',
    lock: 'Verrouiller',
  },
  es: {
    loading: 'Cargando...',
    shopNotFound: 'Tienda no encontrada',
    shopNotFoundDesc: 'Esta tienda no existe o fue eliminada.',
    backToVysion: '← Volver a Vysion',
    pos: 'TPV',
    onlineDisplay: 'Pantalla cliente',
    lock: 'Bloquear',
  },
  it: {
    loading: 'Caricamento...',
    shopNotFound: 'Negozio non trovato',
    shopNotFoundDesc: 'Questo negozio non esiste o è stato rimosso.',
    backToVysion: '← Torna a Vysion',
    pos: 'Cassa',
    onlineDisplay: 'Display cliente',
    lock: 'Blocca',
  },
  ja: {
    loading: '読み込み中...',
    shopNotFound: 'ショップが見つかりません',
    shopNotFoundDesc: 'このショップは存在しないか削除されました。',
    backToVysion: '← Vysion に戻る',
    pos: 'レジ',
    onlineDisplay: '客向け画面',
    lock: 'ロック',
  },
  zh: {
    loading: '加载中...',
    shopNotFound: '找不到店铺',
    shopNotFoundDesc: '该店铺不存在或已被删除。',
    backToVysion: '← 返回 Vysion',
    pos: '收银',
    onlineDisplay: '顾客显示屏',
    lock: '锁定',
  },
  ar: {
    loading: 'جاري التحميل...',
    shopNotFound: 'المتجر غير موجود',
    shopNotFoundDesc: 'هذا المتجر غير موجود أو تم حذفه.',
    backToVysion: '← العودة إلى Vysion',
    pos: 'الكاشير',
    onlineDisplay: 'شاشة العملاء',
    lock: 'قفل',
  },
}

for (const loc of Object.keys(ADMIN_LAYOUT)) {
  const p = path.join(root, 'messages', `${loc}.json`)
  const j = JSON.parse(fs.readFileSync(p, 'utf8'))
  j.adminLayout = ADMIN_LAYOUT[loc]
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n')
}
console.log('OK: adminLayout for', Object.keys(ADMIN_LAYOUT).join(', '))
