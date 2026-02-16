# GitHub Copilot Instructions for ChoreQuest

## Project Overview

**ChoreQuest** (formerly ChoreChampion) is a comprehensive family chore management application that gamifies daily tasks for children while providing parents with powerful management tools. The application uses a multi-tenant architecture with MySQL backend, supporting features like:

- Child-friendly tablet interface for chore completion
- Parent dashboard with comprehensive controls
- Points & rewards system with multiple categories
- Advanced scheduling (daily, weekly, rotational, time-based)
- Real-time progress tracking and celebrations
- Email notifications and parent invitations
- Stripe subscription management
- PWA support with offline capabilities
- Docker-based deployment

## Tech Stack

### Frontend
- **Framework**: React 19.0 with TypeScript 5.9.3
- **Build Tool**: Vite 7.2.6
- **Router**: React Router DOM 7.13.0
- **UI Framework**: 
  - Radix UI components (extensive collection)
  - Tailwind CSS 4.1.11 with custom theme system
  - Framer Motion for animations
  - Lucide React & Phosphor Icons
- **State Management**: 
  - React hooks (useState, useEffect, useContext)
  - Custom hooks in `@/hooks/`
  - TanStack React Query for API state
- **Forms**: React Hook Form with Zod validation
- **Key Libraries**:
  - date-fns for date handling
  - uuid for ID generation
  - recharts for data visualization
  - @dnd-kit for drag-and-drop

### Backend (Server Directory)
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **Database**: MySQL 8.0 with mysql2 driver
- **Authentication**: JWT with bcrypt
- **Email**: Nodemailer for SMTP
- **Payments**: Stripe SDK
- **Rate Limiting**: express-rate-limit

### Infrastructure
- **Containerization**: Docker with docker-compose
- **Reverse Proxy**: Nginx (configured in nginx.conf)
- **Database**: MySQL 8.0
- **Deployment**: Supports VPS, cloud platforms, Docker environments

## Project Structure

```
/
├── .github/              # GitHub workflows and configuration
├── src/                  # Frontend React application
│   ├── components/       # React components (UI and feature components)
│   ├── contexts/         # React context providers (e.g., AuthContext)
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility libraries and helpers
│   └── styles/           # CSS and styling files
├── server/               # Backend Express.js API
│   └── src/
│       ├── config/       # Configuration files
│       ├── middleware/   # Express middleware
│       ├── routes/       # API route handlers
│       ├── services/     # Business logic and services
│       └── utils/        # Utility functions
├── public/               # Static assets
├── scripts/              # Build and deployment scripts
├── mysql-init/           # Database initialization scripts
└── [docs].md            # Extensive documentation files
```

## Coding Conventions & Standards

### TypeScript & React

1. **Component Structure**
   - Use functional components with hooks
   - Place interfaces/types at the top of files
   - Export components as default when single export, named for utilities
   - Component file names use PascalCase (e.g., `ChildSelector.tsx`)

2. **State Management**
   - Use `useState` for local component state
   - Use context providers for shared state (see `AuthContext`)
   - Custom hooks for reusable logic (prefix with `use-`)
   - Use TanStack Query for server state

3. **Type Safety**
   - Define explicit types for all props, state, and function parameters
   - Avoid `any` - use `unknown` or proper types
   - Leverage discriminated unions for complex state
   - Use Zod for runtime validation

4. **Imports**
   - Use path alias `@/` for src imports (configured in tsconfig.json)
   - Group imports: external deps, @/ imports, relative imports
   - Example: `import { Button } from '@/components/ui/button'`

5. **Naming Conventions**
   - Components: PascalCase (e.g., `ChildChoreView`)
   - Functions: camelCase (e.g., `handleChoreComplete`)
   - Constants: UPPER_SNAKE_CASE (e.g., `MAX_PIN_ATTEMPTS`)
   - Interfaces/Types: PascalCase with descriptive names
   - CSS classes: kebab-case or Tailwind utilities

### UI Components

1. **Radix UI Usage**
   - Prefer Radix UI primitives from `@radix-ui/react-*`
   - Wrap in custom components in `src/components/ui/`
   - Use compound components pattern
   - Ensure accessibility (ARIA labels, keyboard navigation)

2. **Styling**
   - Use Tailwind CSS utilities as primary styling method
   - Custom CSS variables defined in theme for colors
   - OKLCH color space for consistent perceptual brightness
   - Responsive design with mobile-first approach
   - Theme system supports seasonal/weather-based themes

3. **Animation**
   - Use Framer Motion for complex animations
   - CSS animations for simple transitions
   - Celebration effects use canvas-based animations
   - Keep animations performant and optional

### Backend (Express/Node)

1. **API Structure**
   - RESTful endpoints in `server/src/routes/`
   - Business logic in `server/src/services/`
   - Middleware for auth, validation, rate limiting
   - Use async/await for all async operations

2. **Database**
   - Raw SQL queries using mysql2
   - Connection pooling for performance
   - Parameterized queries to prevent SQL injection
   - Transaction support for multi-step operations
   - Multi-tenant isolation using `tenant_id`

3. **Security**
   - JWT authentication with token refresh
   - bcrypt for password hashing
   - Rate limiting on sensitive endpoints
   - Input validation on all endpoints
   - CORS configuration for production
   - Environment-based secrets management

4. **Error Handling**
   - Use try-catch blocks for async operations
   - Return consistent error response format
   - Log errors with appropriate detail level
   - Don't expose sensitive info in error messages

## Key Features & Implementation Patterns

### Multi-Tenant Architecture
- All database tables include `tenant_id` for isolation
- JWT tokens contain tenant context
- Middleware enforces tenant boundaries
- Shared families use invitation system

### Authentication Flow
- Login/register through Express backend
- JWT stored in localStorage
- AuthContext provides user state to React app
- Protected routes check authentication status
- Device registration for IP restrictions

### Points & Rewards System
- Multiple point categories (e.g., "Regular", "Extra")
- Category-specific expiry rules (daily, weekly, monthly, never)
- Completion bonuses for finishing all chores in category
- Point swapping between categories
- Transaction history tracking

### Chore Scheduling
- Complex repeat patterns: daily, weekly, specific days
- Time-based scheduling (AM/PM, specific time ranges)
- Rotational chores (automatic child rotation)
- Per-child chore assignments
- Optional start/end dates

### Data Persistence
- Backend API endpoints for all data operations
- Custom `use-api-kv` hook abstracts API calls
- Real-time updates through polling or manual refresh
- Offline support with service worker caching

## Common Patterns

### Custom Hooks
```typescript
// Pattern for API data hooks
export function useChores() {
  const { get, set } = useKV('chores', []);
  // Hook implementation
}
```

### Component Composition
```typescript
// Compound component pattern
<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <DialogHeader>Title</DialogHeader>
    {/* content */}
  </DialogContent>
</Dialog>
```

### Form Handling
```typescript
// React Hook Form with Zod
const schema = z.object({
  name: z.string().min(1)
});
const form = useForm({
  resolver: zodResolver(schema)
});
```

## Testing Strategy

**Current State**: The project does not have a formal test suite. Testing is primarily manual through:
- Test scripts in root directory (e.g., `test-api.sh`, `test-multi-tenant.sh`)
- Manual testing via dev environment
- Docker-based integration testing

**When Adding Tests**:
- Follow existing bash test script patterns
- Test critical paths: auth, chore completion, points calculation
- Consider API endpoint testing
- Test multi-tenant isolation
- Validate security controls

## Best Practices

### Performance
- Use React.memo for expensive renders
- Debounce user input handlers
- Lazy load routes and heavy components
- Optimize images and assets
- Monitor bundle size with Vite analysis

### Accessibility
- Use semantic HTML
- Include ARIA labels on interactive elements
- Ensure keyboard navigation works
- Maintain sufficient color contrast
- Support screen readers

### Security
- Never commit secrets or API keys
- Use environment variables for configuration
- Validate all user inputs
- Sanitize data before database operations
- Follow OWASP best practices
- Regular dependency updates via Dependabot

### Code Quality
- Run `npm run lint` before committing
- Keep functions small and focused
- Write self-documenting code with clear names
- Add JSDoc comments for complex logic
- Avoid deeply nested conditionals

## Development Workflow

### Local Development
```bash
# Frontend dev server
npm run dev

# Backend dev server (server directory)
cd server && npm run dev

# Docker development environment
docker-compose -f docker-compose.dev.yml up
```

### Building
```bash
# Frontend build
npm run build

# Backend build
cd server && npm run build

# Docker production build
docker-compose -f docker-compose.prod.yml build
```

### Database Migrations
- Migration scripts in `server/src/utils/`
- Run via `npm run migrate` in server directory
- Version tracked in database

## Important Context

### Feature-Specific Notes

**Weather & Seasonal Themes**
- Open-Meteo API for weather data
- Automatic temperature unit detection
- Theme engine uses OKLCH colors
- Updates every 15 minutes

**Subscription System**
- Stripe integration for payments
- Webhook handling for subscription events
- Metered billing support
- Multi-tenant subscription isolation

**Email System**
- Nodemailer with SMTP configuration
- Parent invitation emails with 7-day expiry
- Purchase notifications
- Digest mode for batched emails

**Device Restrictions**
- IP-based access control
- Device registration and approval flow
- Override PIN for authorized devices
- Welcome page for unauthorized access

**PWA Support**
- Service worker for offline functionality
- Install prompts for mobile devices
- App manifest configuration
- Background sync capabilities

### Common Pitfalls to Avoid

1. **Multi-Tenancy**: Always filter by `tenant_id` in database queries
2. **Time Zones**: Use UTC for storage, convert for display
3. **Point Expiry**: Account for category-specific expiry rules
4. **Rotational Chores**: Maintain rotation order and state
5. **Authentication**: Check token expiry and refresh tokens
6. **Type Safety**: Don't bypass TypeScript with `as any`
7. **State Updates**: Use functional updates for derived state

## Documentation

The project has extensive documentation in markdown files:
- `PRD.md` - Full product requirements
- `README.md` - Setup and deployment instructions
- `DOCKER_DEPLOYMENT.md` - Docker-specific deployment
- Feature-specific guides (e.g., `ROTATIONAL_CHORES_GUIDE.md`)
- Refer to these docs for detailed feature specifications

## Environment Variables

Key environment variables (see `.env.example`):
- `NODE_ENV` - Environment mode
- `CHOREQUEST_PORT` - Application port
- `MYSQL_*` - Database configuration
- `JWT_SECRET` - Authentication secret
- `STRIPE_*` - Payment integration
- `SMTP_*` - Email configuration
- `VITE_API_URL` - Frontend API endpoint

## Additional Resources

- Component library: Radix UI documentation
- Styling: Tailwind CSS documentation
- API reference: Express.js and MySQL2 docs
- Deployment: Docker and docker-compose docs

---

**Note for Copilot**: When generating code, prioritize:
1. Type safety and proper TypeScript usage
2. Consistency with existing patterns
3. Security best practices (especially for multi-tenant isolation)
4. Accessibility and user experience
5. Performance and optimization
6. Clear, maintainable code structure
