package com.anikage.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.anikage.ui.theme.AnikageSpacing

// Emerald greenish tokens matching Anikage theme
private val SkeletonDeepGreen = Color(0xFF0A140F)
private val SkeletonCardGreen = Color(0xFF0F1C16)
private val SkeletonSurfaceGreen = Color(0xFF162B21)
private val SkeletonGlowGreen = Color(0xFF1E3D2F)
private val EmeraldAccent = Color(0xFF0CD68A)

/**
 * Modifier extension that applies a smooth travelling emerald-green shimmer highlight.
 */
fun Modifier.shimmerEffect(): Modifier = composed {
    val transition = rememberInfiniteTransition(label = "ShimmerTransition")
    val translateAnim by transition.animateFloat(
        initialValue = -600f,
        targetValue = 1800f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1300, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "ShimmerTranslate"
    )

    val shimmerColors = listOf(
        SkeletonCardGreen,
        SkeletonSurfaceGreen,
        SkeletonGlowGreen,
        SkeletonSurfaceGreen,
        SkeletonCardGreen
    )

    val brush = Brush.linearGradient(
        colors = shimmerColors,
        start = Offset(translateAnim - 400f, translateAnim - 400f),
        end = Offset(translateAnim + 400f, translateAnim + 400f)
    )

    background(brush = brush)
}

/**
 * Full-screen skeleton placeholder matching the desktop & native layout on app startup,
 * styled in Anikage's signature emerald green and deep dark tones.
 */
@Composable
fun HomeScreenSkeleton(
    modifier: Modifier = Modifier
) {
    val navBarsPadding = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding()
    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(SkeletonDeepGreen),
        contentPadding = PaddingValues(bottom = AnikageSpacing.ExtraLarge + navBarsPadding),
        userScrollEnabled = false
    ) {
        // Hero Section Skeleton (matching responsive hero slideshow)
        item {
            HeroSectionSkeleton()
        }

        item {
            Spacer(modifier = Modifier.height(AnikageSpacing.Medium))
        }

        // Continue Watching Row Skeleton
        item {
            SectionHeaderSkeleton(titleWidth = 150.dp, subtitleWidth = 200.dp)
            LazyRow(
                contentPadding = PaddingValues(horizontal = AnikageSpacing.Medium),
                horizontalArrangement = Arrangement.spacedBy(AnikageSpacing.Medium),
                userScrollEnabled = false
            ) {
                items(2) {
                    ContinueWatchingCardSkeleton()
                }
            }
            Spacer(modifier = Modifier.height(AnikageSpacing.Large))
        }

        // Trending Now Row Skeleton
        item {
            SectionHeaderSkeleton(titleWidth = 130.dp, subtitleWidth = 180.dp)
            LazyRow(
                contentPadding = PaddingValues(horizontal = AnikageSpacing.Medium),
                horizontalArrangement = Arrangement.spacedBy(AnikageSpacing.Medium),
                userScrollEnabled = false
            ) {
                items(4) {
                    AnimeCardSkeleton()
                }
            }
            Spacer(modifier = Modifier.height(AnikageSpacing.Large))
        }

        // Shounen & Action Row Skeleton
        item {
            SectionHeaderSkeleton(titleWidth = 160.dp, subtitleWidth = 220.dp)
            LazyRow(
                contentPadding = PaddingValues(horizontal = AnikageSpacing.Medium),
                horizontalArrangement = Arrangement.spacedBy(AnikageSpacing.Medium),
                userScrollEnabled = false
            ) {
                items(4) {
                    AnimeCardSkeleton()
                }
            }
        }
    }
}

/**
 * Hero Spotlight skeleton matching the responsive carousel with emerald aesthetic.
 */
@Composable
fun HeroSectionSkeleton(
    modifier: Modifier = Modifier
) {
    val configuration = androidx.compose.ui.platform.LocalConfiguration.current
    val isLandscape = configuration.orientation == android.content.res.Configuration.ORIENTATION_LANDSCAPE
    val screenHeight = configuration.screenHeightDp.dp
    val heroHeight = if (isLandscape) {
        (screenHeight * 0.82f).coerceIn(240.dp, 330.dp)
    } else {
        (screenHeight * 0.44f).coerceIn(310.dp, 420.dp)
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(heroHeight)
            .background(SkeletonDeepGreen)
    ) {
        // Background banner shimmer
        Box(
            modifier = Modifier
                .fillMaxSize()
                .shimmerEffect()
        )

        // Dark gradient scrim overlay with deep emerald tone
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Transparent,
                            SkeletonDeepGreen.copy(alpha = 0.7f),
                            SkeletonDeepGreen
                        ),
                        startY = 90f
                    )
                )
        )

        // Content placeholders aligned to bottom
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = AnikageSpacing.Medium, vertical = if (isLandscape) AnikageSpacing.Small else AnikageSpacing.Large),
            verticalArrangement = Arrangement.Bottom
        ) {
            // "Trending Now" Pill Placeholder with emerald glow
            Box(
                modifier = Modifier
                    .width(115.dp)
                    .height(20.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(EmeraldAccent.copy(alpha = 0.2f))
                    .shimmerEffect()
            )

            Spacer(modifier = Modifier.height(if (isLandscape) 6.dp else 12.dp))

            // Title Placeholder (Line 1 & Line 2)
            Box(
                modifier = Modifier
                    .width(260.dp)
                    .height(if (isLandscape) 22.dp else 30.dp)
                    .clip(RoundedCornerShape(6.dp))
                    .shimmerEffect()
            )
            Spacer(modifier = Modifier.height(if (isLandscape) 4.dp else 8.dp))
            Box(
                modifier = Modifier
                    .width(180.dp)
                    .height(if (isLandscape) 18.dp else 26.dp)
                    .clip(RoundedCornerShape(6.dp))
                    .shimmerEffect()
            )

            Spacer(modifier = Modifier.height(if (isLandscape) 6.dp else 14.dp))

            // Genre Chips Placeholder Row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(AnikageSpacing.Small)
            ) {
                Box(
                    modifier = Modifier
                        .width(60.dp)
                        .height(24.dp)
                        .clip(RoundedCornerShape(6.dp))
                        .shimmerEffect()
                )
                Box(
                    modifier = Modifier
                        .width(80.dp)
                        .height(24.dp)
                        .clip(RoundedCornerShape(6.dp))
                        .shimmerEffect()
                )
                Box(
                    modifier = Modifier
                        .width(68.dp)
                        .height(24.dp)
                        .clip(RoundedCornerShape(6.dp))
                        .shimmerEffect()
                )
            }

            Spacer(modifier = Modifier.height(18.dp))

            // Action Buttons Placeholder Row
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // "Watch Now" Button placeholder with emerald theme
                Box(
                    modifier = Modifier
                        .width(125.dp)
                        .height(42.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(EmeraldAccent.copy(alpha = 0.35f))
                        .shimmerEffect()
                )

                // "+ My List" Button placeholder
                Box(
                    modifier = Modifier
                        .width(96.dp)
                        .height(42.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .shimmerEffect()
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Pagination Controls Placeholder
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.End
            ) {
                repeat(5) { index ->
                    Box(
                        modifier = Modifier
                            .padding(horizontal = 2.dp)
                            .height(6.dp)
                            .width(if (index == 0) 20.dp else 6.dp)
                            .clip(CircleShape)
                            .shimmerEffect()
                    )
                }
            }
        }
    }
}

/**
 * Section Header skeleton (Title & Subtitle placeholder).
 */
@Composable
fun SectionHeaderSkeleton(
    titleWidth: androidx.compose.ui.unit.Dp = 140.dp,
    subtitleWidth: androidx.compose.ui.unit.Dp = 200.dp,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = AnikageSpacing.Medium, vertical = AnikageSpacing.Small)
    ) {
        Box(
            modifier = Modifier
                .width(titleWidth)
                .height(20.dp)
                .clip(RoundedCornerShape(4.dp))
                .shimmerEffect()
        )
        Spacer(modifier = Modifier.height(6.dp))
        Box(
            modifier = Modifier
                .width(subtitleWidth)
                .height(14.dp)
                .clip(RoundedCornerShape(4.dp))
                .shimmerEffect()
        )
    }
}

/**
 * Single vertical anime poster card skeleton (width 130dp, 3:4 aspect ratio) in emerald theme.
 */
@Composable
fun AnimeCardSkeleton(
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .width(130.dp)
            .clip(MaterialTheme.shapes.small)
            .background(SkeletonCardGreen)
            .padding(bottom = AnikageSpacing.Small)
    ) {
        // Poster Box (3:4 aspect ratio)
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(3f / 4f)
                .clip(MaterialTheme.shapes.small)
                .shimmerEffect()
        )

        Spacer(modifier = Modifier.height(10.dp))

        // Title line placeholder
        Box(
            modifier = Modifier
                .padding(horizontal = AnikageSpacing.Small)
                .width(100.dp)
                .height(14.dp)
                .clip(RoundedCornerShape(4.dp))
                .shimmerEffect()
        )

        Spacer(modifier = Modifier.height(6.dp))

        // Genre / subtext line placeholder
        Box(
            modifier = Modifier
                .padding(horizontal = AnikageSpacing.Small)
                .width(65.dp)
                .height(11.dp)
                .clip(RoundedCornerShape(3.dp))
                .shimmerEffect()
        )
    }
}

/**
 * Horizontal Continue Watching card skeleton (width 200dp, 16:9 aspect ratio) in emerald theme.
 */
@Composable
fun ContinueWatchingCardSkeleton(
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .width(200.dp)
            .clip(MaterialTheme.shapes.small)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(16f / 9f)
                .clip(MaterialTheme.shapes.small)
                .shimmerEffect()
        )
        Spacer(modifier = Modifier.height(8.dp))
        Box(
            modifier = Modifier
                .width(140.dp)
                .height(14.dp)
                .clip(RoundedCornerShape(4.dp))
                .shimmerEffect()
        )
    }
}
