
# Lendiogo

A community-driven, full-stack peer-to-peer asset economy platform built to eliminate structural inefficiencies in asset utilization. 

## Why We Built This

Lendiogo was engineered to solve a massive, hidden economic leakage in our daily lives. When individuals need high-value utility assets for just a few days—such as a DSLR camera for a weekend shoot, a projector for an event, or tools for a home repair—they are typically trapped in a broken binary choice: deploy hard-earned capital to purchase an asset they will rarely use again, or completely compromise their plans and go without it. 

Meanwhile, millions of rupees worth of these exact assets sit completely idle in household closets and storage rooms every single day. Lendiogo bridges this gap by giving people a safe, highly accountable digital infrastructure to safely monetize their idle assets and borrow what they need directly from their local community.

---

## Technical Architecture Deep Dive

### System Topology
```text
[React + Vite Frontend] ──(JWT Session Auth)──> [Node.js + Express REST API]
       │                                                   │
 (Media Assets)                                   (Relational Queries)
       ▼                                                   ▼
[Cloudinary CDN Engine]                         [SQL Server Database Core]

```

### Core Engineering Paradigms

* **Demand-Driven Marketplace (Core USP):** Traditional rental apps require owners to manage tedious item listings, which kills platform liquidity. Lendiogo flips the paradigm: renters post what they need, their budget, and location first. Nearby owners then bid on those active requests, shifting the operational burden away from the supplier.
* **Asynchronous State Validation:** Leverages secure token validation loops where Firebase manages identity registration, while the Node.js backend handles multi-step verification checks (strict format parsing for 13-digit CNIC sequences and phone protocols).
* **Stateless Server Infrastructure:** All media assets, user profile images, and verification uploads bypass local application directories and stream directly into a Cloudinary storage engine to keep server memory clean and highly scalable.
* **Atomic Multi-Row Database Operations:** When an asset request offer is accepted, the background SQL database core executes an atomic transaction: it confirms the targeted offer, updates the parent request state to closed, and flags all alternative bids as rejected simultaneously.
* **Debounced Search Queries:** The request feed features interactive server-side filtering (by category, city, price bounds, and status) built with client-side debouncing mechanics to protect API endpoints from excessive hits during fast keystrokes.

---

## Technical Stack

* **Frontend Ecosystem:** React.js, Vite Build Pipeline, Tailwind CSS Engines
* **Backend Application Layer:** Node.js, Express Framework Router
* **Database Infrastructure:** SQL Server (MSSQL Relational Core)
* **Identity & Token Verification:** Firebase Authentication Protocols
* **Media Delivery Network:** Cloudinary Storage Cloud

---

## Database Schema Model

The application infrastructure enforces structural reliability through normalized relational data models:

| Entity Set | Core Parameters Enforced | Key Relationships | Operational Integrity Rule |
| --- | --- | --- | --- |
| **Users** | UserID, CNIC (13-Digit), PrimaryPhone, WalletBalance | One-to-Many Requests | Enforces unique account strings per verified CNIC |
| **Requests** | RequestID, TargetCategory, AreaScope, BudgetCap, StateCode | One-to-Many Offers | Automatically closes when a target offer is confirmed |
| **Offers** | OfferID, LenderID, RequestID, BidAmount, StatusFlag | Many-to-One Request | Database constraint blocks a lender from bidding twice on the same request |

---

## Production Setup & Deployment

### 1. Repository Realignment

Clone the engineering repository cleanly into your local workstation environment:

```bash
git clone [https://github.com/yousuf-iqbal/LendiGo.git](https://github.com/yousuf-iqbal/LendiGo.git)
cd LendiGo

```

### 2. Database Core Setup

* Launch SQL Server Management Studio (SSMS).
* Open the initialization script located in your `/database` folder path.
* Execute the script to compile tables, foreign keys, and transaction constraints.

### 3. Backend Service Activation

Initialize the API environment, set up configurations, and spin up the Node.js framework loop:

```bash
cd backend
npm install

```

Create a clean `.env` file in the root backend folder and supply the target parameters:

```env
PORT=5000
DB_USER=your_sql_user
DB_PASSWORD=your_sql_password
DB_SERVER=localhost
DB_NAME=LendiogoDB
JWT_SECRET=your_system_secret

```

Launch the backend server:

```bash
node server.js

```

### 4. Frontend Compilation

Spin up the fast Vite build server engine to open the client application interface:

```bash
cd ../frontend
npm install
npm run dev

```

```

```
