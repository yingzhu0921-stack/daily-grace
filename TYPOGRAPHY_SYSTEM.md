# Typography System Documentation

## Overview

A hybrid typography system that allows users to quickly apply preset styles or customize typography in detail.

## Architecture

### Component Structure

```
src/
├── types/
│   └── typography.ts           # Type definitions and preset data
├── hooks/
│   └── useTypography.ts        # Typography state management hook
└── components/
    ├── TypographyEditor.tsx          # Main editor component
    ├── TypographyPresetCard.tsx      # Preset selection card
    ├── TypographyCustomControls.tsx  # Advanced controls panel
    └── VerseCardEditor.tsx           # Example usage
```

## Usage

### Basic Implementation

```tsx
import { VerseCardEditor } from './components/VerseCardEditor';

function App() {
  return <VerseCardEditor />;
}
```

### Custom Integration

```tsx
import { TypographyEditor } from './components/TypographyEditor';
import { useTypography } from './hooks/useTypography';

function MyCardEditor() {
  const { typography, updateTypography, getCSSStyle } = useTypography();
  const [text, setText] = useState('Your verse here');

  return (
    <div>
      {/* Your card preview */}
      <div style={getCSSStyle()}>
        {text}
      </div>

      {/* Typography controls */}
      <TypographyEditor
        typography={typography}
        onTypographyChange={updateTypography}
      />
    </div>
  );
}
```

## State Management

### Typography State Structure

```ts
{
  mode: 'preset' | 'custom',
  presetId?: string,
  style: {
    fontFamily: string,
    fontSize: number,
    lineHeight: number,
    letterSpacing: number,
    textAlign: 'left' | 'center' | 'right',
    shadow: boolean,
    textBg: boolean,
    shadowConfig?: {...},
    textBgConfig?: {...}
  }
}
```

### Mode Transitions

1. **Default**: User starts in `preset` mode
2. **Selecting Preset**: Remains in `preset` mode, updates `presetId` and `style`
3. **Customize Button**: Shows custom controls but doesn't change mode yet
4. **Editing Controls**: Switches to `custom` mode, clears `presetId`
5. **Reset**: Returns to default preset mode

## Presets

### Built-in Presets

1. **따뜻한 손글씨** (handwritten-warm)
   - Handwritten font with shadow
   - Large size, relaxed spacing
   - Center aligned

2. **묵상 세리프** (meditation-serif)
   - Serif font with text background
   - Medium size, wide line height
   - Center aligned

3. **미니멀 산스** (minimal-sans)
   - Clean sans-serif
   - No effects, tight spacing
   - Center aligned

4. **강조 타이틀** (emphasis-title)
   - Bold display font
   - Shadow + background
   - Large size, center aligned

5. **고요한 묵상** (quiet-contemplation)
   - Traditional serif
   - Left aligned, wide spacing
   - No effects

### Adding Custom Presets

Edit `src/types/typography.ts`:

```ts
export const TYPOGRAPHY_PRESETS: TypographyPreset[] = [
  // ... existing presets
  {
    id: 'my-custom-preset',
    name: '나만의 스타일',
    preview: '미리보기 텍스트',
    style: {
      fontFamily: "'Your Font', sans-serif",
      fontSize: 24,
      lineHeight: 1.5,
      letterSpacing: 0,
      textAlign: 'center',
      shadow: false,
      textBg: false,
    },
  },
];
```

## Custom Controls

### Available Controls

- **Font Family**: Dropdown with predefined fonts
- **Font Size**: 14px - 48px slider
- **Line Height**: 1.0 - 3.0 slider
- **Letter Spacing**: -2px - 5px slider
- **Text Alignment**: Left / Center / Right buttons
- **Shadow**: Toggle switch
- **Text Background**: Toggle switch

### Extending Controls

To add more controls, edit `TypographyCustomControls.tsx`:

```tsx
// Example: Add color picker
<div>
  <label>텍스트 색상</label>
  <input
    type="color"
    value={style.color}
    onChange={(e) => onChange({ color: e.target.value })}
  />
</div>
```

## Styling

The system uses Tailwind CSS classes. Key customization points:

- **Preset Cards**: `.border-blue-500` (selected state)
- **Controls Panel**: `.bg-gray-50` (background)
- **Buttons**: `.bg-blue-500` (primary color)

## Best Practices

### For Users

1. **Start with Presets**: Browse and select a preset first
2. **Fine-tune if Needed**: Click "Customize" only if preset doesn't fit
3. **Reset Option**: Use "프리셋으로 초기화" to go back

### For Developers

1. **Preserve Mode**: Always set `mode: 'custom'` when user edits any control
2. **Copy Preset Style**: When switching presets, deep copy the style object
3. **CSS Generation**: Use `getCSSStyle()` hook for consistent rendering
4. **Validation**: Validate font family availability in browser

## API Reference

### `useTypography` Hook

```ts
const {
  typography,        // Current typography state
  updateTypography,  // Update state function
  resetTypography,   // Reset to default
  getCSSStyle,       // Get React.CSSProperties object
} = useTypography(initialState?);
```

### `TypographyEditor` Props

```ts
interface TypographyEditorProps {
  typography: TypographyState;
  onTypographyChange: (typography: TypographyState) => void;
}
```

## Migration Guide

### Integrating into Existing Project

1. Copy files to your project
2. Install dependencies (if not already present):
   ```bash
   npm install react react-dom
   # Tailwind CSS setup if needed
   ```

3. Import Google Fonts in your `index.html`:
   ```html
   <link href="https://fonts.googleapis.com/css2?family=Nanum+Pen+Script&family=Noto+Serif+KR&family=Noto+Sans+KR&family=Black+Han+Sans&family=Nanum+Myeongjo&family=Jua&display=swap" rel="stylesheet">
   ```

4. Use in your component:
   ```tsx
   import { VerseCardEditor } from './components/VerseCardEditor';
   ```

## Troubleshooting

### Fonts Not Loading

Add font imports to your HTML or CSS:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=..." rel="stylesheet">
```

### Tailwind Classes Not Working

Ensure Tailwind is configured and component paths are in `content`:
```js
// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  // ...
}
```

### TypeScript Errors

Check that all types are properly imported from `types/typography.ts`

## Future Enhancements

Potential features to add:

- [ ] Color picker for text/shadow/background
- [ ] Font weight control
- [ ] Text transform (uppercase, lowercase)
- [ ] Custom shadow/background configurations in UI
- [ ] Preset import/export
- [ ] Favorite presets
- [ ] Preset search/filter
- [ ] Animation presets
- [ ] Responsive font sizing
