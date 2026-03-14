# FaceLipa API Reference

**Base URL:** `https://9a96-102-218-28-192.ngrok-free.app`

All request/response bodies are JSON. For ngrok, you may need to send the header `ngrok-skip-browser-warning: true` if you get a browser warning page.

---

## Health

### GET /health

Check API availability.

**Response:** `200 OK`

```json
{ "status": "ok" }
```

---

## Face registration

### POST /api/register-face

Register a customer's face and create/link a Tembo Plus wallet using KYC. If `external_user_id` is provided, links to that user; otherwise creates a new profile.

**Requires:** Supabase and Tembo configured on the server.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `embedding` | `float[]` | Yes | Exactly **128** face embedding values |
| `external_user_id` | `string` (UUID) | No | Existing app user ID to link; omit for new user |
| `firstName` | `string` | Yes | First name |
| `lastName` | `string` | Yes | Last name |
| `middleName` | `string` | No | Middle name |
| `dateOfBirth` | `string` | Yes | `YYYY-MM-DD` |
| `gender` | `string` | Yes | `M` or `F` |
| `identityInfo` | object | Yes | See below |
| `address` | object | Yes | See below |
| `mobileNo` | `string` | Yes | Phone number |
| `email` | `string` | Yes | Email |
| `currencyCode` | `string` | No | Default `TZS` |

**identityInfo:**

| Field | Type | Description |
|-------|------|-------------|
| `idType` | `string` | `DRIVER_LICENSE`, `VOTER_ID`, `INTL_PASSPORT`, or `NATIONAL_ID` |
| `idNumber` | `string` | ID number |
| `issueDate` | `string` | `YYYY-MM-DD` |
| `expiryDate` | `string` | `YYYY-MM-DD` |

**address:**

| Field | Type |
|-------|------|
| `street` | `string` |
| `city` | `string` |
| `postalCode` | `string` |

**Example:**

```json
{
  "embedding": [ 0.1, -0.2, ... ],
  "external_user_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "firstName": "John",
  "lastName": "Mkumbo",
  "dateOfBirth": "1990-01-15",
  "gender": "M",
  "identityInfo": {
    "idType": "NATIONAL_ID",
    "idNumber": "19900115-12345-67890",
    "issueDate": "2015-06-01",
    "expiryDate": "2030-06-01"
  },
  "address": {
    "street": "123 Uhuru Street",
    "city": "Dar es Salaam",
    "postalCode": "11101"
  },
  "mobileNo": "255712345678",
  "email": "john@example.com",
  "currencyCode": "TZS"
}
```

**Response:** `200 OK`

```json
{
  "user_id": "uuid",
  "accountNo": "Tembo account number",
  "message": "Face registered and Tembo wallet created"
}
```

**Errors:**

| Code | Detail |
|------|--------|
| 422 | Validation error (e.g. `embedding` not 128 floats) |
| 502 | Tembo create wallet failed (see `detail`) |
| 503 | Supabase or Tembo not configured |

---

## Verify and pay

### POST /api/verify-and-pay

Verify customer by face, then perform payment (Tembo wallet-to-wallet transfer). Requires merchant credentials and merchant's Tembo account number.

**Headers (optional if sent in body):**

| Header | Description |
|--------|-------------|
| `x-merchant-id` | Merchant UUID |
| `x-merchant-api-key` | Merchant API key |

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `embedding` | `float[]` | Yes | Exactly **128** face embedding values |
| `amount` | `number` | Yes | Amount (> 0) |
| `currency` | `string` | No | Default `TZS` |
| `reference` | `string` | No | Payment reference |
| `merchant_id` | `string` | Yes* | Merchant UUID (*or via header) |
| `merchant_api_key` | `string` | Yes* | Merchant API key (*or via header) |
| `merchant_tembo_account_no` | `string` | Yes | Tembo account number to receive payment |

**Example:**

```json
{
  "embedding": [ 0.1, -0.2, ... ],
  "amount": 5000,
  "currency": "TZS",
  "reference": "order-123",
  "merchant_id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
  "merchant_api_key": "demo-merchant-key-123",
  "merchant_tembo_account_no": "TMB-ACC-MERCHANT"
}
```

**Response:** `200 OK`

```json
{
  "message": "Payment successful",
  "transactionId": "Tembo transaction ID",
  "transactionRef": "Tembo transaction ref"
}
```

**Errors:**

| Code | Detail |
|------|--------|
| 401 | Missing or invalid merchant credentials |
| 400 | Customer has no Tembo wallet, or `merchant_tembo_account_no` missing |
| 404 | No matching face found |
| 502 | Tembo transfer failed |
| 503 | Supabase or Tembo not configured |

---

## Tembo wallet proxy

These endpoints forward to Tembo Plus. Tembo must be configured; Supabase is not required.

### POST /api/tembo/deposit

Deposit funds from main account to a wallet.

**Request body:**

| Field | Type | Required |
|-------|------|----------|
| `amount` | `number` | Yes (> 0) |
| `accountNo` | `string` | Yes |
| `transactionDate` | `string` | Yes (`YYYY-MM-DD`) |
| `narration` | `string` | Yes |
| `externalRefNo` | `string` | Yes |

**Response:** `200 OK` — Tembo response body (e.g. transaction details).

**Errors:** `502` — Tembo error (see `detail`).

---

### POST /api/tembo/balance

Get wallet balance.

**Request body:**

| Field | Type | Required |
|-------|------|----------|
| `accountNo` | `string` | Yes |

**Response:** `200 OK` — Tembo balance response.

**Errors:** `502` — Tembo error (see `detail`).

---

### POST /api/tembo/transfer

Wallet-to-wallet transfer.

**Request body:**

| Field | Type | Required |
|-------|------|----------|
| `amount` | `number` | Yes (> 0) |
| `fromAccountNo` | `string` | Yes |
| `toAccountNo` | `string` | Yes |
| `transactionDate` | `string` | Yes (`YYYY-MM-DD`) |
| `narration` | `string` | Yes |
| `externalRefNo` | `string` | Yes |

**Response:** `200 OK` — Tembo transfer response (e.g. `transactionId`, `transactionRef`).

**Errors:** `502` — Tembo error (see `detail`).

---

### GET /api/tembo/wallets

List all Tembo wallets (no body).

**Response:** `200 OK` — Tembo list response.

**Errors:** `502` — Tembo error (see `detail`); `503` — Tembo not configured.

---

## Summary

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/register-face` | Register face + create Tembo wallet (KYC) |
| POST | `/api/verify-and-pay` | Verify face and pay (merchant credentials + `merchant_tembo_account_no`) |
| POST | `/api/tembo/deposit` | Deposit to wallet |
| POST | `/api/tembo/balance` | Get wallet balance |
| POST | `/api/tembo/transfer` | Transfer between wallets |
| GET | `/api/tembo/wallets` | List Tembo wallets |

**Base URL:** `https://9a96-102-218-28-192.ngrok-free.app`

Example: health check → `GET https://9a96-102-218-28-192.ngrok-free.app/health`
