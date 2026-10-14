# 🍃 MongoDB Studio & Scratch NoSQL Engine

A full-stack, MongoDB-compatible document database system built from scratch, featuring an Express REST API, a visual Studio GUI built with React + Vite, and an Electron desktop application wrapper for cross-platform desktop use.

![License](https://img.shields.io/badge/License-MIT-emerald)
![Node](https://img.shields.io/badge/Node-v20+-cyan)
![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20Electron-indigo)

---

## 🌟 Highlights & Capabilities

1. **Custom NoSQL Database Engine from Scratch (`server/engine/`)** — *(See detailed [Engine & Query Architecture Guide](server/engine/README.md))*
   - **Atomic Write Persistence (WAL)**: Safely writes data using temp files and atomic rename operations to prevent corruption.
   - **MongoDB-Compatible Query Evaluator**: Supports dot-notation, comparison operators (`$eq`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`), string regex (`$regex`), existence checks (`$exists`), and logical operators (`$and`, `$or`, `$not`, `$nor`).
   - **MongoDB 24-char ObjectId Generator**: Timestamp-encoded hex IDs identical to MongoDB ObjectIds.
   - **Aggregation Pipeline Evaluator**: Full support for `$match`, `$group` (`$sum`, `$avg`, `$min`, `$max`, `$count`, `$push`, `$addToSet`), `$sort`, `$project`, `$limit`, `$skip`, and `$count`.
   - **Secondary & Unique Indexing (`indexManager.js`)**: In-memory hash maps enforcing unique constraints and accelerating lookups.
   - **Dynamic Schema Validator (`schemaValidator.js`)**: Dynamic data type checking (`string`, `number`, `boolean`, `date`, `array`, `object`, `objectId`), `required`, `min`/`max`, regex `pattern`, `enum`, default values, and strict mode.

2. **Hybrid Engine Architecture**
   - **Local Scratch Engine**: Runs out of the box with zero external database dependencies.
   - **Live MongoDB Mode**: Toggle connection to an official MongoDB server (local `mongodb://localhost:27017` or MongoDB Atlas cloud URI) with transparent API parity.

3. **Modern Web & Desktop Studio GUI**
   - **Documents Explorer**: Switch between **Cards**, **Table**, and **JSON Raw** views with filtering, multi-key sorting, document insertion, inline editing, and deletion.
   - **Schema Studio**: Visual schema builder to configure validation rules, field types, and unique constraints, complete with a **Live Sandbox Validator**.
   - **MQL Query Console**: Execute raw Mongo shell queries like `find({...}).sort({...}).limit(20)` or `countDocuments({...})` with real-time execution benchmarks.
   - **Aggregation Pipeline Builder**: Assemble pipeline stages visually and run computations with immediate grouping results.
   - **Interactive REST API Generator**: Copy-to-clipboard code snippets in **cURL**, **JavaScript (Fetch)**, and **Python (Requests)** for every collection.
   - **Import & Export (I/O)**: Export and import collection data seamlessly in **JSON** or **CSV** formats.

4. **Multi-Platform Deployment**
   - **Web App**: Responsive, ultra-modern dark theme.
   - **Electron Desktop App**: Packaged with native window controls, system file dialogs, and auto-spawned local database server.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm (v9 or higher)

### Installation
Clone or navigate to the repository folder:
```bash
cd a:/Coding/Express/MongoDB_Project
npm install
```

### Run Options

#### 1. Web App Mode (Browser)
Starts both the Express REST API server (`http://localhost:4000`) and the Vite React frontend (`http://localhost:5173`):
```bash
npm run dev:web
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

#### 2. Standalone Server Mode (Production Web Bundle)
Build the frontend and run the production server:
```bash
npm run build
npm run server
```
Open [http://localhost:4000](http://localhost:4000) in your browser.

#### 3. Electron Desktop App Mode
Launches the full desktop application window:
```bash
npm run dev
```
Or to launch Electron against the built bundle:
```bash
npm run electron
```

---

## 📁 Project Architecture

```
MongoDB_Project/
├── data/
│   └── databases/                # File-based database storage
│       ├── ecommerce_db/         # Pre-seeded sample database
│       │   ├── users/            # Collection directory
│       │   │   ├── documents.json
│       │   │   ├── schema.json
│       │   │   └── indexes.json
│       │   ├── products/
│       │   └── orders/
│       └── analytics_db/
├── server/
│   ├── engine/                   # Scratch NoSQL Engine
│   │   ├── scratchDb.js          # Core storage, atomic WAL & CRUD
│   │   ├── queryEngine.js        # MongoDB query filter evaluator
│   │   ├── schemaValidator.js    # Dynamic schema validation engine
│   │   ├── aggregationEngine.js  # Pipeline evaluator ($match, $group, etc.)
│   │   └── indexManager.js       # In-memory indexer & unique constraints
│   ├── mongoAdapter.js           # Live MongoDB driver adapter
│   ├── dbManager.js              # Unified engine switcher
│   ├── defaultData.js            # Initial schema & sample seeder
│   ├── routes/                   # Express REST API routes
│   │   ├── statusRoutes.js       # Health, system metrics & engine switch
│   │   ├── databaseRoutes.js     # DB & collection management
│   │   ├── schemaRoutes.js       # Schema fetch, save & validate
│   │   ├── documentRoutes.js     # Document CRUD & query endpoints
│   │   ├── queryRoutes.js        # MQL query console & aggregations
│   │   └── exportImportRoutes.js # JSON / CSV import & export
│   └── server.js                 # Express application entry point
├── src/                          # Vite + React Frontend
│   ├── components/
│   │   ├── Navbar.jsx            # Top bar, DB selector, Engine pill
│   │   ├── Sidebar.jsx           # Database tree & collection stats
│   │   ├── DocumentExplorer.jsx  # Cards, Table & JSON document views
│   │   ├── DocumentEditorModal.jsx # Create/edit document with schema test
│   │   ├── SchemaStudio.jsx      # Visual dynamic schema designer
│   │   ├── QueryPlayground.jsx   # Raw MQL query console
│   │   ├── AggregationBuilder.jsx# Visual pipeline assembler
│   │   ├── ApiDocModal.jsx       # Interactive REST API docs
│   │   ├── ImportExportModal.jsx # JSON & CSV data transfer
│   │   └── ConnectionModal.jsx   # Engine switcher modal
│   ├── styles/
│   │   └── index.css             # Vanilla CSS design system
│   ├── api.js                    # Frontend API client
│   ├── App.jsx                   # Main workspace layout & state
│   └── main.jsx                  # React DOM root
├── electron/
│   ├── main.cjs                  # Electron main process & server launcher
│   └── preload.cjs               # Native IPC context bridge
├── vite.config.js                # Vite build & proxy configuration
└── package.json
```

---

## 📡 REST API Quick Reference

### Databases & Collections
- `GET /api/databases` — List all databases
- `POST /api/databases` — Create database (`{ "name": "my_db" }`)
- `DELETE /api/databases/:dbName` — Drop database
- `GET /api/databases/:dbName/collections` — List collections
- `POST /api/databases/:dbName/collections` — Create collection (`{ "name": "my_coll", "schema": {...} }`)
- `DELETE /api/databases/:dbName/collections/:collName` — Drop collection

### Documents CRUD & Filtering
- `POST /api/databases/:dbName/collections/:collName/query` — Query with filter, sort, skip, limit
- `POST /api/databases/:dbName/collections/:collName/documents` — Insert document (enforces schema)
- `GET /api/databases/:dbName/collections/:collName/documents/:id` — Get document by ID
- `PUT /api/databases/:dbName/collections/:collName/documents/:id` — Update document
- `DELETE /api/databases/:dbName/collections/:collName/documents/:id` — Delete document

### Schemas
- `GET /api/databases/:dbName/collections/:collName/schema` — Fetch active schema
- `PUT /api/databases/:dbName/collections/:collName/schema` — Update schema rules & enforce
- `POST /api/databases/:dbName/collections/:collName/schema/validate` — Test sample document against schema

### Query Runner & Aggregations
- `POST /api/databases/:dbName/collections/:collName/raw-query` — Run shell command (e.g. `find({ age: { $gt: 20 } })`)
- `POST /api/databases/:dbName/collections/:collName/aggregate` — Run pipeline `[{ $match: ... }, { $group: ... }]`

### Data Import & Export
- `GET /api/databases/:dbName/collections/:collName/export?format=json|csv` — Export collection
- `POST /api/databases/:dbName/collections/:collName/import` — Import JSON or CSV payload
