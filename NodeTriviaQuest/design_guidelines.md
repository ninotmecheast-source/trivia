# Trivia Server Design Guidelines

## Design Approach
**System-Based Approach**: Using Material Design principles for a content-focused, interactive gaming experience that prioritizes usability and clear feedback mechanisms.

## Core Design Elements

### Color Palette
**Light Mode:**
- Primary: 268 100% 45% (vibrant purple for interactive elements)
- Surface: 0 0% 98% (clean backgrounds)
- Text: 0 0% 15% (high contrast readability)

**Dark Mode:**
- Primary: 268 80% 60% (adjusted purple for dark backgrounds)
- Surface: 220 15% 12% (rich dark background)
- Text: 0 0% 95% (optimal contrast)

**Accent Colors:**
- Success: 142 76% 36% (correct answers)
- Error: 0 84% 60% (incorrect answers)
- Warning: 38 92% 50% (timing alerts)

### Typography
- **Primary**: Inter (via Google Fonts)
- **Secondary**: JetBrains Mono (for scores/timers)
- Scale: text-sm, text-base, text-lg, text-xl, text-2xl, text-3xl

### Layout System
**Spacing Units**: Consistent use of Tailwind units 2, 4, 6, and 8
- Micro spacing: p-2, m-2
- Standard spacing: p-4, m-4, gap-4
- Section spacing: p-6, m-6
- Large spacing: p-8, m-8

### Component Library

**Game Interface:**
- Question cards with elevated shadows and rounded corners
- Multiple choice buttons with hover states and selection feedback
- Progress indicators showing question number and score
- Timer component with visual countdown

**Navigation & Layout:**
- Clean header with game title and current score
- Category selection grid with icon representations
- Results modal with animated score reveal
- Restart/new game controls

**Interactive Elements:**
- Primary buttons for game actions (Start Game, Next Question)
- Secondary buttons for navigation (Back to Menu, Change Category)
- Answer option buttons with clear selected/unselected states
- Loading states for question fetching

**Feedback Systems:**
- Immediate visual feedback for correct/incorrect answers
- Score animation on answer selection
- Progress bar showing game completion
- Success/error toast notifications

### Game Flow Design
1. **Welcome Screen**: Clean intro with category selection grid
2. **Game Interface**: Focused question presentation with minimal distractions
3. **Results Screen**: Clear score display with replay options

### Responsive Considerations
- Mobile-first approach with touch-friendly button sizes
- Responsive grid for category selection
- Readable text sizing across all devices
- Optimized spacing for various screen sizes

### Visual Hierarchy
- Question text as primary focus (largest, bold)
- Answer options as secondary (medium, clear distinction)
- Score/progress as tertiary (smaller, positioned strategically)
- Clear visual separation between game elements

This design emphasizes clarity, immediate feedback, and an engaging but not overwhelming gaming experience suitable for users of all ages.