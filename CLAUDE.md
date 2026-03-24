<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->

## Navigation

- **Always use Expo Router routes for modals** — never use the React Native `<Modal>` component. Define modal screens in the route layout with `presentation: 'modal'` and navigate to them with `router.push()`. This gives proper deep linking, back button support, and native transitions for free.
## Forms

- Use `@tanstack/react-form` (`useForm` + `form.Field`) for all larger forms. Do not use manual `useState` per field.

## Styling

- Always use NativeWind `className` for styling.
- Exception: `@rnmapbox/maps` components (`MapView`, `ShapeSource`, layers) require inline `style` props. Children of `PointAnnotation` (regular RN Views) can use `className`.
