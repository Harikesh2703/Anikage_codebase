# Anikage Design System

This document serves as the single source of truth for the Anikage Android app's design system. All Jetpack Compose UI components should strictly adhere to the tokens and guidelines defined here.

## 1. Design Tokens

### 1.1 Color Palette

We primarily use a dark, immersive theme suitable for video streaming and anime content, accented with vibrant colors.

| Token Name | Hex Value | Usage |
| :--- | :--- | :--- |
| `Primary` | `#10B981` | Primary brand color, main calls-to-action (CTAs), active states |
| `PrimaryVariant` | `#059669` | Hover states, pressed states for primary buttons |
| `Secondary` | `#8B5CF6` | Secondary accents, tags, badges |
| `Background` | `#0F172A` | Main app background |
| `Surface` | `#1E293B` | Cards, bottom sheets, dialogs, floating action buttons |
| `SurfaceVariant` | `#334155` | Search bars, input fields, unselected tabs |
| `Error` | `#EF4444` | Destructive actions, error messages, form validation errors |
| `OnPrimary` | `#FFFFFF` | Text/icons on Primary background |
| `OnSecondary` | `#FFFFFF` | Text/icons on Secondary background |
| `OnBackground` | `#F8FAFC` | Main body text, headings |
| `OnSurface` | `#E2E8F0` | Secondary text, subtitles |
| `OnSurfaceVariant` | `#94A3B8` | Placeholder text, disabled text, unselected icons |

### 1.2 Typography

We use **Inter** (or the default system sans-serif font) for a clean, modern look. 

| Token | Font Size | Font Weight | Line Height | Letter Spacing | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `DisplayLarge` | `32.sp` | Bold (700) | `40.sp` | `-1.sp` | Hero titles, main screen headers |
| `TitleLarge` | `24.sp` | SemiBold (600) | `32.sp` | `0.sp` | App bar titles, section headers |
| `TitleMedium` | `20.sp` | Medium (500) | `28.sp` | `0.15.sp`| Card titles, dialog headers |
| `BodyLarge` | `16.sp` | Normal (400) | `24.sp` | `0.5.sp` | Standard body text, list items |
| `BodyMedium` | `14.sp` | Normal (400) | `20.sp` | `0.25.sp`| Secondary text, descriptions |
| `LabelLarge` | `14.sp` | Medium (500) | `20.sp` | `0.1.sp` | Button text, tabs |
| `LabelSmall` | `12.sp` | Medium (500) | `16.sp` | `0.5.sp` | Badges, tags, captions, metadata |

### 1.3 Spacing

Consistent spacing is critical for visual rhythm. All spacing values are multiples of `4.dp`.

| Token | Value | Usage |
| :--- | :--- | :--- |
| `SpacingTiny` | `4.dp` | Between icon and text inside a chip |
| `SpacingSmall` | `8.dp` | Between list items, inner card padding |
| `SpacingMedium` | `16.dp` | Standard screen edge padding, default margin |
| `SpacingLarge` | `24.dp` | Section spacing, between major UI groups |
| `SpacingExtraLarge`| `32.dp` | Bottom spacing above FABs or main navigation |

### 1.4 Corner Radius (Shapes)

| Token | Value | Usage |
| :--- | :--- | :--- |
| `ShapeSmall` | `4.dp` | Tags, badges, small chips |
| `ShapeMedium` | `8.dp` | Buttons, text fields, standard cards |
| `ShapeLarge` | `16.dp` | Bottom sheets, dialogs, large featured cards |
| `ShapeExtraLarge`| `24.dp` | Hero banners |
| `ShapeCircle` | `50%` | Avatars, icon buttons, FABs |

### 1.5 Elevation (Shadows/Surface Tonal Elevation)

| Token | Tonal Elevation (Compose) | Usage |
| :--- | :--- | :--- |
| `ElevationLevel0` | `0.dp` | Standard background elements |
| `ElevationLevel1` | `2.dp` | Cards, unselected chips |
| `ElevationLevel2` | `4.dp` | Top App Bar, Bottom Navigation Bar |
| `ElevationLevel3` | `6.dp` | Floating Action Buttons (FABs) |
| `ElevationLevel4` | `8.dp` | Menus, Dialogs |
| `ElevationLevel5` | `12.dp` | Bottom Sheets |

---

## 2. Component Guidelines

When building Jetpack Compose components, always map them to the tokens defined above.

### 2.1 Buttons
*   **Primary Button:** Uses `Primary` for background, `OnPrimary` for text, `ShapeMedium` for corner radius. Padding should be `SpacingMedium` horizontally and `SpacingSmall` vertically. Text uses `LabelLarge`.
*   **Secondary Button:** Uses transparent background with a `1.dp` border of `PrimaryVariant`, text is `Primary`.
*   **Disabled State:** Opacity reduced to `0.38`.

### 2.2 Anime Cards
*   **Background:** `Surface`.
*   **Corner Radius:** `ShapeMedium`.
*   **Image Aspect Ratio:** `3:4` (Portrait for anime posters) or `16:9` (for episodes).
*   **Title text:** `TitleMedium` using `OnBackground` color.
*   **Metadata (Year, Status):** `BodyMedium` using `OnSurface` color.

### 2.3 Tags/Genres
*   **Background:** `SurfaceVariant`.
*   **Text Color:** `OnSurface`.
*   **Text Style:** `LabelSmall`.
*   **Corner Radius:** `ShapeSmall`.
*   **Padding:** `SpacingTiny` vertically, `SpacingSmall` horizontally.

### 2.4 Text Fields (Search)
*   **Background:** `SurfaceVariant`.
*   **Text Color:** `OnBackground`.
*   **Placeholder Color:** `OnSurfaceVariant`.
*   **Corner Radius:** `ShapeMedium`.
*   **Icons:** Use `OnSurfaceVariant` for leading/trailing icons.

---

## 3. Dark Mode & Theming Note

The primary focus of Anikage is an immersive, dark-first experience. If a Light Mode is implemented in the future, the primary background should become a soft off-white (`#F8FAFC`), while surfaces change to pure white (`#FFFFFF`), and text colors invert. Primary and Secondary accents should remain largely the same.

---

## 4. Code Generation Instructions (for Stitch / AI)

When generating Jetpack Compose code based on this document, adhere to the following rules:

1.  **Use Material 3 (M3):** Map the tokens defined in Section 1 directly to `androidx.compose.material3.MaterialTheme` parameters (`colorScheme`, `typography`, `shapes`). Do not use hardcoded hex values in UI component files; always reference `MaterialTheme.colorScheme.*` or `MaterialTheme.typography.*`.
2.  **Stateless Composables:** Generate UI components as stateless functions by default (pass state and event callbacks as parameters). For example: `fun AnimeCard(anime: Anime, onClick: () -> Unit, modifier: Modifier = Modifier)`.
3.  **Modifiers:** Always accept a `modifier: Modifier = Modifier` as the first optional parameter in every composable function to ensure reusability.
4.  **Previews:** Always include `@Preview` annotations for generated components. Include at least a dark mode preview (`@Preview(uiMode = Configuration.UI_MODE_NIGHT_YES)`).
5.  **Icons:** Use standard Material Icons (`androidx.compose.material.icons`) unless specified otherwise.
6.  **Scaffolding:** When generating a full screen, use the M3 `Scaffold` composable to manage app bars, FABs, and bottom navigation naturally.
