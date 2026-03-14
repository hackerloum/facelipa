# FaceLipa Android App — Build Prompt

Use this document as a prompt to generate a **native Android app in Java** that replicates the FaceLipa biometric mobile-money platform. The app must integrate with the existing Supabase Edge Functions API.

---

## Platform Overview

**FaceLipa** is a biometric mobile-money payment MVP. Customers register, enroll their face, link a mobile wallet (M-Pesa, Airtel, etc.), and pay at merchant terminals by face scan. Merchants capture the customer's face → identify them → initiate an STK/USSD push → customer enters PIN on phone → transaction completes.

---

## Tech Requirements

| Component | Requirement |
|-----------|-------------|
| Language | **Java** (not Kotlin) |
| Min SDK | 24 |
| Target SDK | 34 |
| Face Recognition | TensorFlow Lite with **128-dimensional** face embeddings (FaceNet-compatible) |
| HTTP Client | OkHttp or Retrofit |
| JSON | Gson or Moshi |
| Image Handling | CameraX for capture, Bitmap for processing |

---

## API Base URL

```
https://<YOUR_SUPABASE_PROJECT>.supabase.co/functions/v1
```

Replace `<YOUR_SUPABASE_PROJECT>` with the actual Supabase project reference.

---

## API Endpoints Reference

### 1. Account Summary (Customer)

**GET** `/account-summary`

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |
| `x-user-id` | Yes | Customer UUID (from registration) |

**Response 200:**
```json
{
  "balance": 15000.00,
  "wallets": [
    {
      "id": "uuid",
      "provider": "mpesa",
      "provider_wallet_id": "255712345678",
      "currency": "TZS"
    }
  ],
  "transactions": [
    {
      "id": "uuid",
      "amount": 5000,
      "currency": "TZS",
      "status": "AUTHORIZED",
      "created_at": "2025-03-14T12:00:00Z"
    }
  ]
}
```

---

### 2. Deposit (Customer)

**POST** `/deposit`

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |
| `x-user-id` | Yes | Customer UUID |

**Body:**
```json
{
  "amount": 10000
}
```

**Response 200:**
```json
{
  "balance": 25000.00
}
```

**Errors:** `400` — invalid amount; `401` — missing x-user-id

---

### 3. Enroll Face (Customer)

**POST** `/enroll-face`

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |
| `x-user-id` | Yes | Customer UUID |

**Body:**
```json
{
  "embedding": [0.123, -0.456, ...]
}
```

- `embedding`: **Array of exactly 128 floats** — face descriptor from FaceNet/TFLite model.

**Response 200:**
```json
{
  "id": "face_embedding_uuid"
}
```

**Errors:** `400` — embedding must be 128-element array; `401` — missing x-user-id

---

### 4. Pay by Face (Customer)

**POST** `/facepay`

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |
| `x-user-id` | Yes | Customer UUID |

**Body:**
```json
{
  "embedding": [0.123, -0.456, ...],
  "amount": 5000,
  "currency": "TZS"
}
```

**Response 200:**
```json
{
  "id": "transaction_uuid",
  "status": "PENDING",
  "charge_id": "provider_charge_id",
  "payment_provider": "snippe",
  "message": "Enter PIN on your phone to complete payment"
}
```

**Errors:** `400` — face not enrolled, insufficient balance, no wallet linked; `403` — face match failed; `404` — user not found

---

### 5. Charge by Face (Merchant)

**POST** `/charge-by-face`

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |
| `x-merchant-id` | Yes | Merchant UUID |
| `x-merchant-api-key` | Yes | Merchant API key |

**Body:**
```json
{
  "embedding": [0.123, -0.456, ...],
  "amount": 5000,
  "currency": "TZS",
  "reference": "Order #123"
}
```

- `reference` is optional.

**Response 200:**
```json
{
  "id": "transaction_uuid",
  "status": "PENDING",
  "charge_id": "provider_charge_id",
  "payment_provider": "snippe",
  "message": "Customer is entering PIN on their phone"
}
```

**Errors:** `401` — invalid merchant credentials; `404` — no matching face found; `400` — insufficient balance, no wallet linked

---

### 6. Wallet Linking & Profile Creation (Direct Supabase)

Wallets and user profiles are created via **Supabase REST API** (Postgres), not Edge Functions.

**Supabase URL:** `https://<PROJECT>.supabase.co/rest/v1`

**Headers for Supabase:**
| Header | Value |
|--------|-------|
| `apikey` | Supabase anon key |
| `Authorization` | `Bearer <anon_key>` |
| `Content-Type` | `application/json` |
| `Prefer` | `return=representation` |

**Create/Get User Profile:**
- `GET /user_profiles?external_user_id=eq.<UUID>` — check if exists
- `POST /user_profiles` — create: `{ "external_user_id": "<UUID>", "phone_number": "pending" }`

**Link Wallet:**
- `POST /wallets` — body: `{ "user_id": "<profile_id>", "provider": "mpesa", "provider_wallet_id": "255712345678", "currency": "TZS" }`

**Wallet providers:** `mpesa`, `airtel`, `halopesa`, `mixx`

---

## Face Embedding Requirements

- **Dimension:** 128 floats
- **Format:** JSON array of numbers, e.g. `[0.123, -0.456, 0.789, ...]`
- **Model:** Must be compatible with FaceNet 128-d embeddings. The backend uses cosine similarity with threshold 0.6.

**Android implementation options:**
1. **TensorFlow Lite FaceNet** — Use a pre-trained `.tflite` model that outputs 128-d embeddings (e.g. from [face-api.js models](https://github.com/justadudewhohacks/face-api.js-models) or equivalent FaceNet models).
2. **face-api.js models:** The web app uses `faceRecognitionNet` (FaceNet). Ensure the Android TFLite model produces embeddings in the same vector space for interoperability.

---

## App Flows

### Customer App Flow

1. **Launch** → Check SharedPreferences for stored `user_id`
2. **Register** → Generate `UUID.randomUUID()`, store locally, show "Save this User ID"
3. **Account Tab** → GET `/account-summary` → show balance, deposit form (POST `/deposit`)
4. **Enroll Tab** → Camera/gallery → extract 128-d embedding → POST `/enroll-face`
5. **Wallets Tab** → List wallets from account-summary; form to link new wallet (Supabase POST `/wallets`)
6. **Pay Tab** → Camera/selfie → extract embedding → enter amount → POST `/facepay` → show "Enter PIN on phone"
7. **Statement Tab** → Use transactions from `/account-summary`

### Merchant App Flow

1. **Login** → Store `merchant_id` and `api_key` in memory/session
2. **Charge** → Camera to capture customer face → extract embedding → enter amount + optional reference → POST `/charge-by-face` → show result

---

## Suggested Project Structure

```
app/
├── src/main/
│   ├── java/com/facelipa/
│   │   ├── FaceLipaApp.java
│   │   ├── api/
│   │   │   ├── ApiClient.java
│   │   │   ├── ApiEndpoints.java
│   │   │   └── SupabaseClient.java
│   │   ├── face/
│   │   │   ├── FaceEmbeddingExtractor.java
│   │   │   └── TFLiteFaceNet.java
│   │   ├── models/
│   │   │   ├── UserProfile.java
│   │   │   ├── Wallet.java
│   │   │   └── Transaction.java
│   │   ├── ui/
│   │   │   ├── customer/
│   │   │   │   ├── CustomerActivity.java
│   │   │   │   ├── AccountFragment.java
│   │   │   │   ├── EnrollFragment.java
│   │   │   │   ├── WalletsFragment.java
│   │   │   │   ├── PayFragment.java
│   │   │   │   └── StatementFragment.java
│   │   │   └── merchant/
│   │   │       └── MerchantActivity.java
│   │   └── util/
│   │       ├── Prefs.java
│   │       └── ImageUtils.java
│   ├── res/
│   │   ├── layout/
│   │   ├── values/
│   │   └── drawable/
│   └── assets/
│       └── facenet_128.tflite
```

---

## Configuration

Store in `BuildConfig` or `local.properties`:

- `SUPABASE_URL` — e.g. `https://xxxx.supabase.co`
- `SUPABASE_ANON_KEY` — from Supabase project settings

---

## Security Notes

- Do **not** hardcode API keys. Use `BuildConfig` or environment variables.
- User ID and merchant credentials should be stored in `EncryptedSharedPreferences` for production.
- All Edge Function calls use `--no-verify-jwt` in MVP; production should use Supabase Auth.

---

## Dependencies (build.gradle)

```gradle
dependencies {
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
    implementation 'com.google.code.gson:gson:2.10.1'
    implementation 'org.tensorflow:tensorflow-lite:2.14.0'
    implementation 'org.tensorflow:tensorflow-lite-support:0.4.4'
    implementation 'androidx.camera:camera-camera2:1.3.1'
    implementation 'androidx.camera:camera-lifecycle:1.3.1'
    implementation 'androidx.camera:camera-view:1.3.1'
}
```

---

## Summary Checklist for AI/Code Generator

- [ ] Java (not Kotlin)
- [ ] 128-d face embeddings via TFLite
- [ ] All 6 API endpoints implemented
- [ ] Customer flow: register, deposit, enroll, wallets, pay, statement
- [ ] Merchant flow: login, charge by face
- [ ] Supabase REST for wallets and profile creation
- [ ] Camera capture for face photos
- [ ] Proper error handling and user feedback
