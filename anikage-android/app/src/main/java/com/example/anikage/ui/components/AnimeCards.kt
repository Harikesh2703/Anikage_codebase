package com.example.anikage.ui.components

import android.content.res.Configuration
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.foundation.clickable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.anikage.ui.theme.AnikageSpacing
import com.example.anikage.ui.theme.AnikageTheme
import coil.compose.AsyncImage
import androidx.compose.ui.layout.ContentScale

data class AnimeItem(
    val id: String,
    val title: String,
    val genres: List<String>,
    val imageUrl: String = "",
    val bannerUrl: String = "",
    val description: String = "",
    val episodeInfo: String? = null,
    val progress: Float = 0f,
    val totalEpisodes: Int = 0
)

/**
 * Reusable vertical anime poster card (3:4 aspect ratio) used across carousel rows
 */
@Composable
fun AnimePosterCard(
    anime: AnimeItem,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .width(130.dp)
            .clip(MaterialTheme.shapes.small)
            .clickable(onClick = onClick)
            .background(MaterialTheme.colorScheme.surface)
            .padding(bottom = AnikageSpacing.Small)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(3f / 4f)
                .clip(MaterialTheme.shapes.small)
                .background(MaterialTheme.colorScheme.surfaceVariant),
            contentAlignment = Alignment.BottomStart
        ) {
            val imgUrl = anime.imageUrl.takeIf { it.isNotBlank() && it != "null" }
                ?: anime.bannerUrl.takeIf { it.isNotBlank() && it != "null" } ?: ""
            if (imgUrl.isNotEmpty()) {
                AsyncImage(
                    model = imgUrl,
                    contentDescription = anime.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
            }
            // Simulated gradient overlay for title legibility
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.8f))
                        )
                    )
            )
            Text(
                text = anime.title,
                style = MaterialTheme.typography.titleMedium.copy(fontSize = 14.sp),
                color = MaterialTheme.colorScheme.onBackground,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(horizontal = AnikageSpacing.Small, vertical = 4.dp)
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = anime.genres.joinToString(" • "),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(horizontal = AnikageSpacing.Small)
        )
    }
}

/**
 * Landscape episode card (16:9 aspect ratio) used in "Continue Watching"
 */
@Composable
fun ContinueWatchingCard(
    anime: AnimeItem,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .width(200.dp)
            .clip(MaterialTheme.shapes.small)
            .clickable(onClick = onClick)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(16f / 9f)
                .clip(MaterialTheme.shapes.small)
                .background(MaterialTheme.colorScheme.surfaceVariant),
            contentAlignment = Alignment.Center
        ) {
            val imgUrl = anime.bannerUrl.takeIf { it.isNotBlank() && it != "null" }
                ?: anime.imageUrl.takeIf { it.isNotBlank() && it != "null" } ?: ""
            if (imgUrl.isNotEmpty()) {
                AsyncImage(
                    model = imgUrl,
                    contentDescription = anime.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
            }
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.85f))
                        )
                    )
            )
            // Play Button Icon (appears over the image)
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(androidx.compose.foundation.shape.CircleShape)
                    .background(MaterialTheme.colorScheme.primary),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Filled.PlayArrow,
                    contentDescription = "Play",
                    tint = Color.Black,
                    modifier = Modifier.size(24.dp)
                )
            }
            
            Column(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .fillMaxWidth()
                    .padding(AnikageSpacing.Small)
            ) {
                anime.episodeInfo?.let { ep ->
                    Text(
                        text = ep,
                        style = MaterialTheme.typography.labelSmall.copy(fontSize = 11.sp),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(bottom = 2.dp)
                    )
                }
                Text(
                    text = anime.title,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(8.dp))
                
                // Progress Bar
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(4.dp)
                        .clip(androidx.compose.foundation.shape.CircleShape)
                        .background(Color.White.copy(alpha = 0.15f))
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(anime.progress)
                            .fillMaxHeight()
                            .clip(androidx.compose.foundation.shape.CircleShape)
                            .background(MaterialTheme.colorScheme.primary)
                    )
                }
            }
        }
    }
}

/**
 * Genre Chip adhering to Section 2.3 of DESIGN.md
 */
@Composable
fun GenreChip(
    name: String,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier,
        color = MaterialTheme.colorScheme.surfaceVariant,
        shape = MaterialTheme.shapes.extraSmall
    ) {
        Text(
            text = name,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.padding(
                horizontal = AnikageSpacing.Small,
                vertical = AnikageSpacing.Tiny
            )
        )
    }
}

@Preview(uiMode = Configuration.UI_MODE_NIGHT_YES)
@Composable
fun AnimeCardsPreview() {
    AnikageTheme {
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            AnimePosterCard(
                anime = AnimeItem("1", "BLEACH", listOf("Action", "Adventure")),
                onClick = {}
            )
            ContinueWatchingCard(
                anime = AnimeItem("2", "Toumei na Yoru ni ...", emptyList(), episodeInfo = "Episode 7"),
                onClick = {}
            )
        }
    }
}
