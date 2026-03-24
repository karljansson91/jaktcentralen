# UI Library

Import app-facing UI primitives from `@/components/ui`.

```ts
import { Badge, Button, Card, CardContent, IconButton, Input, Label, Text } from '@/components/ui';
```

Available primitives:

- `Badge`
- `Button`
- `Card`, `CardContent`, `CardDescription`, `CardFooter`, `CardHeader`, `CardTitle`
- `IconButton`
- `Input`
- `Label`
- `Separator`
- `Text`

When adding new shared UI components, export them from `components/ui/index.ts` so the app keeps a single import surface.
