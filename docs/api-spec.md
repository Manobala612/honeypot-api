# Honeypot API Specification (Phase 3)

## Endpoint
POST /honeypot

## Headers
Content-Type: application/json

## Request Body
```json
{
  "message": "Your account is blocked. Click here."
}
## Authentication
All requests to `/honeypot` must include the following header:

