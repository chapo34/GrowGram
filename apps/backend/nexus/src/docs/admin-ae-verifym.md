## 🔐 Admin: Altersverifizierung (18+ Flag)

GrowGram nutzt ein manuelles Admin-Flag, um Nutzer als 18+ verifiziert zu markieren (KJM-konform, kein Self-Check).

### Endpoint

**URL**

- `POST /api/auth/age/mark-verified`

**Header**

- `Content-Type: application/json`
- `x-admin-task-token: <NEXUS_ADMIN_TASK_TOKEN>`

**Body (JSON)**

```json
{
  "userId": "64RY9WSAsDgBBaeIxZ1Rk1vrb3k2",
  "provider": "DEV_MANUAL",
  "method": "manual_flag",
  "reference": "backoffice-cli"
}