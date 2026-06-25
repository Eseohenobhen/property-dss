# PropertyDSS — System Diagrams

All diagrams below are written in [Mermaid](https://mermaid.js.org/) and reflect the
system as actually implemented. They render automatically on GitHub, in VS Code (with a
Mermaid preview extension), or by pasting into <https://mermaid.live>.


## 1. System architecture (three-tier)

```mermaid
graph TB
  subgraph Client["Presentation Tier — Next.js (React)"]
    UI["Pages: Login, Dashboard, Properties,<br/>Requests, Funds, Reports"]
    APIClient["API client + Auth context<br/>(JWT stored in localStorage)"]
    UI --> APIClient
  end

  subgraph Server["Application Tier — Node.js + Express REST API"]
    MW["Middleware:<br/>CORS, JWT auth, role guard, validation"]
    RT["Routes"]
    CTRL["Controllers"]
    DSS["DSS Engine<br/>computePriorityScore / recommendAllocation"]
    ORM["Prisma ORM"]
    MW --> RT --> CTRL
    CTRL --> DSS
    CTRL --> ORM
  end

  subgraph Data["Data Tier — PostgreSQL"]
    DB[("users, properties,<br/>maintenance_requests,<br/>maintenance_funds,<br/>fund_allocations")]
  end

  APIClient -- "HTTPS / JSON<br/>(Bearer token)" --> MW
  ORM -- "SQL" --> DB
```

---

## 2. Use case diagram

The Manager is view-only; the Admin can manage data and allocate funds.

```mermaid
graph LR
  Admin([Admin])
  Manager([Manager])

  subgraph System["PropertyDSS"]
    UC1(["Register / Login"])
    UC2(["View dashboard & reports"])
    UC3(["Manage properties"])
    UC4(["Manage maintenance requests"])
    UC5(["Manage funds / budgets"])
    UC6(["View DSS recommendation"])
    UC7(["Allocate funds to requests"])
  end

  Admin --- UC1
  Admin --- UC2
  Admin --- UC3
  Admin --- UC4
  Admin --- UC5
  Admin --- UC6
  Admin --- UC7

  Manager --- UC1
  Manager --- UC2
  Manager --- UC6
```

---

## 3. Entity-Relationship diagram (database)

```mermaid
erDiagram
  USER ||--o{ PROPERTY : "creates"
  USER ||--o{ MAINTENANCE_REQUEST : "requests"
  USER ||--o{ FUND_ALLOCATION : "allocates"
  PROPERTY ||--o{ MAINTENANCE_REQUEST : "has"
  PROPERTY ||--o{ MAINTENANCE_FUND : "has"
  MAINTENANCE_FUND ||--o{ FUND_ALLOCATION : "funds"
  MAINTENANCE_REQUEST ||--o{ FUND_ALLOCATION : "is funded by"

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
  MAINTENANCE_REQUEST {
    uuid id PK
    uuid propertyId FK
    string title
    enum category
    int urgency
    int impact
    int assetImportance
    decimal estimatedCost
    enum status
    decimal priorityScore
    uuid requestedById FK
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
    datetime allocationDate
    uuid allocatedById FK
  }
```

---

## 4. Data flow diagram — context (level 0)

```mermaid
graph TD
  Admin([Admin])
  Manager([Manager])
  P(("PropertyDSS<br/>System"))

  Admin -- "property, request & fund data;<br/>allocation decisions" --> P
  P -- "dashboards, rankings,<br/>recommendations, reports" --> Admin
  Manager -- "login; view requests" --> P
  P -- "read-only dashboards & reports" --> Manager
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
    P3["3.0 Manage & score requests"]
    P4["4.0 Manage funds"]
    P5["5.0 Recommend & allocate funds (DSS)"]
    P6["6.0 Generate reports"]
  end

  subgraph Stores["Data stores"]
    direction TB
    DS1[("D1 Users")]
    DS2[("D2 Properties")]
    DS3[("D3 Maintenance requests")]
    DS4[("D4 Maintenance funds")]
    DS5[("D5 Fund allocations")]
  end

  Admin --> P1
  Admin --> P2
  Admin --> P3
  Admin --> P4
  Admin --> P5
  Admin --> P6
  Manager --> P1
  Manager --> P6

  P1 --> DS1
  P2 --> DS2
  P3 --> DS3
  P4 --> DS4
  P5 --> DS5
  P5 --> DS3

  P3 -. reads .-> DS2
  P4 -. reads .-> DS2
  P5 -. reads .-> DS3
  P5 -. reads .-> DS4
  P6 -. reads .-> DS3
  P6 -. reads .-> DS4
  P6 -. reads .-> DS5
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

```mermaid
flowchart TD
  A([Admin opens 'New Request']) --> B["Fill form: property, category,<br/>urgency, impact, asset importance, cost"]
  B --> C["UI shows live score preview"]
  C --> D["Submit: POST /requests"]
  D --> E{"JWT valid & role = ADMIN?"}
  E -- "No" --> X(["401 / 403 error"])
  E -- "Yes" --> F{"Validation passes?"}
  F -- "No" --> Y(["422 validation error"])
  F -- "Yes" --> G["DSS engine computes priorityScore"]
  G --> H["Save request with score (Prisma)"]
  H --> I(["Saved request returned; list refreshes, ranked"])
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

## 9. Sequence — DSS recommendation and fund allocation

```mermaid
sequenceDiagram
  actor Admin
  participant FE as Next.js (Funds page)
  participant API as Express API
  participant DSS as DSS Engine
  participant DB as PostgreSQL

  Admin->>FE: Select a fund
  FE->>API: GET /funds/:id/recommendation (Bearer token)
  API->>API: authenticate (verify JWT)
  API->>DB: fetch fund + outstanding requests
  DB-->>API: fund, requests
  API->>DSS: recommendAllocation(requests, available)
  DSS-->>API: ranked FUND/DEFER list + summary
  API-->>FE: 200 JSON
  FE-->>Admin: show recommendation

  Admin->>FE: Click "Allocate" on a request
  FE->>API: POST /allocations (fundId, requestId, amount)
  API->>API: authenticate + requireRole(ADMIN)
  API->>DB: transaction — insert allocation,<br/>fund.allocatedAmount += amount,<br/>request.status = APPROVED
  DB-->>API: committed
  API-->>FE: 201 Created
  FE-->>Admin: toast "Fund allocated", balances update
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

  RC --> DSS["services/dss.js"]
  ALC --> DSS
  SC --> DSS

  AC --> PRISMA["lib/prisma.js"]
  PC --> PRISMA
  RC --> PRISMA
  FC --> PRISMA
  ALC --> PRISMA
  SC --> PRISMA
  PRISMA --> DB[("PostgreSQL")]
```
