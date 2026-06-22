# CometChat Tags & Webhooks — Use Cases for Medicare

This document outlines how CometChat's **Tagging** and **Webhooks** features can be used in the Medicare project. Review and decide which use cases to implement.

---

## PART 1: TAGGING

### What CometChat Tags Are

Tags are string arrays attached to CometChat entities (Users, Groups, Messages, Conversations). They are:

- Set via REST API at creation time or via update (`POST /v3/users` body includes `"tags": [...]`)
- Queryable from the SDK using request builders (`.setTags([...])`, `.withTags(true)`)
- Free-form strings — you define the taxonomy
- Used for filtering, routing, and access control

**Entities that support tags:**
- **Users** — `tags: string[]` on the user object
- **Groups** — `tags: string[]` on the group object  
- **Messages** — `tags: string[]` on individual messages
- **Conversations** — `tags: string[]` on conversation objects

**SDK filtering methods (from skills):**
```js
// Filter users by tag
new CometChat.UsersRequestBuilder().setTags(["role:doctor"]).setLimit(30).build()

// Filter conversations by user tags
new CometChat.ConversationsRequestBuilder().setUserTags(["role:doctor"]).withTags(true).build()

// Filter groups by tag
new CometChat.GroupsRequestBuilder().setTags(["dept:cardiology"]).build()

// Filter messages by tag
new CometChat.MessagesRequestBuilder().setTags(["priority:high"]).build()
```

---

### Medicare Use Cases for Tags

#### USE CASE T1: Role-Based Contact Filtering

**Problem:** Patients should only see doctors in their contacts. Doctors should see their patients and peer doctors. Staff should see nothing.

**Implementation:**
```
Patient user tags:  ["role:patient", "verified"]
Doctor user tags:   ["role:doctor", "verified"]
Staff user tags:    ["role:staff", "verified"]
Admin user tags:    ["role:admin", "verified"]
```

**How it works:**
- When a patient opens `/chat`, the SDK fetches contacts using `UsersRequestBuilder().setTags(["role:doctor"])`
- When a doctor opens `/chat`, the SDK fetches using `UsersRequestBuilder().setTags(["role:patient"])` for the patient tab and `setTags(["role:doctor"])` for the peers tab
- The `verified` tag distinguishes live app users from any test accounts in the CometChat dashboard

**Benefit:** Contact lists are automatically filtered at the SDK level without custom backend logic for each query.

---

#### USE CASE T2: Department-Based Doctor Discovery

**Problem:** Patients searching for a specific specialist, or agent routing support queries to the right department.

**Implementation:**
```
Cardiologist tags:   ["role:doctor", "dept:cardiology", "verified"]
Neurologist tags:    ["role:doctor", "dept:neurology", "verified"]
Dermatologist tags:  ["role:doctor", "dept:dermatology", "verified"]
```

**How it works:**
- Patient searches for cardiologists: `UsersRequestBuilder().setTags(["dept:cardiology"])`
- Agent needs to escalate a cardiac question to a specialist: filter by `dept:cardiology` + `status:online`
- Admin portal can view doctor distribution by department tag counts

**Benefit:** Eliminates need for a separate "department lookup" API. CometChat becomes the source of truth for doctor specialization in the chat context.

---

#### USE CASE T3: Agent Availability & Routing

**Problem:** When a patient clicks "Chat with an Agent," the system needs to find available support agents quickly.

**Implementation:**
```
Agent user tags:  ["role:staff", "role:agent", "verified"]
```

**How it works:**
- Patient opens support: `UsersRequestBuilder().setTags(["role:agent"]).setStatus("online")`
- Returns only online agents → route to first available
- If empty result → show "No agents available" fallback
- Agents with specific skills: `["role:agent", "skill:billing"]`, `["role:agent", "skill:technical"]`

**Benefit:** Agent routing is a single SDK query instead of a custom backend endpoint + polling loop.

---

#### USE CASE T4: Group Organization by Purpose

**Problem:** Doctors create groups for different purposes (care teams, department channels). Need to distinguish them.

**Implementation:**
```
Care team group tags:     ["type:care-team", "dept:cardiology"]
Department channel tags:  ["type:department", "dept:neurology"]
Patient support group:    ["type:support", "patient:{userId}"]
```

**How it works:**
- Doctor views their care teams: `GroupsRequestBuilder().setTags(["type:care-team"])`
- Department-wide announcements: `GroupsRequestBuilder().setTags(["type:department", "dept:cardiology"])`
- Admin sees all groups by type for reporting

**Benefit:** Groups are self-describing. No separate "group_type" table needed in your database.

---

#### USE CASE T5: Message Priority / Classification

**Problem:** Some messages need higher visibility (urgent medical queries, flagged content).

**Implementation:**
```
Urgent message tags:  ["priority:urgent"]
Follow-up tags:       ["priority:follow-up"]  
Flagged content:      ["moderation:flagged"]
```

**How it works:**
- Doctor marks a message as urgent → tag applied → renders with red indicator
- Admin reviews flagged messages: `MessagesRequestBuilder().setTags(["moderation:flagged"])`
- Analytics: count messages by priority tag over time

**Benefit:** Message classification without adding custom metadata parsing logic everywhere.

---

#### USE CASE T6: Conversation-Level Tags (Pin / Archive / Priority)

**Problem:** Users want to pin important conversations or mark them for follow-up.

**Implementation:**
```
Conversation tags:  ["pinned"], ["archived"], ["needs-follow-up"]
```

**How it works:**
- Patient pins a conversation with their doctor: conversation gets `["pinned"]` tag
- `ConversationsRequestBuilder().withTags(true)` fetches conversations with their tags
- UI sorts pinned conversations to the top
- Doctor marks a patient conversation as needing follow-up

**Benefit:** No custom database table for conversation state. Uses CometChat's native tag system.

---

### Tags Decision Summary

| Use Case | Priority for Medicare | Effort | SOW Requirement? |
|---|---|---|---|
| T1: Role-based contact filtering | **High** | Low | Yes (§4, §6) |
| T2: Department-based doctor discovery | **High** | Low | Yes (§4.2) |
| T3: Agent availability routing | **High** | Low | Yes (§8) |
| T4: Group organization | Medium | Low | Partially (§5.2) |
| T5: Message priority | Low | Low | No |
| T6: Conversation-level tags | Low | Low | No |

---

---

## PART 2: WEBHOOKS

### What CometChat Webhooks Are

Webhooks are HTTP POST requests CometChat sends to your server when events occur. They enable server-side reactions to chat activity without polling.

**Setup:** Configure in CometChat Dashboard → Webhooks → Add endpoint URL + select triggers + get signing secret.

**Security:** Every webhook includes an `x-cometchat-signature` header (HMAC-SHA256 of the body using your webhook secret). Always validate before processing.

**Available event categories** (from CometChat docs/snippets):

| Category | Events |
|---|---|
| **Messages** | `message_sent`, `message_edited`, `message_deleted`, `message_read` |
| **Calls (Ringing)** | `call_initiated`, `call_accepted`, `call_rejected`, `call_cancelled`, `call_unanswered`, `call_busy`, `call_ended` |
| **Users** | `user_online`, `user_offline`, `user_created`, `user_updated`, `user_blocked` |
| **Groups** | `group_created`, `group_member_added`, `group_member_removed`, `group_member_joined`, `group_member_left` |
| **Moderation** | `message_flagged`, `message_blocked` (keyword filter hit) |

**Payload structure** (typical):
```json
{
  "trigger": "message_sent",
  "data": {
    "sender": { "uid": "medicare_user_42", "name": "Dr. Smith", "role": "doctor" },
    "receiver": { "uid": "medicare_user_15", "name": "John Patient" },
    "receiverType": "user",
    "type": "text",
    "text": "Your test results are ready.",
    "sentAt": 1718700000,
    "id": "msg_abc123"
  },
  "appId": "your_app_id"
}
```

**Signature verification** (from skills):
```js
const crypto = require("crypto");
const signature = req.header("x-cometchat-signature");
const expected = crypto
  .createHmac("sha256", process.env.COMETCHAT_WEBHOOK_SECRET)
  .update(JSON.stringify(req.body))
  .digest("hex");
if (signature !== expected) return res.status(401).send();
```

**Idempotency:** Webhooks can retry on failure. Use event IDs to deduplicate.

---

### Medicare Use Cases for Webhooks

#### USE CASE W1: Admin Audit Trail (Activity Logging)

**Problem:** Admins need visibility into platform communication activity for compliance and oversight in a healthcare context.

**Events:** `message_sent`, `call_initiated`, `call_ended`

**Implementation:**
```
POST /api/webhooks/cometchat
→ Validate HMAC signature
→ Write to WEBHOOK_LOG table: { id, source, eventType, payload, status, receivedAt }
→ Return 200 OK
```

**What it gives you:**
- Total messages sent per day/week/month (admin dashboard metric)
- Call log with duration, participants, timestamps
- Audit trail for regulatory compliance (healthcare communication records)
- Admin portal at `/admin/webhooks` shows paginated, filterable event history

**SOW alignment:** Directly required — §10 (Webhooks), §13.1 (Webhook Log Panel)

---

#### USE CASE W2: Call Analytics & Missed Call Notifications

**Problem:** Track doctor-patient call activity. Notify patients about missed calls.

**Events:** `call_initiated`, `call_accepted`, `call_rejected`, `call_unanswered`, `call_ended`

**Implementation:**
```
call_initiated  → Log call start; record participants
call_unanswered → Trigger push notification: "You missed a call from Dr. {name}"
                → Write to NOTIFICATION_LOG with type: "cometchat"
call_ended      → Calculate duration (endTime - startTime); update admin summary
call_rejected   → Log rejection; no notification needed
```

**What it gives you:**
- Missed call push notifications to patients (SOW §7.2)
- Call duration tracking for admin reporting
- Doctor engagement metrics (calls made per day, avg duration)
- Evidence of consultation attempts for medical records

**SOW alignment:** Required — §7.2 (missed call notifications), §10.2 (call_started/call_ended events)

---

#### USE CASE W3: Moderation Event Handling

**Problem:** Blocked messages and flagged content need to surface in the admin portal for review.

**Events:** `message_blocked`, `message_flagged`

**Implementation:**
```
message_blocked → Log to WEBHOOK_LOG with eventType: "message_blocked"
               → Increment moderation counter in admin summary
               → Sender already sees "Message not delivered" (CometChat handles client-side)

message_flagged → Log to WEBHOOK_LOG with eventType: "message_flagged"
               → Add to admin moderation review queue
               → Optional: Send real-time notification to admin portal (WebSocket/SSE)
```

**What it gives you:**
- Admin moderation queue (review flagged messages, take action)
- Compliance evidence (profanity/abuse attempted but blocked)
- Ability to deactivate repeat offenders from admin portal
- Dashboard metric: "X messages blocked this week"

**SOW alignment:** Required — §9 (Moderation), §10.2 (message_flagged event)

---

#### USE CASE W4: Real-Time Admin Dashboard Updates

**Problem:** Admin portal system summary needs live counts of communication activity without polling CometChat APIs.

**Events:** `message_sent`, `call_initiated`, `call_ended`, `message_flagged`, `user_online`

**Implementation:**
```
Every event → Update in-memory counters (or Redis cache):
  - total_messages_today++
  - total_calls_today++
  - active_calls_now (increment on call_initiated, decrement on call_ended)
  - flagged_messages_pending++
  - online_users_now (track with user_online/user_offline)

Admin portal polls GET /api/admin/summary every 30s, or receives SSE updates
```

**What it gives you:**
- Live "Communication Activity" panel in admin portal
- Real-time active call count
- "X users online now" indicator
- No need to call CometChat APIs from the admin portal — your backend has the latest state

**SOW alignment:** §13.3 (System Summary — webhook event counts, push notification counts)

---

#### USE CASE W5: Notification Unification (CometChat → NOTIFICATION_LOG)

**Problem:** Admin notification log needs to show both app events and CometChat events in one unified table.

**Events:** `message_sent` (when app not in focus → push delivered), `call_initiated` (push sent to recipient)

**Implementation:**
```
When CometChat delivers a push notification:
→ Webhook fires with delivery context
→ Write to NOTIFICATION_LOG: { type: "cometchat", userId, title, body, sentAt }

Admin portal at /admin/notifications now shows:
  [app]        "Appointment confirmed for June 19"         2min ago
  [cometchat]  "New message from Dr. Smith"                 5min ago
  [cometchat]  "Missed call from Dr. Johnson"              12min ago
  [app]        "Lab results available"                     1hr ago
```

**What it gives you:**
- Unified audit trail — admin sees ALL notifications in one place
- Filter by type: "show me only CometChat notifications" or "show me only app notifications"
- Evidence that patients were notified about calls/messages

**SOW alignment:** Required — §7.3 (Notification Separation Architecture), §11.1 (NOTIFICATION_LOG type extension)

---

#### USE CASE W6: User Blocking Event → Account Review

**Problem:** When one user blocks another, the admin should be notified for potential review (harassment pattern detection).

**Events:** `user_blocked`

**Implementation:**
```
user_blocked → Log to WEBHOOK_LOG
            → Check if the blocked user has been blocked by multiple people
            → If threshold reached (e.g., blocked by 3+ users): flag for admin review
            → Optional: auto-restrict the user's messaging permissions
```

**What it gives you:**
- Early warning system for problematic users
- Pattern detection (one user consistently getting blocked = potential harassment)
- Admin can proactively intervene before a complaint is filed
- Healthcare-specific: protect patient safety

**SOW alignment:** §10.2 mentions `user_blocked` event handling

---

#### USE CASE W7: Agent Performance Metrics

**Problem:** Track support agent response times and conversation volume for staffing decisions.

**Events:** `message_sent` (filter by agent user tags)

**Implementation:**
```
message_sent where sender has tag "role:agent":
  → Record first-response time (time from patient's first message to agent's first reply)
  → Count total agent messages per shift
  → Track conversations handled per agent per day

message_sent where sender has tag "role:patient" AND receiver has tag "role:agent":
  → Detect new support request (patient's first message to an agent)
  → Start response-time timer
```

**What it gives you:**
- Average agent response time (display in admin portal)
- Conversations-per-agent metric for workload balancing
- Peak hours analysis (when do most support requests come in?)
- Agent performance comparison

**SOW alignment:** Partially — §8.5 mentions admin visibility into agent conversations. This extends it with metrics.

---

#### USE CASE W8: Doctor Availability Monitoring

**Problem:** Track when doctors go online/offline to understand engagement patterns and ensure patient access.

**Events:** `user_online`, `user_offline`

**Implementation:**
```
user_online where user has tag "role:doctor":
  → Log session start timestamp
  → Update admin "doctors online now" counter

user_offline where user has tag "role:doctor":
  → Calculate session duration
  → Log to analytics (total online hours per doctor per day)
  → If no doctors online and patients are waiting: alert admin
```

**What it gives you:**
- "Doctors online now: 3/12" indicator in admin portal
- Weekly engagement reports per doctor
- Alert system: "No doctors available — patient messages may go unread"
- Staffing insights: which time slots lack doctor coverage?

**SOW alignment:** Not explicitly required, but supports §5.1 (presence indicators) at the admin level.

---

### Webhooks Decision Summary

| Use Case | Priority for Medicare | Effort | SOW Requirement? |
|---|---|---|---|
| W1: Admin audit trail | **Must Have** | Medium | Yes (§10, §13.1) |
| W2: Call analytics + missed call push | **Must Have** | Medium | Yes (§7.2, §10.2) |
| W3: Moderation event handling | **Must Have** | Medium | Yes (§9, §10.2) |
| W4: Real-time admin dashboard | **Should Have** | Medium | Yes (§13.3) |
| W5: Notification unification | **Must Have** | Low | Yes (§7.3, §11.1) |
| W6: User blocking → account review | Nice to Have | Low | Partially (§10.2) |
| W7: Agent performance metrics | Nice to Have | Medium | Partially (§8.5) |
| W8: Doctor availability monitoring | Nice to Have | Low | No |

---

## Implementation Architecture

### Single Webhook Endpoint (Recommended)

One endpoint handles all events with internal routing:

```
POST /api/webhooks/cometchat
├── Validate HMAC signature
├── Parse event type from payload
├── Route to handler:
│   ├── message_sent     → W1 (log) + W5 (notification) + W7 (agent metrics)
│   ├── message_flagged  → W1 (log) + W3 (moderation queue)
│   ├── message_blocked  → W1 (log) + W3 (moderation)
│   ├── call_initiated   → W1 (log) + W2 (call tracking) + W4 (dashboard)
│   ├── call_ended       → W1 (log) + W2 (duration calc) + W4 (dashboard)
│   ├── call_unanswered  → W1 (log) + W2 (missed call push) + W5 (notification)
│   ├── user_blocked     → W1 (log) + W6 (account review)
│   ├── user_online      → W4 (dashboard) + W8 (doctor monitoring)
│   └── user_offline     → W4 (dashboard) + W8 (doctor monitoring)
├── Write to WEBHOOK_LOG (all events)
└── Return 200 OK
```

### Tags Applied at User Sync

```
POST /api/cometchat/sync
├── Determine user role from app database
├── Call CometChat REST API: POST /v3/users (or PUT /v3/users/{uid})
│   body: {
│     uid: "medicare_user_{id}",
│     name: user.fullName,
│     role: "patient" | "doctor" | "staff" | "admin",
│     tags: ["role:patient", "verified"] 
│           OR ["role:doctor", "dept:cardiology", "verified"]
│           OR ["role:staff", "role:agent", "verified"]
│   }
├── Generate auth token: POST /v3/users/{uid}/auth_tokens
└── Return auth token to client
```

---

## Your Decision

Please review and let me know:

1. **Tags:** Which use cases (T1–T6) do you want to implement? T1, T2, T3 are required by the SOW.
2. **Webhooks:** Which use cases (W1–W8) do you want to implement? W1, W2, W3, W5 are required by the SOW.
3. **Any additional use cases** specific to your vision for the platform?
4. **Should W7 (agent metrics) and W8 (doctor monitoring)** be included in Step 2, or deferred to a future iteration?

---

*Sources: CometChat skills files (.claude/skills/cometchat-*/SKILL.md), CometChat REST API documentation (cometchat.com/docs), SCOPE_OF_WORK_STEP2.*

*Last updated: 2026-06-18*
