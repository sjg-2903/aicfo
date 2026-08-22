# AI CFO Frontend - Architecture Document

## System Overview

The AI CFO & Financial Advisor frontend is a modern, responsive React application built with Vite and TypeScript. It serves as the primary interface for Micro, Small, and Medium Enterprises (MSMEs) to manage their finances with AI-powered insights.

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Browser / Client                          │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │         React Application (React 19.2.6)              │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │                                                         │  │
│  │  ┌───────────────┐  ┌───────────────┐ ┌────────────┐ │  │
│  │  │   Pages       │  │ Components    │ │ Contexts   │ │  │
│  │  ├───────────────┤  ├───────────────┤ ├────────────┤ │  │
│  │  │• Landing      │  │• KPICard      │ │• AuthCtx   │ │  │
│  │  │• Dashboard    │  │• StatusBadge  │ │            │ │  │
│  │  │• Transactions │  │• Modal        │ │            │ │  │
│  │  │• Invoices     │  │• Toast        │ │            │ │  │
│  │  │• etc...       │  │• etc...       │ │            │ │  │
│  │  └───────────────┘  └───────────────┘ └────────────┘ │  │
│  │                                                         │  │
│  │  ┌──────────────────────────────────────────────────┐ │  │
│  │  │         Services Layer (API Integration)        │ │  │
│  │  ├──────────────────────────────────────────────────┤ │  │
│  │  │• authService          • dashboardService        │ │  │
│  │  │• transactionService   • invoiceService          │ │  │
│  │  │• expenseService       • gstService              │ │  │
│  │  │• loanService          • riskService             │ │  │
│  │  │• forecastService      • aiCfoService            │ │  │
│  │  │• recommendationService • alertService           │ │  │
│  │  │• reportService        • profileService          │ │  │
│  │  └──────────────────────────────────────────────────┘ │  │
│  │                                                         │  │
│  │  ┌──────────────────────────────────────────────────┐ │  │
│  │  │        State Management & Data Fetching         │ │  │
│  │  ├──────────────────────────────────────────────────┤ │  │
│  │  │• TanStack Query (React Query)                   │ │  │
│  │  │• Context API                                     │ │  │
│  │  │• Form State (React Hook Form)                   │ │  │
│  │  └──────────────────────────────────────────────────┘ │  │
│  │                                                         │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              Styling & Layout                         │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │• Tailwind CSS (Utility-first CSS)                     │  │
│  │• Custom animations (Framer Motion)                    │  │
│  │• Responsive design (Mobile-first)                     │  │
│  │• Dark mode support                                    │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                                │
└──────────────────────────────────────────────────────────────┘
                            │
                   HTTPS/REST API
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│              FastAPI Backend (Python)                         │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │         Authentication & Security                      │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │• JWT Token Management                                 │  │
│  │• OAuth2 Integration                                   │  │
│  │• Password Hashing (bcrypt)                            │  │
│  │• CORS Configuration                                   │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │         Financial Calculation Engine                   │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │• KPI Calculations                                      │  │
│  │• Financial Ratio Analysis                              │  │
│  │• Cash Flow Forecasting (ML)                            │  │
│  │• Risk Scoring Algorithm                                │  │
│  │• Loan Readiness Assessment                             │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │         AI/ML Integration                              │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │• OpenAI / Google Gemini Integration                    │  │
│  │• AI CFO Agent                                          │  │
│  │• Grounded AI CFO Narratives                            │  │
│  │• Recommendation Engine                                 │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │         Data Management                                │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │• MongoDB (NoSQL Database)                              │  │
│  │• Data Models                                           │  │
│  │• Data Validation                                       │  │
│  │• Transaction Management                                │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

## Application Structure

### Directory Organization

```
src/
├── components/           # Reusable UI components
│   ├── KPICard.tsx
│   ├── StatusBadge.tsx
│   ├── Modal.tsx
│   ├── Toast.tsx
│   ├── LoadingSkeleton.tsx
│   └── ProtectedRoute.tsx
│
├── contexts/            # React contexts
│   └── AuthContext.tsx  # Authentication state management
│
├── pages/               # Page components
│   ├── Landing.tsx
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── ForgotPassword.tsx
│   ├── Dashboard.tsx
│   ├── FinancialHealth.tsx
│   ├── Transactions.tsx
│   ├── Invoices.tsx
│   ├── Expenses.tsx
│   ├── GST.tsx
│   ├── Loans.tsx
│   ├── CashFlow.tsx
│   ├── RiskAnalysis.tsx
│   ├── LoanReadiness.tsx
│   ├── AICFO.tsx
│   ├── Recommendations.tsx
│   ├── Alerts.tsx
│   ├── Reports.tsx
│   ├── Profile.tsx
│   ├── Settings.tsx
│   └── NotFound.tsx
│
├── services/            # API service layer
│   ├── authService.ts
│   ├── dashboardService.ts
│   ├── transactionService.ts
│   ├── invoiceService.ts
│   ├── expenseService.ts
│   ├── gstService.ts
│   ├── loanService.ts
│   ├── forecastService.ts
│   ├── riskService.ts
│   ├── loanReadinessService.ts
│   ├── aiCfoService.ts
│   ├── recommendationService.ts
│   ├── alertService.ts
│   ├── reportService.ts
│   └── profileService.ts
│
├── lib/                 # Utility libraries
│   └── axios.ts        # Axios client configuration
│
├── utils/              # Utility functions
│   └── cn.ts          # Classname utility
│
├── App.tsx            # Main App component with routing
├── main.tsx          # React entry point
├── index.css         # Global styles and animations
└── vite-env.d.ts    # Vite environment types
```

## Core Technologies

### Frontend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.6 | UI framework |
| TypeScript | 5.9.3 | Type safety |
| Vite | 7.3.2 | Build tool |
| Tailwind CSS | 4.1.17 | Styling |
| React Router | ^7.0 | Routing |
| Axios | Latest | HTTP client |
| TanStack Query | Latest | Data fetching & caching |
| React Hook Form | Latest | Form management |
| Zod | Latest | Schema validation |
| Recharts | Latest | Charts & visualizations |
| Lucide React | Latest | Icons |
| Framer Motion | Latest | Animations |
| date-fns | Latest | Date utilities |

### Backend Stack (FastAPI)

| Technology | Purpose |
|------------|---------|
| FastAPI | Web framework |
| SQLAlchemy | ORM |
| Pydantic | Data validation |
| JWT | Authentication |
| MongoDB | NoSQL database |
| OpenAI / Google Gemini | Optional AI narrative services |
| AWS S3 | File storage |
| AWS Lambda | Serverless functions |

## Data Flow Architecture

### Authentication Flow

```
┌─────────────────────────────────────────────────────┐
│                    User Interface                    │
│           (Login/Register Component)                 │
└────────────────────┬────────────────────────────────┘
                     │ User credentials
                     ▼
┌─────────────────────────────────────────────────────┐
│              authService (Service)                   │
│        (API request wrapper)                         │
└────────────────────┬────────────────────────────────┘
                     │ POST /api/auth/login
                     ▼
┌─────────────────────────────────────────────────────┐
│         Axios Instance (lib/axios.ts)               │
│    (Interceptors, headers, error handling)          │
└────────────────────┬────────────────────────────────┘
                     │ HTTP Request
                     ▼
┌─────────────────────────────────────────────────────┐
│           FastAPI Backend                           │
│          POST /api/auth/login                       │
│    (Validate credentials, generate JWT)             │
└────────────────────┬────────────────────────────────┘
                     │ HTTP Response + JWT
                     ▼
┌─────────────────────────────────────────────────────┐
│         Axios Instance (Response)                   │
│    (Interceptors process token)                     │
└────────────────────┬────────────────────────────────┘
                     │ Token + User data
                     ▼
┌─────────────────────────────────────────────────────┐
│           AuthContext.Provider                      │
│    (Updates auth state, stores token)               │
└────────────────────┬────────────────────────────────┘
                     │ Update state
                     ▼
┌─────────────────────────────────────────────────────┐
│          Protected Route Component                  │
│         (Redirects to dashboard or login)           │
└─────────────────────────────────────────────────────┘
```

### Data Fetching Flow

```
┌──────────────────────────────────────────────────┐
│           React Component                         │
│       (Dashboard, Transactions, etc.)             │
└────────────────────┬─────────────────────────────┘
                     │ useQuery hook
                     ▼
┌──────────────────────────────────────────────────┐
│        TanStack Query (React Query)              │
│  (Cache management, deduplication, staling)      │
└────────────────────┬─────────────────────────────┘
                     │ Fetch if not cached
                     ▼
┌──────────────────────────────────────────────────┐
│           Service Layer Function                 │
│    (dashboardService.getKPISummary())            │
└────────────────────┬─────────────────────────────┘
                     │ Call API
                     ▼
┌──────────────────────────────────────────────────┐
│       Axios HTTP Client                          │
│   (Add auth header, handle errors)               │
└────────────────────┬─────────────────────────────┘
                     │ HTTP Request
                     ▼
┌──────────────────────────────────────────────────┐
│          FastAPI Backend                         │
│        GET /api/dashboard/summary                │
│    (Calculate KPIs, fetch from DB)               │
└────────────────────┬─────────────────────────────┘
                     │ JSON Response
                     ▼
┌──────────────────────────────────────────────────┐
│         Response Validation (Zod)                │
│    (Ensure data matches schema)                  │
└────────────────────┬─────────────────────────────┘
                     │ Validated data
                     ▼
┌──────────────────────────────────────────────────┐
│        TanStack Query Cache                      │
│    (Store result for future use)                 │
└────────────────────┬─────────────────────────────┘
                     │ Trigger re-render
                     ▼
┌──────────────────────────────────────────────────┐
│          React Component                         │
│      (Render with KPI data)                      │
└──────────────────────────────────────────────────┘
```

### Form Submission Flow

```
┌──────────────────────────────────────────────────┐
│         User Form Submission                     │
│      (Transaction, Invoice, Expense)             │
└────────────────────┬─────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────┐
│    React Hook Form - Form Validation             │
│        (Zod schema validation)                   │
└────────────────────┬─────────────────────────────┘
                     │ If valid
                     ▼
┌──────────────────────────────────────────────────┐
│      useMutation Hook (TanStack Query)           │
│    (Manage async request state)                  │
└────────────────────┬─────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────┐
│         Service Layer Mutation                   │
│    (transactionService.createTransaction())      │
└────────────────────┬─────────────────────────────┘
                     │ POST request
                     ▼
┌──────────────────────────────────────────────────┐
│          FastAPI Backend                         │
│     POST /api/transactions                       │
│ (Validate, save to DB, return created record)    │
└────────────────────┬─────────────────────────────┘
                     │ Response
                     ▼
┌──────────────────────────────────────────────────┐
│      onSuccess Callback                          │
│  (Invalidate cache, show toast notification)     │
└────────────────────┬─────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────┐
│      Query Cache Invalidation                    │
│  (TanStack Query refetches affected queries)     │
└────────────────────┬─────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────┐
│     React Component Re-renders                   │
│       (Shows new/updated data)                   │
└──────────────────────────────────────────────────┘
```

## State Management Strategy

### AuthContext (Global Auth State)

```typescript
{
  user: UserProfile | null,
  isAuthenticated: boolean,
  isLoading: boolean,
  login: (email, password) => Promise<void>,
  register: (email, password, business_name, owner_name) => Promise<void>,
  logout: () => Promise<void>,
  refreshUser: () => Promise<void>
}
```

**Usage:**
- Authentication status across the app
- User information display
- Protected route guards
- Logout functionality

### TanStack Query (Server State)

```typescript
// Example: Fetch dashboard data
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['dashboard', 'kpi-summary'],
  queryFn: () => dashboardService.getKPISummary(),
  staleTime: 5 * 60 * 1000, // 5 minutes
  retry: 1,
});

// Example: Mutation for creating transaction
const { mutate, isPending } = useMutation({
  mutationFn: (data) => transactionService.createTransaction(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ 
      queryKey: ['transactions'] 
    });
    toast.success('Transaction created');
  },
  onError: (error) => {
    toast.error(error.message);
  },
});
```

### Form State (React Hook Form)

```typescript
const {
  register,
  handleSubmit,
  formState: { errors, isSubmitting },
  watch,
  setValue,
} = useForm({
  resolver: zodResolver(schema),
  defaultValues: { ... },
});
```

## API Integration Architecture

### Service Layer Pattern

Each service module follows a consistent pattern:

```typescript
// Example: transactionService.ts
class TransactionService {
  // Queries (read operations)
  async getTransactions(...): Promise<TransactionListResponse> {
    return apiClient.get('/api/transactions', { params: {...} });
  }
  
  async getTransaction(id: string): Promise<Transaction> {
    return apiClient.get(`/api/transactions/${id}`);
  }
  
  // Mutations (write operations)
  async createTransaction(data): Promise<Transaction> {
    return apiClient.post('/api/transactions', data);
  }
  
  async updateTransaction(id, data): Promise<Transaction> {
    return apiClient.put(`/api/transactions/${id}`, data);
  }
  
  async deleteTransaction(id): Promise<void> {
    return apiClient.delete(`/api/transactions/${id}`);
  }
}
```

### Axios Client Configuration

```typescript
// lib/axios.ts
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: Add auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

## Component Architecture

### Reusable Components

All UI components are built with reusability and configuration in mind:

```typescript
// KPICard - Flexible KPI display
<KPICard
  title="Revenue"
  value={500000}
  format="currency"
  trend={15.5}
  trendLabel="vs last month"
  loading={isLoading}
  onClick={() => navigate('/revenue-details')}
/>

// StatusBadge - Status indicator
<StatusBadge
  status="paid"
  size="md"
  variant="outline"
/>

// Modal - Dialog component
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Create Transaction"
  size="md"
>
  {/* Form content */}
</Modal>

// Toast - Notification
useToast().addToast('Success!', 'success');
```

### Component Composition

```
App (Router)
├── Landing (Public)
├── Login (Public)
├── Register (Public)
├── ForgotPassword (Public)
└── ProtectedRoute (Auth Required)
    ├── Dashboard
    │   ├── KPICard
    │   ├── Chart
    │   └── FinancialHealthScore
    ├── Transactions
    │   ├── DataTable
    │   ├── FilterPanel
    │   └── Modal
    ├── Invoices
    │   ├── InvoiceList
    │   ├── InvoiceForm
    │   └── StatusBadge
    └── [Other Pages...]
```

## Styling Architecture

### Tailwind CSS Organization

- **Utility-first approach** - Use Tailwind classes directly
- **Component composition** - Combine utilities for reusable patterns
- **Responsive design** - Mobile-first with breakpoints
- **Color scheme**:
  - Primary: Blue (`blue-600`)
  - Success: Green (`green-600`)
  - Warning: Amber (`amber-600`)
  - Error: Red (`red-600`)
  - Neutral: Slate (`slate-*`)

### Custom Animations

Defined in `src/index.css`:
- Slide-in animations
- Fade animations
- Scale animations
- Reduced-motion support

## Security Architecture

### Frontend Security Measures

1. **Token Storage**
   - JWT stored in localStorage
   - Automatically sent in Authorization header
   - Cleared on logout

2. **Input Validation**
   - Zod schema validation on forms
   - Type-safe API contracts
   - Sanitized inputs

3. **CORS**
   - Backend handles CORS configuration
   - Frontend requests from allowed origins

4. **HTTPS**
   - All production traffic over HTTPS
   - CloudFront enforces HTTPS redirect

5. **XSS Prevention**
   - React escapes content by default
   - No dangerouslySetInnerHTML without sanitization

6. **No Sensitive Data**
   - API keys never in frontend
   - Backend handles all sensitive operations
   - Environment variables for configuration

## Performance Architecture

### Code Splitting

```typescript
// Lazy load routes for better initial load
const Dashboard = React.lazy(() => import('@/pages/Dashboard'));
const Transactions = React.lazy(() => import('@/pages/Transactions'));

// Suspense fallback
<Suspense fallback={<LoadingSkeleton />}>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
  </Routes>
</Suspense>
```

### Data Caching Strategy

```typescript
// TanStack Query caching
{
  queryKey: ['transactions', page, filters],
  queryFn: () => fetchTransactions(...),
  staleTime: 5 * 60 * 1000,      // 5 minutes
  gcTime: 10 * 60 * 1000,        // 10 minutes (garbage collect)
  retry: 1,                       // 1 retry on failure
}
```

### Render Optimization

- **Memoization**: Use React.memo for expensive components
- **useMemo**: Cache computed values
- **useCallback**: Stable function references
- **Key prop**: Proper list rendering

## Testing Architecture

### Unit Testing

```typescript
// Example: Component test with Vitest
import { render, screen } from '@testing-library/react';
import { KPICard } from '@/components/KPICard';

describe('KPICard', () => {
  it('displays the KPI value', () => {
    render(<KPICard title="Revenue" value={100000} />);
    expect(screen.getByText(/100000/)).toBeInTheDocument();
  });
});
```

### Integration Testing

```typescript
// Example: API integration test
describe('Dashboard', () => {
  it('fetches and displays KPI data', async () => {
    // Mock API response
    // Render component
    // Assert data displayed
  });
});
```

### E2E Testing

```typescript
// Example: Playwright E2E test
test('user can login and see dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'user@example.com');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
  await expect(page.locator('h1')).toContainText('Dashboard');
});
```

## Deployment Architecture

### Development Environment

```
npm run dev
↓
Vite Dev Server (localhost:5173)
↓
HMR (Hot Module Replacement)
↓
Live Updates
```

### Production Environment

```
npm run build
↓
dist/ (Optimized files)
↓
AWS S3 (Object storage)
↓
CloudFront CDN (Distribution)
↓
Global Edge Locations
↓
Browser
```

### CI/CD Pipeline

```
Git Push
↓
GitHub Actions
├── Install Dependencies
├── Run Tests
├── Build Project
├── Deploy to S3
└── Invalidate CloudFront
```

## Scalability Considerations

### Frontend Scalability

1. **Code Splitting** - Load code on demand
2. **Lazy Loading** - Load images/components when visible
3. **Caching** - Browser, CloudFront, and query caching
4. **CDN Distribution** - Serve from edge locations
5. **Compression** - Gzip for all assets

### Backend Integration

1. **API Rate Limiting** - Implement on backend
2. **Pagination** - For large datasets
3. **Filtering** - Backend-driven filtering
4. **Batch Operations** - Reduce API calls
5. **WebSocket** - For real-time updates (future)

## Monitoring & Analytics

### Frontend Monitoring

- Error tracking (Sentry)
- Performance monitoring (Web Vitals)
- Session replay (LogRocket)
- User analytics (Google Analytics)

### Backend Monitoring

- CloudWatch logs
- Performance metrics
- Error tracking
- Usage analytics

## Future Enhancements

1. **Real-time Updates**
   - WebSocket integration
   - Live dashboard updates
   - Push notifications

2. **Mobile App**
   - React Native version
   - Offline support
   - Native integrations

3. **Advanced Features**
   - Budgeting & forecasting
   - Scenario planning
   - Financial modeling
   - Integration marketplace

4. **AI Enhancements**
   - More sophisticated models
   - Custom recommendations
   - Natural language processing
   - Predictive analytics

5. **Collaboration**
   - Multi-user support
   - Role-based access
   - Team collaboration
   - Audit trails

---

**Last Updated**: 2024
**Version**: 1.0.0
**Status**: Production Ready
