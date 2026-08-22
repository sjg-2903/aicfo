# AI CFO & Financial Advisor for MSMEs - Frontend

A professional, production-ready fintech frontend application built with React, Vite, and TypeScript. This is the frontend for an intelligent financial advisory platform designed for Micro, Small, and Medium Enterprises (MSMEs).

## Features

- **Authentication System**: Secure login, registration, and password reset
- **Dashboard**: Real-time KPI monitoring with animated metrics
- **Financial Health**: Comprehensive financial indicators and scoring
- **Transaction Management**: Track income and expenses with advanced filtering
- **Invoice Management**: Create, manage, and track invoices
- **Expense Tracking**: Categorize and monitor business expenses
- **GST & Tax Management**: Track tax obligations and compliance
- **Loan Management**: Monitor loans and EMI schedules
- **Cash Flow Analysis**: Historical and forecasted cash flow visualization
- **Risk Analysis**: Identify and monitor financial risks
- **Loan Readiness**: Assess readiness for business financing
- **AI CFO Assistant**: Grounded financial chat with optional OpenAI or Google Gemini explanations and a deterministic fallback
- **Recommendations**: Complete, actionable financial summary shared between Dashboard and Recommendations
- **Alerts & Notifications**: Real-time financial alerts
- **Reports**: Generate comprehensive financial reports
- **Business Profile**: Manage business information and settings

## Technology Stack

- **Framework**: React 19.2.6
- **Build Tool**: Vite 7.3.2
- **Language**: TypeScript 5.9.3
- **Styling**: Tailwind CSS 4.1.17
- **HTTP Client**: Axios
- **State Management**: TanStack Query (React Query)
- **Form Management**: React Hook Form with Zod validation
- **Routing**: React Router v7
- **Charts**: Recharts
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Date Handling**: date-fns
- **AI Response Formatting**: react-markdown + remark-gfm (safe headings, lists and tables)

## Project Structure

```
src/
├── components/              # Reusable UI components
│   ├── KPICard.tsx
│   ├── StatusBadge.tsx
│   ├── Modal.tsx
│   ├── Toast.tsx
│   ├── LoadingSkeleton.tsx
│   └── ProtectedRoute.tsx
├── contexts/               # React contexts
│   └── AuthContext.tsx     # Authentication context
├── pages/                  # Page components
│   ├── Landing.tsx         # Landing page
│   ├── Login.tsx           # Login page
│   ├── Register.tsx        # Registration page
│   ├── ForgotPassword.tsx  # Password reset
│   ├── Dashboard.tsx       # Main dashboard
│   ├── FinancialHealth.tsx
│   ├── Transactions.tsx
│   ├── Invoices.tsx
│   ├── Expenses.tsx
│   ├── GST.tsx
│   ├── Loans.tsx
│   ├── CashFlow.tsx
│   ├── RiskAnalysis.tsx
│   ├── LoanReadiness.tsx
│   ├── AICFO.tsx           # AI CFO Assistant
│   ├── Recommendations.tsx
│   ├── Alerts.tsx
│   ├── Reports.tsx
│   ├── Profile.tsx
│   ├── Settings.tsx
│   └── NotFound.tsx        # 404 page
├── services/               # API service layer
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
├── lib/                    # Utility functions
│   └── axios.ts           # Axios client configuration
├── utils/
│   └── cn.ts             # Classname utility
├── contexts/
│   └── AuthContext.tsx    # Authentication context
├── App.tsx                # Main App component with routing
├── main.tsx              # React entry point
├── index.css             # Tailwind and global styles
└── vite-env.d.ts        # Vite environment types

```

## Laptop setup (frontend + backend + MongoDB Atlas)

See **[LOCAL_LAPTOP_SETUP.md](LOCAL_LAPTOP_SETUP.md)** for clone → Atlas URI → API → Vite in one place.

## Environment Setup

### Prerequisites
- Node.js 18+ and npm/yarn
- Backend API running (FastAPI)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd ai-cfo-frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Create environment file**
```bash
cp .env.example .env
```

4. **Update `.env` with your backend API URL**
```env
VITE_API_BASE_URL=http://localhost:8000
```

### Enable OpenAI or Google Gemini explanations (optional)

The frontend never needs an AI-provider key. Configure the provider only in the
backend:

```bash
cd backend
cp .env.example .env
```

Choose OpenAI:

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1-mini
```

Or Google Gemini:

```env
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

See [AI_PROVIDER_SETUP.md](AI_PROVIDER_SETUP.md) for complete setup, provider
selection, security notes, and troubleshooting. Then restart FastAPI. AI output
is always given priority: OpenAI is tried first, then Gemini as a failover, and
deterministic calculations/rules are used only when no key is configured or
every provider attempt fails. Responses expose an `engine` field
(`openai | gemini | deterministic`) so the UI can show which engine produced
chat answers, analysis narratives, recommendations, and summary bullets.
Image generation is not exposed.

## Development

### Start Development Server
```bash
npm run dev
```
The application will be available at `http://localhost:5173` (or the URL shown in terminal)

### Build for Production
```bash
npm run build
```
Generates optimized build in the `dist/` directory.

### Preview Production Build
```bash
npm run preview
```

## API Integration

### Authentication Flow

1. **Register** - POST `/api/auth/register`
   - Creates new user account
   - Returns access token

2. **Login** - POST `/api/auth/login`
   - Authenticates user credentials
   - Returns access token

3. **Get Current User** - GET `/api/auth/me`
   - Retrieves authenticated user profile
   - Requires Bearer token in Authorization header

4. **Logout** - POST `/api/auth/logout`
   - Invalidates current session

### API Client Configuration

The `src/lib/axios.ts` file configures the API client with:
- Base URL from `VITE_API_BASE_URL` environment variable
- Automatic bearer token injection in Authorization header
- Global error handling for 401 (unauthorized) responses
- Automatic redirect to login on token expiration

### Service Layer

All API communication goes through service modules in `src/services/`:

```typescript
// Example: Dashboard Service
import dashboardService from '@/services/dashboardService';

// Fetch KPI summary
const kpiData = await dashboardService.getKPISummary();

// Fetch revenue trend
const revenue = await dashboardService.getRevenueTrend(days: 30);
```

### Backend API Contracts

Each service module documents:
- HTTP method (GET, POST, PUT, DELETE)
- Endpoint path
- Query parameters
- Request body structure
- Response structure
- Authentication requirements
- Error responses

Example: `src/services/dashboardService.ts`

## Routing

Routes are managed in `src/App.tsx` using React Router v7:

### Public Routes
- `/` - Landing page
- `/login` - Login page
- `/register` - Registration page
- `/forgot-password` - Password reset

### Protected Routes (Authentication Required)
- `/dashboard` - Main dashboard
- `/financial-health` - Financial health analysis
- `/transactions` - Transaction management
- `/invoices` - Invoice management
- `/expenses` - Expense tracking
- `/gst` - GST & tax management
- `/loans` - Loan management
- `/cash-flow` - Cash flow analysis
- `/risk-analysis` - Risk analysis
- `/loan-readiness` - Loan readiness assessment
- `/ai-cfo` - AI CFO assistant
- `/recommendations` - Financial recommendations
- `/alerts` - Financial alerts
- `/reports` - Report generation
- `/profile` - Business profile
- `/settings` - Settings

## Authentication

### Protected Routes
The `ProtectedRoute` component wraps all authenticated pages and:
- Checks if user is authenticated
- Shows loading state while checking
- Redirects to login if not authenticated
- Allows access if authenticated

### Token Management
- Tokens are stored in `localStorage` as `access_token`
- Tokens are automatically added to all API requests
- Expired tokens trigger automatic logout and redirect to login

## State Management

### TanStack Query
Used for:
- Fetching and caching API data
- Automatic refetching and synchronization
- Mutation management
- Optimistic updates
- Error handling and retry logic

Example:
```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import transactionService from '@/services/transactionService';

// Query
const { data, isLoading, error } = useQuery({
  queryKey: ['transactions', page],
  queryFn: () => transactionService.getTransactions(page),
});

// Mutation
const { mutate, isPending } = useMutation({
  mutationFn: (data) => transactionService.createTransaction(data),
  onSuccess: () => {
    // Invalidate cache
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  },
});
```

### Context API
Used for:
- Authentication state (AuthContext)
- User profile information
- Authentication functions (login, logout, register)

## Form Handling

Uses React Hook Form with Zod validation:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('Invalid email'),
  amount: z.number().positive('Must be positive'),
});

function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}
    </form>
  );
}
```

## Components

### Reusable Components

- **KPICard** - Displays key performance indicator with trend
- **StatusBadge** - Shows status with color coding
- **Modal** - Dialog component
- **Toast** - Notification component
- **LoadingSkeleton** - Loading placeholder
- **ProtectedRoute** - Route guard for authenticated pages

All components are highly configurable and support theming through props.

## Styling

### Tailwind CSS
- Utility-first CSS framework
- Custom color scheme (blue as primary, green for positive, amber for warning, red for critical)
- Responsive design with mobile-first approach
- Dark mode ready

### CSS-in-JS
- Minimal use of CSS files
- Primarily Tailwind utility classes
- Custom animations in `src/index.css`

## Accessibility

- Semantic HTML elements
- ARIA labels where necessary
- Keyboard navigation support
- Visible focus states
- Color contrast compliance
- `prefers-reduced-motion` support

## Performance Optimization

- Code splitting with lazy-loaded routes
- Efficient re-renders with memoization
- Optimized image loading
- API response caching
- Minimized bundle size
- Production builds optimized

## Error Handling

### Global Error Handling
- 401 unauthorized responses redirect to login
- Network errors show user-friendly messages
- API errors are caught and displayed
- Toast notifications for error feedback

### Component-Level Error Handling
- Form validation with error messages
- Retry mechanisms for failed requests
- Fallback UI for loading states

## Deployment

### AWS S3 + CloudFront Deployment

1. **Build the application**
```bash
npm run build
```

2. **Upload to S3**
```bash
aws s3 sync dist/ s3://your-bucket-name --delete
```

3. **Configure CloudFront**
- Set S3 bucket as origin
- Configure cache policies
- Set index.html as default root object
- Enable gzip compression

4. **SPA Routing Configuration**
```json
// CloudFront error responses
{
  "ErrorCode": 404,
  "ResponsePagePath": "/index.html",
  "ResponseCode": 200
}
```

This ensures all 404s are redirected to index.html for proper React Router handling.

## Testing

### Unit Tests (Setup Required)
```bash
npm install --save-dev vitest @testing-library/react
npm test
```

### E2E Tests (Setup Required)
```bash
npm install --save-dev playwright
npx playwright test
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Security

- **No sensitive data in frontend**: API keys, credentials, and secrets are never stored in frontend
- **Environment variables**: Sensitive configs in environment, not hardcoded
- **XSS Prevention**: React escapes content by default
- **CSRF Protection**: Backend handles CSRF tokens
- **Secure storage**: Tokens stored in localStorage (or sessionStorage for higher security)
- **HTTPS Only**: All production deployments use HTTPS

## Monitoring & Analytics (Optional)

Can be integrated with:
- Sentry for error tracking
- Google Analytics for usage tracking
- LogRocket for session replay

## Troubleshooting

### Port Already in Use
```bash
npm run dev -- --port 5174
```

### Clear Cache and Reinstall
```bash
rm -rf node_modules package-lock.json
npm install
```

### Build Issues
```bash
npm run build -- --debug
```

### API Connection Issues
1. Verify backend is running
2. Check `VITE_API_BASE_URL` in `.env`
3. Check CORS configuration on backend
4. Verify network connectivity

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

Proprietary - AI CFO & Financial Advisor for MSMEs

## Support

For issues, questions, or support:
- Create an issue in the repository
- Contact the development team
- Check documentation in relevant service files

## Future Enhancements

- [ ] Real-time dashboard updates with WebSocket
- [ ] Advanced financial modeling
- [ ] Multi-currency support
- [ ] Mobile app (React Native)
- [ ] Offline mode
- [ ] Advanced charting options
- [ ] Custom report builder
- [ ] API webhooks
- [ ] Integration with accounting software
- [ ] Advanced AI features

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Status**: Production Ready
