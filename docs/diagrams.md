# PropertyDSS — System Diagrams

All diagrams below are written in [Mermaid](https://mermaid.js.org/) and reflect the
system as actually implemented. They render automatically on GitHub, in VS Code (with a
Mermaid preview extension), or by pasting into <https://mermaid.live>.


## 1. System architecture (three-tier)

```mermaid
graph TB
  subgraph Client["Presentation Tier — Next.js (React)"]
    UI["Pages: Login, Dashboard, Properties,<br/>Requests, Funds, Recommendations, Reports"]
    APIClient["API client + Auth context<br/>(JWT stored in localStorage)"]
    UI --> APIClient
  end

  subgraph Server["Application Tier — Node.js + Express REST API"]
    MW["Middleware:<br/>CORS, JWT auth, role guard, validation"]
    RT["Routes"]
    CTRL["Controllers"]
    ACCESS["Access service<br/>(manager → assigned-property scoping)"]
    DSS["DSS Engine<br/>computePriorityScore / recommendAllocation"]
    ORM["Prisma ORM"]
    MW --> RT --> CTRL
    CTRL --> ACCESS
    CTRL --> DSS
    CTRL --> ORM
  end

  subgraph Data["Data Tier — PostgreSQL"]
    DB[("users, properties, property_assignments,<br/>maintenance_requests,<br/>maintenance_funds, fund_allocations,<br/>fund_adjustments")]
  end

  APIClient -- "HTTPS / JSON<br/>(Bearer token)" --> MW
  ORM -- "SQL" --> DB
```

---

## 2. Use case diagram

The Manager is scoped to their **assigned properties** and can log maintenance
requests there; the Admin is unrestricted, assigns managers to properties, and
is the only role that can allocate, adjust or reject.

```mermaid
graph LR
  Admin([Admin])
  Manager([Manager])

  subgraph System["PropertyDSS"]
    UC1(["Register / Login"])
    UC2(["View dashboard & reports"])
    UC3(["Manage properties"])
    UC3b(["Assign / unassign managers<br/>to a property"])
    UC4(["Log a maintenance request"])
    UC4b(["Edit / delete a request"])
    UC4c(["Reject a request<br/>(with reason)"])
    UC5(["Manage funds / budgets"])
    UC6(["View DSS recommendation"])
    UC7(["Allocate funds to a request"])
    UC7b(["Adjust a released allocation<br/>(with reason)"])
  end

  Admin --- UC1
  Admin --- UC2
  Admin --- UC3
  Admin --- UC3b
  Admin --- UC4
  Admin --- UC4b
  Admin --- UC4c
  Admin --- UC5
  Admin --- UC6
  Admin --- UC7
  Admin --- UC7b

  Manager --- UC1
  Manager --- UC2
  Manager --- UC4
  Manager --- UC6
```

---

## 3. Entity-Relationship diagram (database)

```mermaid
erDiagram
  USER ||--o{ PROPERTY : "creates"
  USER ||--o{ MAINTENANCE_REQUEST : "requests"
  USER ||--o{ MAINTENANCE_REQUEST : "reviews"
  USER ||--o{ FUND_ALLOCATION : "allocates"
  USER ||--o{ FUND_ADJUSTMENT : "adjusts"
  USER ||--o{ PROPERTY_ASSIGNMENT : "is assigned as manager"
  USER ||--o{ PROPERTY_ASSIGNMENT : "assigns (admin)"
  PROPERTY ||--o{ MAINTENANCE_REQUEST : "has"
  PROPERTY ||--o{ MAINTENANCE_FUND : "has"
  PROPERTY ||--o{ PROPERTY_ASSIGNMENT : "has"
  MAINTENANCE_FUND ||--o{ FUND_ALLOCATION : "funds"
  MAINTENANCE_REQUEST ||--o{ FUND_ALLOCATION : "is funded by"
  FUND_ALLOCATION ||--o{ FUND_ADJUSTMENT : "is adjusted by"

  USER {
    uuid id PK
    string email UK
    string passwordHash
    string fullName
    enum role "ADMIN or MANAGER"
    datetime createdAt
  }
  PROPERTY {
    uuid id PK
    string name
    string address
    enum propertyType
    int units
    int yearBuilt
    decimal totalAreaSqm
    enum status
    uuid createdById FK
  }
  PROPERTY_ASSIGNMENT {
    uuid id PK
    uuid propertyId FK
    uuid managerId FK "must be a MANAGER"
    uuid assignedById FK
    datetime createdAt
  }
  MAINTENANCE_REQUEST {
    uuid id PK
    uuid propertyId FK
    string title
    enum category
    enum severity "LOW..CRITICAL, manager-facing"
    boolean safetyHazard
    int urgency
    int impact
    int assetImportance
    decimal estimatedCost
    enum status
    decimal priorityScore
    uuid requestedById FK
    string rejectionReason
    uuid reviewedById FK
    datetime reviewedAt
  }
  MAINTENANCE_FUND {
    uuid id PK
    uuid propertyId FK
    decimal totalAmount
    decimal allocatedAmount
    string periodLabel
  }
  FUND_ALLOCATION {
    uuid id PK
    uuid fundId FK
    uuid requestId FK
    decimal amountAssigned
    decimal suggestedAmount "DSS suggestion at approval time"
    datetime allocationDate
    uuid allocatedById FK
  }
  FUND_ADJUSTMENT {
    uuid id PK
    uuid allocationId FK
    decimal previousAmount
    decimal newAmount
    string reason
    uuid adjustedById FK
    datetime createdAt
  }
```

---

## 4. Data flow diagram — context (level 0)

```mermaid
graph TD
  Admin([Admin])
  Manager([Manager])
  P(("PropertyDSS<br/>System"))

  Admin -- "property, request & fund data;<br/>manager assignments;<br/>allocation, adjustment & review decisions" --> P
  P -- "dashboards, rankings,<br/>recommendations, reports" --> Admin
  Manager -- "login; log requests for<br/>assigned properties" --> P
  P -- "scoped dashboards, request status<br/>& reports (assigned properties only)" --> Manager
```

---

## 5. Data flow diagram — level 1

```mermaid
flowchart LR
  Admin([Admin])
  Manager([Manager])

  subgraph Processes["Processes"]
    direction TB
    P1["1.0 Authenticate user"]
    P2["2.0 Manage properties"]
    P3["3.0 Log, score & review requests"]
    P4["4.0 Manage funds"]
    P5["5.0 Recommend, allocate &<br/>adjust funds (DSS)"]
    P6["6.0 Generate reports"]
    P7["7.0 Assign managers<br/>to properties"]
  end

  subgraph Stores["Data stores"]
    direction TB
    DS1[("D1 Users")]
    DS2[("D2 Properties")]
    DS3[("D3 Maintenance requests")]
    DS4[("D4 Maintenance funds")]
    DS5[("D5 Fund allocations")]
    DS6[("D6 Property assignments")]
    DS7[("D7 Fund adjustments")]
  end

  Admin --> P1
  Admin --> P2
  Admin --> P3
  Admin --> P4
  Admin --> P5
  Admin --> P6
  Admin --> P7
  Manager --> P1
  Manager --> P3
  Manager --> P6

  P1 --> DS1
  P2 --> DS2
  P3 --> DS3
  P4 --> DS4
  P5 --> DS5
  P5 --> DS3
  P5 --> DS7
  P7 --> DS6

  P2 -. reads .-> DS6
  P3 -. reads .-> DS2
  P3 -. reads .-> DS6
  P4 -. reads .-> DS2
  P5 -. reads .-> DS3
  P5 -. reads .-> DS4
  P6 -. reads .-> DS3
  P6 -. reads .-> DS4
  P6 -. reads .-> DS5
  P6 -. reads .-> DS7
```

---

## 6. DSS algorithm flowchart (priority scoring + budget allocation)

```mermaid
flowchart TD
  A([Start: select a fund]) --> B["available = totalAmount - allocatedAmount"]
  B --> C["Load PENDING/APPROVED requests for the property<br/>(exclude already-funded)"]
  C --> D["Score each request:<br/>urgency*0.35 + impact*0.30 + assetImportance*0.20<br/>- costScore*0.15 + categoryBoost"]
  D --> E["Rank requests by score, highest first"]
  E --> F{Any request left?}
  F -- "No" --> Z([Output recommendation + summary])
  F -- "Yes" --> G["Take next highest-ranked request"]
  G --> H{"cost &le; remaining budget?"}
  H -- "Yes" --> I["Mark FUND<br/>remaining = remaining - cost"]
  H -- "No" --> J["Mark DEFER"]
  I --> F
  J --> F
```

---

## 7. Activity — logging a maintenance request (server-side scoring)

Both roles can log a request: an Admin sets the scoring inputs directly, while
a Manager (restricted to their assigned properties) picks a plain-language
severity + safety-hazard flag that the server converts into the same inputs.

```mermaid
flowchart TD
  A([User opens 'New Request' /<br/>'Report an Issue']) --> B{"Role?"}
  B -- "Admin" --> C1["Fill form: any property, category,<br/>urgency, impact, asset importance, cost"]
  B -- "Manager" --> C2["Fill form: assigned property, category,<br/>severity, safety hazard flag, cost"]
  C1 --> D["Submit: POST /requests"]
  C2 --> D
  D --> E{"JWT valid?"}
  E -- "No" --> X(["401 error"])
  E -- "Yes" --> F{"Manager & property<br/>outside assigned scope?"}
  F -- "Yes" --> X2(["403 Forbidden"])
  F -- "No" --> G{"Validation passes?"}
  G -- "No" --> Y(["422 validation error"])
  G -- "Yes" --> H{"Scoring inputs given<br/>directly?"}
  H -- "No (severity path)" --> I["Derive urgency/impact/assetImportance<br/>from severity + safety hazard"]
  H -- "Yes (admin path)" --> J["Use the supplied<br/>urgency/impact/assetImportance"]
  I --> K["DSS engine computes priorityScore"]
  J --> K
  K --> L["Save request, status = PENDING (Prisma)"]
  L --> M(["Saved request returned; list refreshes, ranked"])
```

---

## 8. Sequence — authentication (JWT)

```mermaid
sequenceDiagram
  actor User
  participant FE as Next.js
  participant API as Express API
  participant DB as PostgreSQL

  User->>FE: Enter email + password
  FE->>API: POST /auth/login
  API->>DB: find user by email
  DB-->>API: user record
  API->>API: bcrypt.compare(password, hash)
  alt credentials valid
    API->>API: sign JWT (sub, role, email)
    API-->>FE: 200 { token, user }
    FE->>FE: store token in localStorage
    FE-->>User: redirect to dashboard
  else invalid
    API-->>FE: 401 Invalid email or password
    FE-->>User: show error message
  end
```

---

## 9. Sequence — DSS recommendation, fund allocation, rejection & adjustment

```mermaid
sequenceDiagram
  actor Admin
  participant FE as Next.js (Funds page)
  participant API as Express API
  participant DSS as DSS Engine
  participant DB as PostgreSQL

  Admin->>FE: Select a fund
  FE->>API: GET /funds/:id/recommendation (Bearer token)
  API->>API: authenticate + verify property is<br/>in caller's scope (access.js)
  API->>DB: fetch fund + outstanding requests
  DB-->>API: fund, requests
  API->>DSS: recommendAllocation(requests, available)
  DSS-->>API: ranked FUND/DEFER list + summary
  API-->>FE: 200 JSON
  FE-->>Admin: show recommendation

  alt Admin funds the request
    Admin->>FE: Click "Allocate" on a request
    FE->>API: POST /allocations (fundId, requestId, amount)
    API->>API: authenticate + requireRole(ADMIN)
    API->>DB: transaction — insert allocation,<br/>fund.allocatedAmount += amount,<br/>request.status = APPROVED
    DB-->>API: committed
    API-->>FE: 201 Created
    FE-->>Admin: toast "Fund allocated", balances update
  else Admin rejects the request
    Admin->>FE: Click "Reject" with a reason
    FE->>API: POST /requests/:id/reject { reason }
    API->>API: authenticate + requireRole(ADMIN)
    API->>DB: request.status = REJECTED,<br/>rejectionReason, reviewedById, reviewedAt
    DB-->>API: committed
    API-->>FE: 200 OK
    FE-->>Admin: request marked rejected
  end

  opt Real-world cost differs from the original allocation
    Admin->>FE: Adjust released amount + reason
    FE->>API: PATCH /allocations/:id/adjust { newAmount, reason }
    API->>API: authenticate + requireRole(ADMIN)
    API->>DB: transaction — update allocation.amountAssigned,<br/>fund.allocatedAmount += delta,<br/>insert fund_adjustment record
    DB-->>API: committed
    API-->>FE: 200 OK
    FE-->>Admin: balances update, adjustment logged
  end
```

---

## 10. Backend module structure

```mermaid
graph TD
  S["server.js"] --> APP["app.js"]
  APP --> MW["middleware<br/>auth.js, error.js"]
  APP --> R["routes/index.js"]

  R --> AR["auth.routes"] --> AC["auth.controller"]
  R --> PR["properties.routes"] --> PC["properties.controller"]
  R --> RR["requests.routes"] --> RC["requests.controller"]
  R --> FR["funds.routes"] --> FC["funds.controller"]
  R --> ALR["allocations.routes"] --> ALC["allocations.controller"]
  R --> SR["stats.routes"] --> SC["stats.controller"]
  R --> UR["users.routes"] --> UC["users.controller"]

  PC --> ACCESS["services/access.js<br/>(manager → assigned-property scoping)"]
  RC --> ACCESS
  FC --> ACCESS
  ALC --> ACCESS
  SC --> ACCESS

  RC --> DSS["services/dss.js"]
  ALC --> DSS
  SC --> DSS

  AC --> PRISMA["lib/prisma.js"]
  PC --> PRISMA
  RC --> PRISMA
  FC --> PRISMA
  ALC --> PRISMA
  SC --> PRISMA
  UC --> PRISMA
  ACCESS --> PRISMA
  PRISMA --> DB[("PostgreSQL")]
```
