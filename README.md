🩸 BloodWard
> \*\*Blood Donation \& Emergency Response Platform\*\*
BloodWard is a full-stack web application for blood donor discovery,
blood-request management, emergency donor coordination, and
privacy-aware location-based matching.
Overview
BloodWard helps recipients find suitable donors using blood group,
availability, and approximate location. It also provides request
tracking, real-time events, administrative monitoring, and security
controls.
``` text
Recipient
   ↓
Search compatible donors
   ↓
Create blood request
   ↓
Matching donor receives request/notification
   ↓
Donor accepts
   ↓
Request progresses through its lifecycle
```
Features
Authentication & Roles
Admin, Donor, and Recipient roles
Donor and Recipient registration
Login/logout
JWT authentication
HttpOnly cookies
bcrypt password hashing
Role-Based Access Control (RBAC)
Protected routes
Blocked-account enforcement
No public Admin registration
Donor
Manage donor profile
Blood group and availability
Indian State → City selection
View compatible blood requests
Accept relevant requests
View request/history information
Hide from donor search when unavailable
Recipient
Manage recipient profile
Search donors by blood group
Location and radius-based search
Distance sorting
Approximate donor location
Create and track blood requests
Real-time request updates
Blood Compatibility
BloodWard applies donor-to-recipient compatibility rules rather than
requiring identical blood groups.
Donor   Compatible recipients
---
O-      O-, O+, A-, A+, B-, B+, AB-, AB+
O+      O+, A+, B+, AB+
A-      A-, A+, AB-, AB+
A+      A+, AB+
B-      B-, B+, AB-, AB+
B+      B+, AB+
AB-     AB-, AB+
AB+     AB+
Blood Request Lifecycle
``` text
Created → Active → Donor Accepted → In Progress → Fulfilled / Completed
```
Requests may also become `Cancelled` or `Expired`.
Location & Privacy
Indian State → City dependent selection
Server-side location derivation
Geospatial donor search
Approximate donor location
Distance/radius filtering
Privacy-limited donor search results
Exact private location is not exposed through normal donor search
Relevant contact information is unlocked according to the request
workflow
Real-Time Events
Socket.IO is used for real-time in-app events such as:
New matching requests
Emergency request notifications
Request acceptance
Status changes
Cancellation
Fulfillment/completion
Admin Dashboard
Admins can:
View dashboard statistics
Manage donors and recipients
Manage blood requests
Block/unblock accounts
Manage suspicious requests
View audit logs
View basic analytics
Admin APIs require authentication and the Admin role.
Security
BloodWard was built with a cybersecurity-focused approach.
Authentication & Authorization
bcrypt password hashing
JWT authentication
HttpOnly cookies
Role-Based Access Control
Protected API routes
Admin-only APIs
Blocked-user enforcement
API Security
Helmet security headers
CORS configuration
Rate limiting
Backend input validation
Controlled MongoDB queries
NoSQL/input protection
Centralized error handling
Environment-based secrets
Audit Logging
Security-sensitive administrative actions are recorded through an
`AuditLog` model. Passwords, JWT secrets, and other credentials are not
intended to be stored in audit logs.
Technology Stack
Frontend
React
Vite
React Router
Tailwind CSS
Axios
Socket.IO Client
Leaflet
Backend
Node.js
Express.js
Socket.IO
Mongoose
MongoDB
Security
JWT
bcrypt
HttpOnly cookies
Helmet
express-rate-limit
express-validator
dotenv
CORS
Project Structure
``` text
blood-ward/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── constants/
│   │   ├── context/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── routes/
│   │   └── services/
│   ├── vite.config.js
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── tests/
│   │   └── utils/
│   ├── server.js
│   ├── .env.example
│   └── package.json
│
├── .gitignore
└── README.md
```
Local Setup
1. Clone
``` bash
git clone https://github.com/garudasec/blood-ward.git
cd blood-ward
```
2. Install frontend dependencies
``` bash
cd client
npm install
```
3. Install backend dependencies
In another terminal:
``` bash
cd blood-ward/server
npm install
```
4. Configure environment
From `server/`:
``` bash
cp .env.example .env
```
Fill the required environment variables from `.env.example`, including
the MongoDB connection string, JWT secret, client URL, port, and
environment configuration.
Never commit the real `.env` file.
5. Start backend
From `server/`:
``` bash
npm run dev
```
6. Start frontend
From `client/`:
``` bash
npm run dev
```
Testing
The backend contains tests covering areas including:
Authentication
Admin bootstrap
Availability persistence
Donor geolocation persistence
Location integrity
Recipient location handling
Blood compatibility
Request lifecycle
Full integration flows
E2E persistence
Frontend checks:
``` bash
npm run build
npm run lint
```
Environment & Secrets
Never commit:
``` text
.env
```
Keep secrets such as MongoDB credentials, JWT secrets, admin
credentials, and API keys in environment variables.
Commit only:
``` text
.env.example
```
UI
BloodWard includes:
Responsive interface
Dark/light theme
Persistent theme preference
Role-specific dashboards
Reusable UI components
Donor search map
Request tracking
Responsive navigation
Git Workflow
The repository follows:
``` text
develop
   │
   │ Pull Request
   ▼
 main
```
`develop` --- active development
`main` --- stable branch
Direct pushes to `main` are blocked by repository rules; changes are
promoted through Pull Requests.
Scope
BloodWard focuses on donor discovery, blood requests, compatibility
matching, approximate location-based search, real-time notifications,
administration, security, and privacy.
It is an educational project and is not a replacement for hospitals,
blood banks, emergency medical services, or official healthcare
systems.
Repository
https://github.com/garudasec/blood-ward
License
This project was developed for educational and academic purposes.

