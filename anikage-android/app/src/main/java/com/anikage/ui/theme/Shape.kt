package com.anikage.ui.theme

import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

// 1.4 Corner Radius (Shapes) & 1.3 Spacing tokens strictly matching DESIGN.md
val Shapes = Shapes(
    extraSmall = RoundedCornerShape(4.dp),  // ShapeSmall: tags, badges, chips
    small = RoundedCornerShape(8.dp),       // ShapeMedium: buttons, text fields, cards
    medium = RoundedCornerShape(16.dp),     // ShapeLarge: bottom sheets, dialogs, featured cards
    large = RoundedCornerShape(24.dp),      // ShapeExtraLarge: hero banners, pill containers
    extraLarge = CircleShape                // ShapeCircle: 50% avatars, icon buttons, FABs
)

object AnikageSpacing {
    val Tiny = 4.dp         // SpacingTiny
    val Small = 8.dp        // SpacingSmall
    val Medium = 16.dp      // SpacingMedium
    val Large = 24.dp       // SpacingLarge
    val ExtraLarge = 32.dp  // SpacingExtraLarge
}
