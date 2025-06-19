# Content Script Types Organization

This directory contains all TypeScript type definitions organized by category for the content script.

## 📁 File Structure

```
types/
├── index.ts          # Main re-export file
├── dom.ts            # DOM and positioning types
├── widget.ts         # Widget and positioning types
├── actions.ts        # Action types
├── components.ts     # React component prop types
├── hooks.ts          # Hook types
└── README.md         # This file
```

## 🎯 Type Categories

### 1. **DOM Types** (`dom.ts`)
DOM manipulation and positioning related types:
- `Position` - x,y coordinates for positioning
- `WindowDimensions` - window size dimensions

### 2. **Widget Types** (`widget.ts`)
Widget and positioning specific types:
- `InitialPositions` - initial positioning for widget and icon

### 3. **Action Types** (`actions.ts`)
Action and event handling types:
- `CustomAction` - custom action definition with handler

### 4. **Component Types** (`components.ts`)
React component prop types:
- `ContentAppProps` - main app component props
- `TerminalIconProps` - terminal icon component props

### 5. **Hook Types** (`hooks.ts`)
Hook-related types:
- `DragState` - drag state management

## 🔄 Import Patterns

### Import from Main Index (Recommended)
```typescript
import type { Position, CustomAction, ContentAppProps, DragState } from '../types';
```

### Import from Specific Files (For Tree Shaking)
```typescript
import type { Position } from '../types/dom';
import type { CustomAction } from '../types/actions';
import type { ContentAppProps } from '../types/components';
import type { DragState } from '../types/hooks';
```

## 📋 Currently Used Types

These are the types that are actually being used in the content script:

### From `dom.ts`:
- ✅ `Position` - Used in ContentApp.tsx, helper.ts, dragUtils.ts
- ✅ `WindowDimensions` - Used in helper.ts

### From `widget.ts`:
- ✅ `InitialPositions` - Used in helper.ts

### From `actions.ts`:
- ✅ `CustomAction` - Used in ContentApp.tsx

### From `components.ts`:
- ✅ `ContentAppProps` - Used in ContentApp.tsx
- ✅ `TerminalIconProps` - Used in TerminalIcon.tsx

### From `hooks.ts`:
- ✅ `DragState` - Used in ContentApp.tsx, dragUtils.ts

## 🚀 Benefits

1. **🎯 Focused Types** - Only includes types that are actually used
2. **📦 Organized Structure** - Types grouped by purpose and domain
3. **🔍 Easy Maintenance** - Clear separation of concerns
4. **⚡ Tree Shaking** - Import only what you need
5. **📚 Clear Documentation** - Each file has a specific purpose
6. **🔒 Type Safety** - Proper type constraints and validation

## 🔧 Adding New Types

When adding new types:

1. **Identify the category** - Choose the appropriate file based on the type's purpose
2. **Add the type definition** - Define the interface or type
3. **Export it** - Make sure it's exported from the file
4. **Import where needed** - Import from the main index or specific file

## 📝 Best Practices

- ✅ Use `import type` for type-only imports
- ✅ Import from main index for convenience
- ✅ Import from specific files for tree-shaking
- ✅ Keep types focused and minimal
- ✅ Document complex types with comments
- ✅ Use consistent naming conventions
- ✅ Remove unused types regularly 