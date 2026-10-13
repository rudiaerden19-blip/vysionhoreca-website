/** Alleen builds met versie *-pilot (thelagoon test-PC). Geen commerciële release. */
const PILOT_CLOUD_API_BASE = 'https://www.vysion-kassa.com'
const PILOT_CLOUD_DEVICE_TOKEN = 'vpa_3-faPLdwMj3WBDzT-MFk5xIYiSCjX2EdHR_88dlJoMU'

function isPilotAgentBuild(version) {
  return String(version || '').includes('pilot')
}

const PILOT_DEFAULT_KASSA_URL = 'https://www.vysion-kassa.com/shop/thelagoon/admin/kassa'

function applyPilotCloudDefaults(cfg, version) {
  if (!isPilotAgentBuild(version)) return cfg
  return {
    ...cfg,
    kassaUrl: (cfg.kassaUrl && cfg.kassaUrl.trim()) || PILOT_DEFAULT_KASSA_URL,
    cloudPrintEnabled: true,
    lanListenEnabled: false,
    cloudPrintApiBase: PILOT_CLOUD_API_BASE,
    cloudPrintDeviceToken: PILOT_CLOUD_DEVICE_TOKEN,
  }
}

module.exports = {
  isPilotAgentBuild,
  applyPilotCloudDefaults,
  PILOT_CLOUD_API_BASE,
  PILOT_DEFAULT_KASSA_URL,
}
