# AI CFO Frontend - Quick Start Guide

Get the AI CFO & Financial Advisor frontend running in minutes.

## Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** 8+ (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))
- **Backend API** running (FastAPI server at localhost:8000)

## 1. Clone & Install

```bash
# Clone repository
git clone <repository-url>
cd ai-cfo-frontend

# Install dependencies
npm install
```

## 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your backend URL
# VITE_API_BASE_URL=http://localhost:8000
```

## 3. Start Development Server

```bash
npm run dev
```

The application will open at `http://localhost:5173`

## 4. Try the Application

### Demo Flow

1. **Landing Page** (`http://localhost:5173/`)
   - See product overview
   - Click "Get Started" or "Login"

2. **Register** (`/register`)
   - Create test account
   - Fill: Business Name, Owner Name, Email, Password
   - Submit to create account

3. **Dashboard** (`/dashboard`)
   - View KPI cards (revenue, expenses, profit, cash balance)
   - See charts and financial health score
   - Requires active backend API

4. **Explore Modules**
   - Click sidebar items to explore features
   - Try different financial modules
   - Test responsive design on mobile

### Test Credentials (If Using Demo Backend)

```
Email: demo@example.com
Password: demo123
```

## 5. API Integration

The frontend communicates with FastAPI backend using REST APIs.

### Current Status

- ✅ **Frontend**: Complete and fully functional
- ⏳ **Backend**: Needs implementation (endpoints listed in API_DOCUMENTATION.md)
- ✅ **Integration**: Ready for connection

### What Backend Needs to Implement

Backend should provide these endpoints:

**Authentication** (Required)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

**Dashboard** (Required)
- `GET /api/dashboard/summary`
- `GET /api/dashboard/revenue-trend`
- `GET /api/dashboard/cash-flow-trend`
- `GET /api/dashboard/financial-health-score`

See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for complete endpoint specifications.

## 6. Build for Production

```bash
# Create optimized production build
npm run build

# Preview production build locally
npm run preview
```

Generated files in `dist/` folder ready for S3/CloudFront deployment.

## 7. Deploy to AWS

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## File Structure Quick Reference

```
src/
├── pages/          # Page components (Dashboard, Transactions, etc.)
├── components/     # Reusable UI components
├── services/       # API service layer
├── contexts/       # Auth state management
├── lib/            # Utilities (Axios client)
└── utils/          # Helper functions
```

## Common Tasks

### Add a New Page

1. Create `src/pages/NewPage.tsx`
2. Add route in `src/App.tsx`
3. Add navigation item in sidebar
4. Import services as needed

### Create a Service

1. Create `src/services/newService.ts`
2. Define TypeScript interfaces
3. Document API contract
4. Export service instance

### Add a Component

1. Create `src/components/NewComponent.tsx`
2. Make it configurable with props
3. Handle loading/error states
4. Export as default

### Use TanStack Query

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import transactionService from '@/services/transactionService';

// Fetch data
const { data, isLoading } = useQuery({
  queryKey: ['transactions'],
  queryFn: () => transactionService.getTransactions(),
});

// Mutate data
const { mutate } = useMutation({
  mutationFn: (data) => transactionService.createTransaction(data),
  onSuccess: () => {
    // Refetch or update cache
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  },
});
```

### Add Form Validation

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  amount: z.number().positive('Must be positive'),
  description: z.string().min(3, 'Minimum 3 characters'),
});

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
});
```

## Troubleshooting

### Port Already in Use

```bash
npm run dev -- --port 5174
```

### Build Fails

```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### API Connection Issues

1. Check backend is running on `http://localhost:8000`
2. Verify `.env` file has correct `VITE_API_BASE_URL`
3. Check browser console for error messages
4. Verify CORS is enabled on backend

### Styling Issues

```bash
# Rebuild Tailwind CSS
npm install
npm run dev
```

## Authentication Flow

1. **Register**: User creates account with business details
2. **Login**: User authenticates with email/password
3. **Token**: Backend returns JWT token
4. **Storage**: Token stored in localStorage
5. **Protected Routes**: Only logged-in users can access

## Key Features

- ✅ Responsive design (desktop, tablet, mobile)
- ✅ Dark mode ready
- ✅ Real-time form validation
- ✅ Error handling & user feedback
- ✅ Loading states & animations
- ✅ Type-safe (TypeScript)
- ✅ Performance optimized (code splitting, lazy loading)
- ✅ Accessible (WCAG 2.1)

## Development Workflow

1. **Feature branch**: `git checkout -b feature/your-feature`
2. **Make changes**: Edit code in `src/`
3. **Test locally**: `npm run dev`
4. **Build**: `npm run build`
5. **Commit**: `git commit -m "Add feature"`
6. **Push**: `git push origin feature/your-feature`
7. **PR**: Create Pull Request

## Resources

- 📖 [README.md](README.md) - Full documentation
- 🏗️ [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
- 📋 [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - API contracts
- 🚀 [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment

## Getting Help

### Documentation
- Check README.md for comprehensive documentation
- Review ARCHITECTURE.md for system design
- Look at API_DOCUMENTATION.md for API contracts

### Code Examples
- Check component files for usage examples
- Look at service modules for API integration patterns
- Review existing pages for common patterns

### Common Issues
- **Login fails**: Check API is running and CORS configured
- **Data not loading**: Check network tab in browser dev tools
- **Styling issues**: Clear browser cache and rebuild

## Next Steps

1. ✅ Install dependencies
2. ✅ Configure environment
3. ✅ Start dev server
4. ✅ Register/Login
5. ✅ Explore dashboard
6. ✅ Review code structure
7. ✅ Implement backend endpoints
8. ✅ Test integration
9. ✅ Deploy to production

## Tech Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| **UI Framework** | React | 19.2.6 |
| **Build Tool** | Vite | 7.3.2 |
| **Language** | TypeScript | 5.9.3 |
| **Styling** | Tailwind CSS | 4.1.17 |
| **Routing** | React Router | ^7.0 |
| **State Management** | Context API + TanStack Query | Latest |
| **Form Handling** | React Hook Form | Latest |
| **HTTP Client** | Axios | Latest |
| **Charts** | Recharts | Latest |
| **Icons** | Lucide React | Latest |

## Support

For issues, questions, or contributions:
1. Check documentation first
2. Review existing code examples
3. Create an issue with details
4. Contact development team

---

**Version**: 1.0.0
**Status**: Production Ready
**Last Updated**: 2024

Happy coding! 🚀
