🩸 BloodWard — Blood Donation & Emergency Response Platform
BloodWard is a full-stack blood donation and emergency response platform designed to connect blood donors with recipients based on blood-group compatibility, availability, and location.
The project focuses on a practical and privacy-aware workflow for donor discovery, blood requests, real-time updates, role-based access control, and administrative monitoring.
---
📌 Overview
BloodWard supports three user roles:
Admin — manages users, requests, platform activity, and audit records.
Donor — maintains a donor profile, controls availability, discovers compatible blood requests, and accepts requests.
Recipient — searches for compatible donors, creates blood requests, and tracks request progress.
The system uses server-side location derivation and privacy-aware donor information so that exact residential locations are not exposed to recipients.
---
🏗️ System Overview
```text
                         ┌─────────────────────┐
                         │      BloodWard      │
                         │   React Frontend    │
                         └──────────┬──────────┘
                                    │
                              HTTP / Socket.IO
                                    │
                         ┌──────────▼──────────┐
                         │    Express Server   │
                         │  REST API + Socket  │
                         └──────────┬──────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
             ┌──────▼──────┐ ┌────▼─────┐ ┌──────▼──────┐
             │   MongoDB   │ │   Auth   │ │   Location  │
             │  Database   │ │ JWT/Cookie│ │  Matching   │
             └─────────────┘ └──────────┘ └─────────────┘
```
---
✨ Features
👤 Authentication & Roles
Donor and Recipient registration.
Admin login through a pre-created account.
JWT-based authentication using HttpOnly cookies.
Password hashing with bcrypt.
Role-based access control.
Blocked/deactivated account handling.
Secure logout and session handling.
🩸 Donor
Donor profile with:
Name
Blood group
Gender
State
City
Pincode
Availability
Toggle donor availability.
Search compatible blood requests.
View relevant request information.
Accept blood requests.
Track request progress and donation history.
Donor information is privacy-filtered before being returned to recipients.
🧑‍⚕️ Recipient
Recipient registration and profile.
Search donors by:
Blood group
State
City
Distance/radius
Supported radius options include:
2 km
5 km
7 km
10 km
20 km
Any location
Sort donor results by:
Nearest
Farthest
Recently active
Create blood requests with:
Required blood group
Units
Hospital
State
City
Urgency
Required date
Additional information
Track request status.
Recipient contact information becomes available according to the request workflow after donor acceptance.
🩸 Blood Compatibility
BloodWard applies donor-to-recipient compatibility logic for supported blood donation scenarios.
Donor Blood Group	Compatible Recipient Groups
O-	O-, O+, A-, A+, B-, B+, AB-, AB+
O+	O+, A+, B+, AB+
A-	A-, A+, AB-, AB+
A+	A+, AB+
B-	B-, B+, AB-, AB+
B+	B+, AB+
AB-	AB-, AB+
AB+	AB+
The same compatibility logic is used for donor request matching and real-time matching notifications.
---
🔄 Blood Request Lifecycle
A blood request follows a controlled state machine:
```text
Created
   │
   ▼
Active
   │
   ▼
Donor Accepted
   │
   ▼
In Progress
   │
   ├──────────────► Fulfilled / Completed
   │
   ├──────────────► Cancelled
   │
   └──────────────► Expired
```
The backend enforces valid state transitions rather than allowing arbitrary status changes.
---
📍 Location & Privacy
BloodWard uses location-based matching while avoiding exposure of exact residential addresses.
Location handling
State and City are required for relevant location-based workflows.
Donor coordinates are derived from State + City on the server.
Recipient request coordinates are also derived server-side.
Client-supplied coordinates cannot override the server-derived location.
Geospatial search is performed using MongoDB geospatial capabilities.
Privacy
Exact donor residential addresses are never exposed through donor search.
Recipient-facing donor results are privacy-filtered.
Sensitive contact information is only exposed according to the request workflow.
Approximate city-level location is used for donor discovery.
---
⚡ Real-Time Events
BloodWard uses Socket.IO for real-time in-app updates.
Supported event categories include:
New blood request notifications.
Emergency request broadcasts.
Request acceptance updates.
Request status changes.
Fulfilled request updates.
Cancelled request updates.
Expired request updates.
Socket.IO provides real-time application events while the application is connected. Browser/OS push notifications are outside the current project scope.
---
🛡️ Admin Dashboard
The Admin role provides platform-level monitoring and management.
Admin capabilities include:
View dashboard statistics.
Monitor users and accounts.
View and manage blood requests.
Block/unblock users.
Deactivate accounts.
Close or manage suspicious requests.
Review platform activity.
Review audit logs.
Monitor basic platform analytics.
Audit Logging
Important administrative and workflow actions are recorded in audit logs with information such as:
Actor/user
Action
Target/resource
Timestamp
Relevant metadata
Sensitive credentials such as passwords and JWT tokens are not stored in audit logs.
---
🔐 Security Implementation
BloodWard includes several security controls at the backend and API layers:
bcrypt password hashing.
JWT authentication.
HttpOnly cookies for authentication tokens.
Role-Based Access Control (RBAC).
Helmet security headers.
Rate limiting.
Request validation.
CORS configuration.
MongoDB/NoSQL input protection.
Centralized error handling.
Blocked/deactivated account enforcement.
Server-side location derivation.
Privacy-aware response sanitization.
Audit logging.
Atomic request acceptance to prevent conflicting donor acceptance.
---
🧰 Technology Stack
Frontend
React
Vite
React Router
Tailwind CSS
Axios
Socket.IO Client
Leaflet
OpenStreetMap
Backend
Node.js
Express.js
Socket.IO
MongoDB
Mongoose
JWT
bcrypt
Helmet
express-rate-limit
express-validator
express-mongo-sanitize
Development
Git
GitHub
npm
oxlint
API and integration testing
---
📁 Project Structure
```text
blood-ward/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── context/
│   │   ├── constants/
│   │   └── ...
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── ...
│   ├── package.json
│   └── ...
│
├── README.md
└── .gitignore
```
---
🚀 Local Setup & Installation
1. Clone the repository
```bash
git clone https://github.com/garudasec/blood-ward.git
cd blood-ward
```
2. Install frontend dependencies
```bash
cd client
npm install
```
3. Install backend dependencies
Open another terminal:
```bash
cd server
npm install
```
4. Configure environment variables
Create the required environment files according to the project configuration.
Do not commit secrets such as:
MongoDB credentials
JWT secrets
API keys
Production credentials
5. Start the backend
```bash
cd server
npm run dev
```
6. Start the frontend
```bash
cd client
npm run dev
```
The Vite development server proxies `/api` requests to the local Express server.
---
🧪 Testing & QA
The project includes backend tests covering major application phases and workflows, including:
Authentication.
Role-based access control.
Donor management.
Recipient donor search.
Blood compatibility.
Blood request lifecycle.
Admin management.
Location integrity.
Security-related API behavior.
Frontend verification includes:
```bash
cd client
npm run build
npm run lint
```
The production build completes successfully.
The lint command currently completes with warnings but no errors.
---
🔑 Environment & Secrets
Environment variables should be used for configuration and secrets.
Typical backend configuration includes values for:
```text
PORT
MONGO_URI
JWT_SECRET
CLIENT_URL
```
Use the project's actual `.env.example` / environment configuration as the source of truth for required variables.
Never commit a real `.env` file or production secrets to GitHub.
---
🎨 UI & UX
BloodWard provides a responsive interface for:
Landing page.
Authentication.
Donor dashboard.
Recipient dashboard.
Admin dashboard.
Donor profile management.
Recipient profile management.
Donor discovery.
Blood request management.
Real-time request updates.
The application also supports:
Dark mode.
Light mode.
Persistent theme preference.
Smooth page scrolling.
Responsive layouts.
Role-specific navigation.
---
🌿 Git Workflow
The repository follows a simple protected-branch workflow:
```text
develop
   │
   │ Pull Request
   ▼
 main
```
`develop`
Active development branch.
New features and fixes are implemented here.
Changes are tested before promotion.
`main`
Stable branch.
Protected through GitHub repository rules.
Direct pushes are blocked.
Changes are merged through Pull Requests.
---
📦 Project Scope
BloodWard is an academic full-stack project focused on demonstrating:
Full-stack web development.
REST API design.
Authentication and authorization.
MongoDB data modeling.
Geospatial search.
Blood compatibility logic.
Real-time communication.
Security controls.
Privacy-aware data handling.
Administrative monitoring.
It is not intended to replace a production-grade healthcare or emergency medical system.
---
⚠️ Disclaimer
BloodWard is developed for educational and academic purposes.
The platform is a software project demonstrating blood-donation workflows and should not be treated as a medically authoritative system or a substitute for verified healthcare/emergency services.
---
🔗 Repository
GitHub Repository
---
📄 License
No open-source license has been specified for this project.
This project was developed for educational and academic purposes.