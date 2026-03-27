# k6 load tests (ordervysion)

## Install k6

**macOS (Homebrew)**

```bash
brew install k6
```

**Windows / Linux**

Zie [grafana.com/docs/k6/latest/set-up/install-k6](https://grafana.com/docs/k6/latest/set-up/install-k6/).

**Docker** (geen lokale install)

```bash
docker run --rm -v "$(pwd):/src" -w /src grafana/k6 run k6/ordervysion-load.js
```

## Run de load test

Standaard: **50 VUs**, **60 seconden**, beide tenants (`skippsbv`, `frituurnolim`).

```bash
k6 run k6/ordervysion-load.js
```

Of via npm (vereist geïnstalleerde `k6` op je PATH):

```bash
npm run k6:load
```

### Omgevingsvariabelen

| Variabele   | Default | Beschrijving        |
|------------|---------|---------------------|
| `VUS`      | `50`    | Gelijktijdige users |
| `DURATION` | `60s`   | Looptijd test        |
| `TENANT_FILE` | `k6/tenants.txt` | Slugs (één per regel) |
| `HARD`     | —       | Zet `1` voor zwaardere run: kortere pauzes + `/checkout` + `/api/health` |
| `RAMP`     | —       | Zet `1` voor **oplopende** VUs i.p.v. plat `VUS`/`DURATION` |
| `RAMP_TARGET` | `200` | Piek-VUs bij `RAMP=1` |
| `RAMP_STEADY` | `2m`  | Hoelang piek aanhoudt |
| `RAMP_UP` / `RAMP_DOWN` | `30s` | Op- en afbouwen |

Voorbeeld korte rook-test:

```bash
VUS=10 DURATION=30s k6 run k6/ordervysion-load.js
```

Zwaarder (meer hits, minder “denktijd”):

```bash
HARD=1 VUS=200 DURATION=3m TENANT_FILE=k6/tenants.txt k6 run k6/ordervysion-load.js
```

Ramp naar 300 VUs:

```bash
HARD=1 RAMP=1 RAMP_TARGET=300 RAMP_STEADY=3m TENANT_FILE=k6/tenants.txt k6 run k6/ordervysion-load.js
```

### Output / metrics

- **Response times**: in de standaard k6-summary onder o.a. `http_req_duration`, `home_duration_ms`, `menu_duration_ms`.
- **Error rate**: `http_req_failed`, thresholds op checks, custom `home_errors` / `menu_errors`.

JSON export:

```bash
k6 run --summary-export=k6/summary.json k6/ordervysion-load.js
```

## Let op

- Dit raakt **productie-URLs**; gebruik korte runs of lagere `VUS` om geen ongewenste load te veroorzaken.
- Stem met je hosting/klanten af voor hogere volumes.
