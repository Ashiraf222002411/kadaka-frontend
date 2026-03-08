# Kadaka Lending Management System
## Requirements & Features Document

---

## 1. PROJECT OVERVIEW

### 1.1 Project Name
**Kadaka** - Web-Based Lending Management System

### 1.2 Purpose
Digitize and streamline the lending lifecycle for Kadaka Establishment Co. (U) LTD, replacing manual credit book record-keeping with an efficient, accurate, and scalable web-based solution.

### 1.3 Current Challenges (Based on Physical Credit Book)
- Manual data entry prone to errors
- Difficult to track multiple groups and members simultaneously
- Limited reporting and analytics capabilities
- No automated calculation of interest and balances
- Risk of data loss or damage to physical records
- Time-consuming reconciliation processes
- No automated reminders for payments
- Limited accessibility (only available where physical book is located)

---

## 2. CORE FEATURES

### 2.1 User Management & Authentication

#### Roles & Permissions
1. **Super Admin**
   - Full system access
   - User management
   - System configuration
   - Financial oversight

2. **Branch Manager**
   - Manage branch operations
   - Approve loans
   - View branch reports
   - Manage loan officers

3. **Loan Officer**
   - Register groups and members
   - Process loan applications
   - Record payments
   - Track loan performance

4. **Accountant**
   - Financial reporting
   - Payment verification
   - Interest calculations
   - Reconciliation

5. **Auditor** (Read-only)
   - View all records
   - Generate audit reports
   - Export data

#### Authentication Features
- Secure login with email/phone and password
- Two-factor authentication (SMS OTP)
- Password reset functionality
- Session management
- Activity logging

---

### 2.2 Group Management

#### Group Registration
- Group name
- Group registration number
- Registration date
- Group leader information
- Meeting day/time
- Meeting location
- Group constitution document upload
- Status (Active/Inactive/Suspended)

#### Group Features
- Add/remove members
- View group loan history
- Group-level reporting
- Group meeting schedule
- Group savings tracking (if applicable)
- Group guarantor relationships

---

### 2.3 Member Management

#### Member Registration
- Personal Information:
  - Full name
  - National ID number
  - Date of birth
  - Gender
  - Photo upload
  - Phone numbers (primary and alternative)
  - Email address
  - Physical address
  - District/village

- Next of Kin:
  - Name
  - Relationship
  - Phone number
  - Address

- Business Information:
  - Type of business
  - Business location
  - Years in business
  - Monthly income estimate

- KYC Documents:
  - National ID (front and back)
  - Passport photo
  - Proof of residence
  - Business registration (if applicable)

#### Member Features
- View member profile
- Loan history
- Payment history
- Savings balance (if applicable)
- Guarantor relationships
- Status (Active/Inactive/Defaulted/Blacklisted)

---

### 2.4 Loan Management

#### Loan Application Process
1. **Application Initiation**
   - Loan product selection
   - Requested amount
   - Purpose of loan
   - Preferred repayment schedule
   - Group approval (if group loan)

2. **Assessment**
   - Credit scoring
   - Business visit notes
   - Guarantor verification
   - Loan officer recommendation

3. **Approval Workflow**
   - Loan officer review
   - Manager approval
   - Automated eligibility checks
   - Approval/rejection with reasons

4. **Disbursement**
   - Disbursement method (Cash/Mobile Money/Bank)
   - Disbursement date
   - Disbursement officer
   - Loan agreement generation
   - Digital signature capture

#### Loan Products Configuration
- Product name
- Minimum/maximum loan amount
- Interest rate (flat or reducing balance)
- Interest calculation method
- Loan term options (weeks/months)
- Repayment frequency (daily/weekly/monthly)
- Processing fees
- Insurance fees
- Late payment penalties
- Early repayment policy
- Eligibility criteria

#### Loan Tracking
- Loan ID (unique identifier)
- Member/group information
- Loan amount (principal)
- Interest rate
- Total amount payable
- Disbursement date
- Maturity date
- Current balance on principal
- Current balance on interest
- Total balance outstanding
- Repayment schedule
- Next payment due date
- Payment status
- Days past due
- Arrears amount
- Loan status (Active/Cleared/Written Off/Restructured)

---

### 2.5 Repayment Management

#### Payment Recording
- Payment date
- Payment amount
- Allocation (interest first, then principal)
- Balance on interest (after payment)
- Balance on principal (after payment)
- Total outstanding balance
- Payment method (Cash/Mobile Money/Bank Transfer)
- Receipt number
- Received by (officer name)
- Payment location

#### Payment Features
- **Bulk Payments**: Record multiple payments in one session
- **Partial Payments**: Accept any amount and allocate accordingly
- **Overpayments**: Track and apply to future payments or refund
- **Payment History**: Complete audit trail of all transactions
- **Receipt Generation**: Automatic receipt creation and printing/SMS
- **Payment Reminders**: Automated SMS reminders before due dates
- **Penalty Calculation**: Automatic calculation of late payment fees

#### Mobile Money Integration
- MTN Mobile Money
- Airtel Money
- Direct payment recording via API
- Transaction verification
- Automated reconciliation

---

### 2.6 Interest Calculation Engine

#### Calculation Methods
1. **Flat Rate Interest**
   - Interest = (Principal × Rate × Time) / 100
   - Total Repayment = Principal + Interest
   - Equal installments

2. **Reducing Balance**
   - Interest calculated on outstanding balance
   - Decreasing interest over time
   - More principal repaid over time

#### Features
- Automated daily interest accrual
- Penalty interest on overdue amounts
- Interest waiver functionality (with approval)
- Compound interest for very delinquent loans
- Grace period configuration
- Holiday/weekend consideration in calculations

---

### 2.7 Reporting & Analytics

#### Dashboard (Role-Based)
**Loan Officer Dashboard**
- Active loans count
- Loans due today/this week
- Total outstanding portfolio
- Collections today/this week
- Overdue loans
- New applications pending

**Manager Dashboard**
- Branch performance overview
- Portfolio at risk (PAR)
- Disbursements vs. collections
- Officer performance comparison
- Approval queue
- Financial summary

**Super Admin Dashboard**
- Company-wide portfolio
- Branch comparison
- Profitability analysis
- System usage statistics
- Risk indicators

#### Standard Reports
1. **Loan Reports**
   - Active loans register
   - Matured/closed loans
   - Overdue loans (by aging: 1-30, 31-60, 61-90, 90+ days)
   - Written-off loans
   - Loan disbursement report
   - Loan approval report

2. **Collection Reports**
   - Daily collection report
   - Monthly collection report
   - Officer collection performance
   - Expected vs. actual collections
   - Payment mode analysis

3. **Portfolio Reports**
   - Portfolio quality report
   - Portfolio at risk (PAR) by period
   - Portfolio by product
   - Portfolio by branch/officer
   - Loan aging analysis

4. **Member Reports**
   - Active members list
   - New members report
   - Member loan history
   - Defaulters list
   - Member savings report

5. **Financial Reports**
   - Income statement
   - Balance sheet
   - Cash flow report
   - Interest income report
   - Fee income report
   - Loan loss provisioning

6. **Group Reports**
   - Group portfolio summary
   - Group performance ranking
   - Group attendance tracking
   - Group savings summary

#### Report Features
- Date range filtering
- Export to Excel/PDF
- Email scheduling
- Custom report builder
- Print-friendly formats
- Data visualization (charts/graphs)

---

### 2.8 Communication Module

#### SMS Features
- Payment reminders (automated)
- Payment confirmations
- Loan approval notifications
- Disbursement confirmations
- Overdue payment alerts
- Meeting reminders
- Promotional messages
- Bulk SMS capability

#### Email Features
- Statements
- Loan agreements
- Receipts
- Monthly portfolio reports
- System notifications

#### In-App Notifications
- Task assignments
- Approval requests
- System alerts
- Payment notifications

---

### 2.9 Document Management

#### Document Storage
- Member KYC documents
- Group registration documents
- Loan applications
- Loan agreements
- Guarantor forms
- Business visit photos
- Collateral photos (if applicable)
- Payment receipts
- Correspondence

#### Features
- Secure cloud storage
- Document categorization
- Version control
- Quick search
- Access control
- Automatic backup
- Document expiry alerts (e.g., ID expiration)

---

### 2.10 Audit Trail & Compliance

#### System Logging
- All user actions logged
- Date and time stamps
- User identification
- Before/after values for edits
- IP address tracking
- Failed login attempts

#### Compliance Features
- Data protection compliance (GDPR-like)
- Financial regulations adherence
- Backup and disaster recovery
- User access reviews
- Suspicious activity flagging
- Data retention policies

---

## 3. TECHNICAL REQUIREMENTS

### 3.1 Platform
- **Web-based application** (responsive design)
- Works on desktop, tablet, and mobile browsers
- Progressive Web App (PWA) capability for offline functionality

### 3.2 Technology Stack Recommendations

#### Frontend
- React.js or Vue.js
- Material-UI or Tailwind CSS
- Chart.js or D3.js for visualizations

#### Backend
- Node.js with Express or Python with Django/Flask
- RESTful API architecture
- JWT for authentication

#### Database
- PostgreSQL (primary database)
- Redis (caching and session management)
- MongoDB (optional, for document storage)

#### Storage
- AWS S3 or Azure Blob Storage for documents
- CloudFront CDN for static assets

#### SMS Integration
- Africa's Talking or Twilio
- SMS gateway for local providers

#### Mobile Money Integration
- MTN MoMo API
- Airtel Money API
- Payment aggregator (e.g., Flutterwave, Paystack)

### 3.3 Security Requirements
- HTTPS/SSL encryption
- Data encryption at rest
- Regular security audits
- PCI DSS compliance (if handling card payments)
- Role-based access control (RBAC)
- API rate limiting
- SQL injection prevention
- XSS protection
- CSRF protection

### 3.4 Performance Requirements
- Page load time < 3 seconds
- Support 100+ concurrent users
- 99.9% uptime
- Daily automated backups
- Disaster recovery plan

### 3.5 Scalability
- Multi-branch support
- Multi-currency support (future)
- API for third-party integrations
- Microservices architecture (optional)

---

## 4. USER WORKFLOWS

### 4.1 New Loan Workflow
```
1. Member applies for loan (via Loan Officer)
2. Loan Officer enters application details
3. System performs automatic credit check
4. Loan Officer conducts field visit
5. Loan Officer submits for approval
6. Manager reviews and approves/rejects
7. If approved, accountant disburses funds
8. System generates loan agreement
9. Repayment schedule activated
10. Automated reminders begin
```

### 4.2 Payment Recording Workflow
```
1. Member makes payment (Cash/Mobile Money)
2. Loan Officer logs into system
3. Searches for member/loan
4. Enters payment amount and method
5. System calculates:
   - Interest portion
   - Principal portion
   - New balances
   - Next payment due
6. Receipt generated automatically
7. SMS confirmation sent to member
8. Payment recorded in general ledger
```

### 4.3 Month-End Workflow
```
1. System automatically:
   - Accrues interest
   - Updates PAR calculations
   - Generates aging reports
   - Calculates provisions
2. Accountant reviews financials
3. Manager approves month-end close
4. Reports emailed to stakeholders
5. System archives period data
```

---

## 5. DATA MIGRATION PLAN

### 5.1 Historical Data Import
- Create Excel template matching current credit book structure
- Import existing groups and members
- Import historical loan data
- Import payment history
- Verify data integrity
- Reconcile balances

### 5.2 Data Validation
- Cross-check totals
- Verify member information
- Confirm loan statuses
- Validate payment allocations

---

## 6. TRAINING & SUPPORT

### 6.1 User Training
- Super Admin training (2 days)
- Manager training (1 day)
- Loan Officer training (2 days)
- Accountant training (1 day)
- User manual creation
- Video tutorials

### 6.2 Support
- Help desk ticketing system
- Phone support (business hours)
- Email support
- In-app chat support
- Monthly training refreshers
- System updates communication

---

## 7. IMPLEMENTATION PHASES

### Phase 1: MVP (3-4 months)
- User management and authentication
- Group and member management
- Basic loan management
- Payment recording
- Simple reporting
- SMS notifications

### Phase 2: Enhanced Features (2-3 months)
- Advanced reporting
- Mobile money integration
- Document management
- Automated workflows
- Enhanced dashboard

### Phase 3: Optimization (2 months)
- Performance optimization
- Advanced analytics
- API development
- Mobile app (optional)
- Additional integrations

---

## 8. SUCCESS METRICS

### 8.1 Efficiency Metrics
- Loan processing time reduced by 60%
- Payment recording time reduced by 70%
- Report generation time reduced by 80%
- Error rate reduced by 90%

### 8.2 Business Metrics
- Increase in loan disbursements
- Improved collection rate
- Reduced PAR
- Increase in active members
- Improved customer satisfaction

### 8.3 System Metrics
- 95%+ user adoption rate
- System uptime 99.9%
- Average response time < 2 seconds
- Zero critical data loss incidents

---

## 9. BUDGET CONSIDERATIONS

### 9.1 Development Costs
- Frontend development
- Backend development
- Database design
- Integration development
- Testing and QA
- Project management

### 9.2 Infrastructure Costs
- Cloud hosting (AWS/Azure)
- Domain and SSL certificates
- SMS gateway credits
- Email service
- Backup and storage
- CDN services

### 9.3 Ongoing Costs
- Monthly hosting fees
- SMS costs
- Support and maintenance
- Software licenses
- Security audits
- Feature enhancements

---

## 10. RISK MANAGEMENT

### 10.1 Technical Risks
- **Data Migration Issues**: Mitigate with thorough testing and parallel run
- **System Downtime**: Mitigate with redundancy and backups
- **Security Breaches**: Mitigate with security audits and best practices
- **Integration Failures**: Mitigate with fallback mechanisms

### 10.2 Business Risks
- **User Resistance**: Mitigate with comprehensive training and change management
- **Data Accuracy**: Mitigate with validation rules and double-entry checks
- **Regulatory Compliance**: Mitigate with legal review and compliance monitoring

### 10.3 Mitigation Strategies
- Regular backups
- Disaster recovery plan
- User acceptance testing
- Phased rollout
- Parallel operations during transition
- 24/7 monitoring
- Regular security updates

---

## 11. NEXT STEPS

1. **Stakeholder Review**: Present this document to key stakeholders
2. **Requirements Refinement**: Gather feedback and finalize requirements
3. **Vendor Selection**: Choose development team/company
4. **Project Kickoff**: Establish timeline and milestones
5. **Design Phase**: UI/UX mockups and database design
6. **Development**: Agile sprints with regular demos
7. **Testing**: Comprehensive UAT with actual users
8. **Training**: Train all user groups
9. **Migration**: Import historical data
10. **Go-Live**: Launch with support team ready
11. **Post-Launch Support**: Monitor and optimize

---

## 12. CONTACT & PROJECT OWNERSHIP

**Project Name**: Kadaka Lending Management System  
**Organization**: Kadaka Establishment Co. (U) LTD  
**Location**: Uganda  
**Project Type**: Web-Based Lending Management Platform  

---

## APPENDIX A: Glossary

- **PAR (Portfolio at Risk)**: Percentage of loan portfolio with payments overdue
- **Flat Rate**: Interest calculated on original principal for entire loan period
- **Reducing Balance**: Interest calculated on remaining principal balance
- **Disbursement**: Release of loan funds to borrower
- **Principal**: Original loan amount borrowed
- **KYC**: Know Your Customer - identity verification process
- **Loan Aging**: Time period loans have been overdue
- **Provision**: Funds set aside to cover potential loan losses
- **Write-off**: Removal of uncollectible loan from active portfolio

---

## APPENDIX B: Sample Loan Calculation

**Example from Credit Book:**
- Loan Amount: 100,000 UGX
- Repayment 1: 10,000 UGX
- Interest Portion: 148 UGX
- Principal Portion: 9,852 UGX (10,000 - 148)
- New Principal Balance: 90,148 UGX (100,000 - 9,852)

The system should automatically perform these calculations for every payment.

---

*Document Version: 1.0*  
*Date: February 2026*  
*Status: Draft for Review*
