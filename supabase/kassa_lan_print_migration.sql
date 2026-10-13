-- iPad → print via LAN (WiFi naar Windows Print Agent op vaste PC-IP).
-- Default uit: bestaande kassa's blijven op 127.0.0.1:9742.

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS kassa_lan_print_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS kassa_lan_print_host TEXT NULL;

COMMENT ON COLUMN tenant_settings.kassa_lan_print_enabled IS
  'true = iPads mogen print-PC IP gebruiken (LAN); PC blijft localhost indien agent lokaal bereikbaar.';

COMMENT ON COLUMN tenant_settings.kassa_lan_print_host IS
  'Optioneel vast IP van de print-PC voor deze tenant (bv. 192.168.1.50). iPad kan lokaal overschrijven.';
