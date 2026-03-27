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

Voorbeeld korte rook-test:

```bash
VUS=10 DURATION=30s k6 run k6/ordervysion-load.js
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
