# Warehouse Management System (WMS)
## Complete Feature Documentation
### For Project Defense Presentation

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [User Access & Security](#user-access--security)
3. [Dashboard](#dashboard)
4. [Inventory Management](#inventory-management)
5. [Orders Management](#orders-management)
6. [Purchase Orders](#purchase-orders)
7. [Sales Orders](#sales-orders)
8. [Shipments & Delivery Tracking](#shipments--delivery-tracking)
9. [WMS Supplier Management](#wms-supplier-management)
10. [Customer Management](#customer-management)
11. [Cash & Bank (Receipts)](#cash--bank-receipts)
12. [Payments (Disbursements)](#payments-disbursements)
13. [User Management (Admin)](#user-management-admin)
14. [System-Wide Features](#system-wide-features)

---

## System Overview

### What is WMS?

The **Warehouse Management System (WMS)** is a complete business solution designed to help companies manage their warehouse operations efficiently. It provides a centralized platform where businesses can:

- **Track inventory** – Know exactly what products you have, where they are, and when to reorder
- **Manage orders** – Process customer orders from start to finish
- **Handle purchasing** – Create and manage purchase orders with suppliers
- **Track deliveries** – Monitor shipments until they reach customers
- **Manage finances** – Record money received from customers and payments made to suppliers
- **Control user access** – Ensure the right people have access to the right features

### Who Uses This System?

| User Role | Description | What They Can Do |
|-----------|-------------|------------------|
| **Owner** | Business owner with full control | Everything - manage all users including admins, access all settings |
| **Admin** | System administrator | Create, edit, delete all records; manage operators and viewers |
| **Operator** | Warehouse staff | View all information (read-only access) |

---

## User Access & Security

### Login & Registration

**What it does:** Allows users to securely access the system with their personal account.

**Key Features:**
- ✅ **Secure Login** – Users enter their email and password to access the system
- ✅ **New User Registration** – New employees can request access by creating an account
- ✅ **Admin Approval Required** – New accounts must be approved by an Admin before they can access the system
- ✅ **Password Protection** – Strong password requirements ensure account security
- ✅ **Remember Me** – Option to stay logged in on trusted devices

**Business Benefit:** Protects sensitive business data while allowing authorized personnel easy access.

### My Profile

**What it does:** Allows users to view and update their personal information.

**Key Features:**
- ✅ View account details (name, email, role)
- ✅ Update personal information (name, phone, address)
- ✅ Change password securely
- ✅ See account creation date and last login time

**Business Benefit:** Users can keep their information current without needing admin assistance.

---

## Dashboard

### Overview

**What it does:** Provides a real-time snapshot of the entire warehouse operation at a glance.

**Who uses it:** All users (Owners, Admins, Operators, Viewers)

### Key Performance Indicators (KPIs)

The Dashboard displays the most important business metrics in easy-to-read cards:

| Metric | What It Shows | Why It Matters |
|--------|---------------|----------------|
| **Total Inventory Value** | Total worth of all products in stock (in Philippine Peso) | Know your total investment in inventory |
| **Active Orders** | Number of orders currently being processed | Track workload and fulfillment status |
| **In Transit** | Number of shipments currently being delivered | Monitor delivery operations |
| **Pending POs** | Purchase orders waiting for delivery | Track incoming inventory |

### Stock Alerts

**Low Stock Warning:**
- Shows products that need to be reordered
- Displays current quantity vs. reorder level
- Calculates estimated restock cost
- Quick action button to create purchase order

**Overstock Alert:**
- Identifies products with excess inventory
- Shows excess quantity and value
- Helps prevent over-purchasing

### Cash Flow Overview

**Receipts Summary:**
- Total money received from customers
- Number of recent transactions
- Breakdown by payment method (Cash, Bank Transfer, Credit Card, Check, Online)

**Payments Summary:**
- Total money paid to suppliers
- Number of recent transactions
- Payment method breakdown

### Quick Actions

One-click buttons to perform common tasks:
- ➕ Add Inventory
- 🛒 New Order
- 📋 Create Purchase Order
- 🚚 New Shipment
- 🔄 Refresh Data

### Visual Analytics

**Performance Charts:**
- Monthly trends showing revenue vs. expenses
- Inventory distribution by category (pie chart)
- Order status breakdown (pie chart)

**Top Products:**
- Shows best-selling items
- Displays quantity sold and revenue generated

**Business Benefit:** Executives and managers can make quick decisions based on real-time data without digging through reports.

---

## Inventory Management

### Overview

**What it does:** Tracks all products in the warehouse including quantities, locations, and pricing.

**Who uses it:** All users can view; Admins/Owners can edit

### Product Information Tracked

| Field | Description |
|-------|-------------|
| **Product Name** | Name of the item |
| **Category** | Type of product (Electronics, Furniture, Clothing, Food & Beverages, etc.) |
| **Subcategory** | More specific classification |
| **Quantity Purchased** | Total quantity bought from suppliers |
| **Quantity Sold** | Total quantity sold to customers |
| **Location** | Where the item is stored in the warehouse |
| **Brand** | Manufacturer or brand name |
| **Price Per Piece** | Unit selling price |
| **Supplier** | Who supplies this product |
| **Reorder** | Yes or No – indicates if product needs to be reordered |
| **Photo** | Product image for easy identification |

### Stock Status Indicators

Products are automatically classified based on their quantity:

| Status | Meaning | Visual Indicator |
|--------|---------|------------------|
| 🟢 **In Stock** | Healthy stock levels | Green badge |
| 🟡 **Low Stock** | Below reorder level, needs attention | Yellow badge |
| 🔴 **Critical** | Very low, urgent reorder needed | Red badge |
| 🔵 **Overstock** | Excess inventory above ideal level | Blue badge |

### Key Actions

- **Add Product** – Enter new products into the system
- **Edit Product** – Update product information
- **Delete Product** – Remove products (moves to archive first)
- **View Details** – See complete product information with photo
- **Archive/Restore** – Safely remove items without permanent deletion
- **Bulk Actions** – Select multiple items to delete, archive, or update status

### Smart Features

- **Search** – Find products by name, brand, or ID
- **Filter** – Show only certain categories, statuses, or suppliers
- **Sort** – Arrange by name, quantity, price, etc.
- **Favorites** – Mark frequently accessed items for quick access
- **Pagination** – Navigate through large product lists efficiently

**Business Benefit:** Eliminates guesswork about what's in stock, prevents stockouts, and reduces overstock situations.

---

## Orders Management

### Overview

**What it does:** Tracks customer orders from creation to delivery.

**Who uses it:** All users can view; Admins/Owners can create and manage

### Order Information

| Field | Description |
|-------|-------------|
| **Order ID** | Unique identifier for the order |
| **Customer Name** | Who placed the order |
| **Items Count** | Number of different products |
| **Total Amount** | Order value in Philippine Peso |
| **Status** | Current order stage |
| **Order Date** | When the order was placed |

### Order Status Flow

```
Pending → Processing → Shipped → Delivered
```

| Status | Meaning |
|--------|---------|
| **Pending** | Order received, not yet started |
| **Processing** | Being prepared in warehouse |
| **Shipped** | Handed to delivery carrier |
| **Delivered** | Customer received the order |

### Key Actions

- **Create Order** – Enter new customer orders
- **Update Status** – Move orders through the fulfillment process
- **Edit Order** – Modify order details
- **Delete Order** – Cancel and remove orders
- **Bulk Status Update** – Change status for multiple orders at once

**Business Benefit:** Provides clear visibility into order fulfillment, helps prioritize work, and reduces delivery delays.

---

## Purchase Orders

### Overview

**What it does:** Manages the process of ordering products from suppliers – from request to receiving.

**Who uses it:** All users can view; Admins/Owners can create and manage

### Purchase Order Workflow

```
Draft → Submitted → Approved → Ordered → Received
```

| Stage | Description |
|-------|-------------|
| **Draft** | PO created but not yet submitted |
| **Submitted** | Sent for approval |
| **Approved** | Management approved the purchase |
| **Ordered** | Order placed with supplier |
| **Partially Received** | Some items have arrived |
| **Received** | All items received and checked |
| **Rejected** | Approval denied |
| **Cancelled** | PO cancelled |

### Information Tracked

- Supplier details (name, country, city)
- Bill/Invoice number
- Order date and expected delivery date
- Line items with quantities and prices
- Total value and amount paid
- Shipping status
- Notes

### Key Actions

- **Create PO** – Start a new purchase order
- **Submit for Approval** – Send to management for review
- **Approve/Reject** – Management decision on the purchase
- **Mark as Ordered** – Confirm order sent to supplier
- **Receive Items** – Record when goods arrive
- **Archive** – Store completed POs for records

**Business Benefit:** Creates accountability in purchasing, prevents unauthorized spending, and ensures proper receiving.

---

## Sales Orders

### Overview

**What it does:** Manages orders going out to customers with detailed tracking.

**Who uses it:** All users can view; Admins/Owners can create and manage

### Sales Order Information

| Field | Description |
|-------|-------------|
| **SO Number** | Unique sales order identifier |
| **Customer** | Customer name and location |
| **Invoice Number** | Reference number for billing |
| **Items** | Products ordered with quantities and prices |
| **Total Value** | Order total in Philippine Peso |
| **Amount Received** | How much customer has paid |
| **Receipt Status** | Payment status (Unpaid/Partially Paid/Paid/Overdue) |
| **Shipping Status** | Delivery progress |
| **Expected Delivery** | When customer expects delivery |

### Shipping Status Flow

```
Pending → Processing → Shipped → In Transit → Out for Delivery → Delivered
```

### Key Actions

- **Create Sales Order** – Enter new customer orders
- **Add Line Items** – Add products to the order
- **Update Shipping Status** – Track delivery progress
- **Record Payments** – Track money received
- **View Details** – See complete order information

**Business Benefit:** Provides complete visibility into customer orders and payment status.

---

## Shipments & Delivery Tracking

### Overview

**What it does:** Tracks all deliveries from warehouse to customers.

**Who uses it:** All users can view; Admins/Owners can create and manage

### Shipment Information

| Field | Description |
|-------|-------------|
| **Shipment ID** | Unique tracking number |
| **Order ID** | Which order this shipment is for |
| **Destination** | Delivery address |
| **Carrier** | Delivery company (FedEx, LBC, J&T, etc.) |
| **Status** | Current delivery status |
| **ETA** | Expected time of arrival |

### Delivery Status

| Status | Meaning |
|--------|---------|
| **Pending** | Ready for pickup by carrier |
| **In Transit** | On the way to customer |
| **Delivered** | Successfully delivered |

### Supported Carriers

- FedEx
- UPS
- DHL
- USPS
- LBC Express
- J&T Express
- Ninja Van
- Grab Express

### Key Actions

- **Create Shipment** – Record new delivery
- **Update Status** – Track delivery progress
- **Edit Details** – Modify shipment information
- **Bulk Update** – Update multiple shipments at once

**Business Benefit:** Keeps customers informed about their deliveries and helps resolve delivery issues quickly.

---

## WMS Supplier Management

### Overview

**What it does:** Maintains a database of all suppliers the business works with. Uses the `wms_suppliers` Firestore collection to avoid naming conflicts.

**Who uses it:** All users can view; Admins/Owners can create and manage

### WMS Supplier Information

| Field | Description |
|-------|-------------|
| **Supplier Name** | Company name |
| **Contact Person** | Primary contact |
| **Email** | Business email |
| **Phone** | Contact number |
| **Category** | Type of products supplied |
| **Status** | Active or Inactive |
| **Country/City** | Location |
| **Address** | Full address |
| **Total Purchases** | How much bought from them |
| **Total Payments** | How much paid to them |

### Supplier Categories

- Electronics
- Furniture
- Clothing
- Food & Beverages
- Other

### Key Features

- **WMS Supplier Details View** – See complete supplier profile
- **Purchase History** – View all POs with this supplier
- **Products Supplied** – See which inventory items come from this supplier
- **Payment Tracking** – Monitor what's owed to each supplier
- **Archive/Restore** – Manage inactive suppliers

**Business Benefit:** Centralizes vendor information, helps negotiate better deals, and tracks supplier reliability.

---

## Customer Management

### Overview

**What it does:** Maintains a database of all customers the business serves.

**Who uses it:** All users can view; Admins/Owners can create and manage

### Customer Information

| Field | Description |
|-------|-------------|
| **Customer Name** | Individual or company name |
| **Contact** | Primary contact person |
| **Email** | Contact email |
| **Phone** | Contact number |
| **Category** | Customer type |
| **Status** | Active or Inactive |
| **Country/City** | Location |
| **Address** | Full address |
| **Total Purchases** | How much they've bought |
| **Total Payments** | How much they've paid |

### Customer Categories

- Technology
- Startup
- Enterprise
- Retail
- Healthcare
- Finance
- Other

### Key Features

- **Customer Details View** – See complete customer profile
- **Order History** – View all orders from this customer
- **Payment Tracking** – Monitor customer balances
- **Activity Summary** – See recent transactions
- **Archive/Restore** – Manage inactive customers

**Business Benefit:** Builds customer relationships, identifies valuable clients, and tracks payment reliability.

---

## Cash & Bank (Receipts)

### Overview

**What it does:** Records all money received from customers for sales orders.

**Who uses it:** All users can view; Admins/Owners can create and manage

### Transaction Information

| Field | Description |
|-------|-------------|
| **Transaction Date** | When payment was received |
| **Customer** | Who made the payment |
| **Sales Order** | Which order the payment is for |
| **Invoice Number** | Reference number |
| **Payment Mode** | How they paid |
| **Amount Received** | Payment amount in Philippine Peso |
| **Notes** | Additional information |

### Payment Methods Supported

- 💵 **Cash** – Physical cash payments
- 🏦 **Bank Transfer** – Direct bank deposits
- 💳 **Credit Card** – Card payments
- 📝 **Check** – Check payments
- 🌐 **Online Payment** – Digital payment methods

### Key Actions

- **Record Receipt** – Enter new payment received
- **Edit Transaction** – Correct payment details
- **Delete Transaction** – Remove incorrect entries
- **Filter by Payment Mode** – View specific payment types
- **Archive/Restore** – Manage old transactions

### Statistics Dashboard

- Total receipts value
- Recent transaction count
- Breakdown by payment method

**Business Benefit:** Tracks all incoming money, matches payments to invoices, and provides cash flow visibility.

---

## Payments (Disbursements)

### Overview

**What it does:** Records all payments made to suppliers for purchase orders.

**Who uses it:** All users can view; Admins/Owners can create and manage

### Transaction Information

| Field | Description |
|-------|-------------|
| **Transaction Date** | When payment was made |
| **Supplier** | Who received the payment |
| **Purchase Order** | Which PO the payment is for |
| **Bill Number** | Supplier invoice reference |
| **Payment Mode** | How payment was sent |
| **Amount Paid** | Payment amount in Philippine Peso |
| **Notes** | Additional information |

### Payment Methods Supported

- 💵 **Cash** – Physical cash payments
- 🏦 **Bank Transfer** – Direct bank transfers
- 💳 **Credit Card** – Card payments
- 📝 **Check** – Check payments
- 🌐 **Online Payment** – Digital payment methods

### Key Actions

- **Record Payment** – Enter payment made to supplier
- **Edit Transaction** – Correct payment details
- **Delete Transaction** – Remove incorrect entries
- **Link to PO** – Associate payment with purchase order
- **Archive/Restore** – Manage old transactions

### Statistics Dashboard

- Total payments value
- Recent transaction count
- Breakdown by payment method

**Business Benefit:** Tracks all outgoing money, prevents duplicate payments, and helps manage supplier relationships.

---

## User Management (Admin)

### Overview

**What it does:** Allows administrators to control who can access the system and what they can do.

**Who uses it:** Owners and Admins only

### User Approval Workflow

1. **New user registers** – Creates account with name, email, password
2. **Admin reviews** – Sees pending user in approval queue
3. **Admin approves or rejects** – Grants or denies access
4. **User notified** – Can now log in (if approved)

### User Statuses

| Status | Meaning |
|--------|---------|
| 🟢 **Active** | Can log in and use the system |
| 🟡 **Pending** | Waiting for admin approval |
| ⚫ **Inactive** | Account disabled |

### Key Actions

- **Approve User** – Grant access to pending users
- **Reject User** – Deny access and remove request
- **Change Role** – Promote or demote user access level
- **Activate/Deactivate** – Enable or disable accounts
- **Delete User** – Permanently remove user accounts

### Role Management

**What each role can do:**

| Action | Owner | Admin | Operator | Viewer |
|--------|:-----:|:-----:|:--------:|:------:|
| View all data | ✅ | ✅ | ✅ | ✅ |
| Add/Edit/Delete records | ✅ | ✅ | ❌ | ❌ |
| Approve Purchase Orders | ✅ | ✅ | ❌ | ❌ |
| Manage Operators/Viewers | ✅ | ✅ | ❌ | ❌ |
| Manage Admins | ✅ | ❌ | ❌ | ❌ |
| System Settings | ✅ | ❌ | ❌ | ❌ |

**Business Benefit:** Ensures proper access control, protects sensitive data, and maintains accountability.

---

## System-Wide Features

### Global Search (Command Palette)

**What it does:** Quickly find anything in the system from one search box.

**How to use:** Press `Ctrl+K` (or `Cmd+K` on Mac) to open search

**Search Capabilities:**
- Find products by name, brand, or ID
- Find orders by customer or order number
- Find suppliers by name or contact
- Find shipments by destination
- Filter using special syntax (e.g., `status:critical`, `category:electronics`)
- View recent searches

**Business Benefit:** Saves time by providing instant access to any record in the system.

### Dark/Light Theme

**What it does:** Allows users to switch between light and dark color schemes.

**Benefits:**
- Reduces eye strain in low-light environments
- Personal preference accommodation
- Professional appearance

### Favorites

**What it does:** Allows users to mark frequently accessed items for quick access.

**Available for:**
- Inventory items
- Orders
- Shipments
- Suppliers

**Business Benefit:** Speeds up daily workflows by providing quick access to commonly used records.

### Bulk Actions

**What it does:** Allows performing the same action on multiple items at once.

**Available Actions:**
- Select multiple items using checkboxes
- Delete multiple records
- Update status for multiple items
- Archive multiple records

**Business Benefit:** Dramatically reduces time for repetitive tasks.

### Data Export

**What it does:** Allows downloading data for external use or backup.

**Export Features:**
- Export to Excel/CSV format
- Download reports
- Backup transaction data

**Business Benefit:** Enables external reporting and data backup.

### Print/Export Receipts

**What it does:** Generate professional printable documents for transactions and orders.

**Available Print Documents:**

| Module | Document Type | Description |
|--------|--------------|-------------|
| **Sales Orders** | Sales Invoice | Print customer invoices with line items and totals |
| **Cash & Bank** | Payment Receipt | Print receipt vouchers for money received from customers |
| **Payments** | Payment Voucher | Print disbursement vouchers for payments to suppliers |
| **Purchase Orders** | Purchase Order | Print PO documents to send to suppliers |

**Document Features:**
- ✅ Professional company header
- ✅ Document number and date
- ✅ Customer/Supplier information with location
- ✅ Reference numbers (Invoice #, Bill #, SO #, PO #)
- ✅ Line items table with quantities and prices
- ✅ Total amount, amount paid, and balance due
- ✅ Payment method display
- ✅ Status indicators
- ✅ Notes section
- ✅ Signature lines (Prepared By / Received By)
- ✅ Print timestamp footer

**How to Use:**
1. Navigate to the relevant module (Sales Orders, Cash & Bank, Payments, or Purchase Orders)
2. Click the **Print** button (🖨️ icon) on any record
3. A print preview window opens with the formatted document
4. Use browser print dialog (Ctrl+P / Cmd+P) to print or save as PDF

**Philippine Business Standards:**
- Currency formatted as Philippine Peso (₱)
- Date format: Month Day, Year (e.g., December 3, 2025)
- Professional layout suitable for official business documents

**Business Benefit:** Create professional documentation for customers, suppliers, and record-keeping without additional software.

### Responsive Design

**What it does:** The system works on any device – desktop, tablet, or mobile.

**Benefits:**
- Use on warehouse floor with tablets
- Check status on mobile phones
- Full functionality on desktop computers

**Business Benefit:** Access the system from anywhere, on any device.

### Real-Time Updates

**What it does:** Data refreshes automatically to show the latest information.

**Features:**
- Live inventory counts
- Real-time order status
- Automatic dashboard updates
- Pull-to-refresh functionality

**Business Benefit:** Everyone sees the same, current information.

---

## Summary of Business Benefits

| Module | Key Benefit |
|--------|-------------|
| **Dashboard** | Instant business overview for quick decisions |
| **Inventory** | Know exactly what you have and where |
| **Orders** | Never miss a customer order |
| **Purchase Orders** | Control spending with approval workflow |
| **Sales Orders** | Track customer orders completely + Print invoices |
| **Shipments** | Keep customers informed about deliveries |
| **Suppliers** | Manage vendor relationships effectively |
| **Customers** | Build stronger customer relationships |
| **Cash & Bank** | Track all incoming money + Print receipts |
| **Payments** | Control outgoing payments + Print vouchers |
| **User Management** | Secure access with proper controls |
| **Print/Export** | Professional document generation for all transactions |

---

## Technical Notes (For Reference)

- **Currency:** Philippine Peso (₱)
- **Platform:** Web-based application
- **Browser Support:** Modern browsers (Chrome, Firefox, Safari, Edge)
- **Data Storage:** Local browser storage (demo) / Database (production)
- **Security:** Password encryption, session management, role-based access

---

*Warehouse Management System for Inventory and Supply Chain Coordination*

*Documentation Version: 1.1*
*Last Updated: December 3, 2025*

