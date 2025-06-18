# Content Script TypeScript Best Practices

## 🎯 TypeScript Configuration

### 1. **Strict Type Checking**
Enable strict mode in your `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

### 2. **Type Organization**
- ✅ **Centralized Types**: All types are defined in `types/index.ts`
- ✅ **Specific Interfaces**: Avoid `any` types, use specific interfaces
- ✅ **Generic Types**: Use generics for reusable components and functions

### 3. **Component Type Safety**
```typescript
// ✅ Good: Explicit prop types
interface ComponentProps {
  title: string;
  onAction: (id: string) => void;
  items?: string[];
}

// ✅ Good: Generic components
const ListComponent = <T extends { id: string }>({ items }: { items: T[] }) => {
  // Component logic
};
```

### 4. **Hook Type Safety**
```typescript
// ✅ Good: Explicit return types
export const useCustomHook = (): [State, SetState, Action] => {
  // Hook logic
  return [state, setState, action] as const;
};
```

### 5. **Event Handling**
```typescript
// ✅ Good: Typed event handlers
const handleClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
  event.preventDefault();
  // Handler logic
};
```

### 6. **API and Data Types**
```typescript
// ✅ Good: Generic API responses
interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

// ✅ Good: Specific data types
interface User {
  id: string;
  name: string;
  email: string;
}
```

## 🚀 Best Practices Checklist

- [ ] Use `interface` for object shapes, `type` for unions/primitives
- [ ] Avoid `any` - use `unknown` or specific types
- [ ] Use `readonly` for immutable data
- [ ] Leverage `Partial<T>`, `Pick<T>`, `Omit<T>` utility types
- [ ] Use `as const` for literal types
- [ ] Define return types for functions
- [ ] Use generic constraints where appropriate
- [ ] Handle null/undefined explicitly
- [ ] Use branded types for type safety
- [ ] Document complex types with JSDoc

## 🔧 Common Patterns

### Position Management
```typescript
interface Position {
  top: number;
  left: number;
}

const isValidPosition = (pos: Position): boolean => {
  return pos.top >= 0 && pos.left >= 0;
};
```

### Event Handling
```typescript
type EventHandler<T = Event> = (event: T) => void;
type MouseEventHandler = EventHandler<MouseEvent>;
```

### State Management
```typescript
type StateAction<T> = T | ((prev: T) => T);
const [state, setState] = useState<StateType>(initialValue);
```

## 📝 Code Style Guidelines

1. **Import Types**: Use `import type` for type-only imports
2. **Export Types**: Export types from centralized location
3. **Naming**: Use PascalCase for interfaces, camelCase for types
4. **Comments**: Document complex type relationships
5. **Consistency**: Use consistent patterns across components

## 🛠️ Development Tools

- **ESLint**: Configure TypeScript-specific rules
- **Prettier**: Format TypeScript code consistently
- **TypeScript ESLint**: Enable strict TypeScript linting
- **VSCode Extensions**: TypeScript Importer, Error Lens 