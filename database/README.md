# Database Management 🗄️

This folder contains database backup/restore scripts, raw JSON seed data, and schema documentation for the **Smart Tamil Nadu Electricity Platform**.

## Contents
1. `backup.ps1` - PowerShell script to take a snapshot of the local MongoDB database.
2. `restore.ps1` - PowerShell script to restore a snapshot.
3. `schema_design.md` - Documentation of all MongoDB collections and their relationships.
4. `tangedco_tariff_2026.json` - Raw JSON backup of the 2026 TANGEDCO LT-1A tariff logic.

## How to Backup Database
Run this in PowerShell:
```powershell
.\backup.ps1


**`database\schema_design.md`**
```markdown
# Database Schema Design (MongoDB)

## Overview
The platform uses a NoSQL architecture via MongoDB, optimized for high-frequency IoT data writes and complex nested tariff structures.

## Collections & Relationships

### 1. `users`
*   **Role:** Handles authentication and RBAC.
*   **Key Fields:** `name`, `email`, `password` (hashed), `role` (CONSUMER, ADMIN).

### 2. `consumers`
*   **Role:** Holds TNEB-specific meter metadata.
*   **Key Fields:** `serviceNumber` (unique), `tariffCategory` (e.g., LT-1A), `sanctionedLoadKw`.
*   **Relation:** One-to-One with `users` (`user_id`).

### 3. `tariffs`
*   **Role:** Stores dynamic TANGEDCO 2026 telescopic billing rules.
*   **Key Fields:** `category`, `tiers` (nested arrays containing `conditionMaxUnits`, `freeUnits`, and `slabs`).

### 4. `iotreadings`
*   **Role:** Time-Series collection storing high-frequency smart meter data.
*   **Key Fields:** `serviceNumber` (Index), `timestamp` (TimeField), `voltage`, `current`, `powerKw`, `energyKwh`.

### 5. `bills`
*   **Role:** Immutable snapshot of generated consumer bills.
*   **Key Fields:** `billingMonth`, `unitsConsumed`, `totalAmount`, `slabBreakdown` (Array).
*   **Relation:** Many-to-One with `consumers` (`consumer_id`).

### 6. `predictions` & `alerts`
*   **Role:** Stores ML predictions and system alerts (Offline meters, spikes).