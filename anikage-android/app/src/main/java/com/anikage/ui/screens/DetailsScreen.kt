package com.anikage.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.runtime.collectAsState
import kotlinx.coroutines.launch
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.BorderStroke
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import coil.compose.AsyncImage
import com.anikage.data.plugins.PluginManager

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.IntOffset
import kotlin.math.roundToInt
import androidx.compose.runtime.mutableFloatStateOf

@Composable
fun DetailsScreen(
    showId: String = "demo-1",
    title: String = "BLEACH",
    imageUrl: String = "",
    tags: String = "Action • Adventure • Comedy",
    episodesCount: Int = 1181,
    onClose: () -> Unit = {},
    onWatchEp1: () -> Unit = {},
    onEpisodeClick: (String) -> Unit = {}
) {
    var dragOffsetY by remember { mutableFloatStateOf(0f) }
    val animatedOffsetY by animateFloatAsState(targetValue = dragOffsetY, label = "sheetDrag")

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.7f))
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null
            ) {
                onClose()
            },
        contentAlignment = Alignment.BottomCenter
    ) {
        
        var episodes by remember { mutableStateOf<List<String>>(emptyList()) }
        var isLoading by remember { mutableStateOf(true) }
        
        val context = androidx.compose.ui.platform.LocalContext.current
        val coroutineScope = androidx.compose.runtime.rememberCoroutineScope()
        val db = remember { com.anikage.data.local.AppDatabase.getDatabase(context) }
        val dao = remember { db.myListDao() }
        val isSaved by dao.isAnimeSaved(showId).collectAsState(initial = false)
        
        LaunchedEffect(showId, title, episodesCount) {
            isLoading = true
            try {
                val resolved = PluginManager.getInstance().resolveEpisodes(showId, title)
                if (resolved.isNotEmpty() && !(resolved.size == 1 && episodesCount > 1)) {
                    episodes = resolved
                } else if (episodesCount > 0) {
                    episodes = (1..episodesCount).map { it.toString() }
                } else {
                    episodes = resolved
                }
            } catch (e: Exception) {
                if (episodesCount > 0) {
                    episodes = (1..episodesCount).map { it.toString() }
                }
            } finally {
                isLoading = false
            }
        }

        val configuration = androidx.compose.ui.platform.LocalConfiguration.current
        val isLandscape = configuration.orientation == android.content.res.Configuration.ORIENTATION_LANDSCAPE

        // Modal Sheet with smooth swipe-down-to-dismiss & safe insets
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(if (isLandscape) 0.98f else 0.92f)
                .navigationBarsPadding()
                .offset { IntOffset(0, animatedOffsetY.roundToInt()) }
                .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
                .background(MaterialTheme.colorScheme.surface)
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null
                ) { /* Consume clicks so taps inside modal sheet don't dismiss */ }
        ) {
            // Visual Drag Handle (Pill)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 10.dp, bottom = 4.dp)
                    .pointerInput(Unit) {
                        detectVerticalDragGestures(
                            onDragEnd = {
                                if (dragOffsetY > 120f) {
                                    onClose()
                                } else {
                                    dragOffsetY = 0f
                                }
                            },
                            onDragCancel = {
                                dragOffsetY = 0f
                            },
                            onVerticalDrag = { _, dragAmount ->
                                dragOffsetY = (dragOffsetY + dragAmount).coerceAtLeast(0f)
                            }
                        )
                    },
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .width(44.dp)
                        .height(5.dp)
                        .clip(RoundedCornerShape(2.5.dp))
                        .background(Color.White.copy(alpha = 0.35f))
                )
            }

            // Header Section with swipe-down support
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = if (isLandscape) 16.dp else 24.dp, vertical = if (isLandscape) 6.dp else 12.dp)
                    .pointerInput(Unit) {
                        detectVerticalDragGestures(
                            onDragEnd = {
                                if (dragOffsetY > 120f) {
                                    onClose()
                                } else {
                                    dragOffsetY = 0f
                                }
                            },
                            onDragCancel = {
                                dragOffsetY = 0f
                            },
                            onVerticalDrag = { _, dragAmount ->
                                dragOffsetY = (dragOffsetY + dragAmount).coerceAtLeast(0f)
                            }
                        )
                    },
                verticalAlignment = Alignment.Top
            ) {
                val posterWidth = if (isLandscape) 75.dp else 96.dp
                val posterHeight = if (isLandscape) 105.dp else 135.dp

                // Poster
                if (imageUrl.isNotEmpty()) {
                    AsyncImage(
                        model = imageUrl,
                        contentDescription = title,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .width(posterWidth)
                            .height(posterHeight)
                            .clip(RoundedCornerShape(12.dp))
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .width(posterWidth)
                            .height(posterHeight)
                            .clip(RoundedCornerShape(12.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant)
                    )
                }

                Spacer(modifier = Modifier.width(if (isLandscape) 12.dp else 16.dp))

                Column(
                    modifier = Modifier.weight(1f)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Top
                    ) {
                        Text(
                            text = title,
                            style = if (isLandscape) MaterialTheme.typography.titleLarge else MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onBackground,
                            maxLines = 2,
                            overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f).padding(end = 8.dp)
                        )
                        IconButton(
                            onClick = onClose,
                            modifier = Modifier.size(24.dp)
                        ) {
                            Icon(
                                Icons.Default.Close,
                                contentDescription = "Close",
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(2.dp))
                    
                    Text(
                        text = tags,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                    )
                    
                    Spacer(modifier = Modifier.height(if (isLandscape) 4.dp else 8.dp))
                    
                    Text(
                        text = "${if (episodes.isNotEmpty()) episodes.size else episodesCount} episodes",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold
                    )
                    
                    Spacer(modifier = Modifier.height(if (isLandscape) 8.dp else 14.dp))
                    
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Button(
                            onClick = onWatchEp1,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.primary,
                                contentColor = Color.Black
                            ),
                            shape = RoundedCornerShape(50),
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
                        ) {
                            Icon(Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Watch Ep 1", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelLarge)
                        }

                        Surface(
                            color = if (isSaved) MaterialTheme.colorScheme.primary.copy(alpha = 0.2f) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                            shape = RoundedCornerShape(50),
                            border = BorderStroke(1.dp, if (isSaved) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant),
                            modifier = Modifier.clickable {
                                coroutineScope.launch {
                                    if (isSaved) {
                                        dao.deleteAnime(com.anikage.data.local.MyListEntity(id = showId, title = title, imageUrl = imageUrl))
                                    } else {
                                        dao.insertAnime(com.anikage.data.local.MyListEntity(id = showId, title = title, imageUrl = imageUrl))
                                    }
                                }
                            }
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    if (isSaved) Icons.Default.Close else Icons.Default.Add, 
                                    contentDescription = null, 
                                    tint = if (isSaved) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onBackground, 
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    if (isSaved) "Saved" else "My List", 
                                    color = if (isSaved) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onBackground, 
                                    fontWeight = FontWeight.Bold,
                                    style = MaterialTheme.typography.labelLarge
                                )
                            }
                        }
                    }
                }
            }

            // Episode Grid
            if (isLoading) {
                Box(modifier = Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                }
            } else if (episodes.isEmpty()) {
                val hasScrapers = com.anikage.data.plugins.PluginManager.getInstance().getPlugins().isNotEmpty()
                Box(modifier = Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                    Text(
                        text = if (hasScrapers) "No episodes found" else "No scrapers installed.\nGo to Settings to choose or add a scraper (.js)",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodyMedium,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                    )
                }
            } else {
                LazyVerticalGrid(
                    columns = GridCells.Adaptive(minSize = 64.dp),
                    contentPadding = PaddingValues(horizontal = 24.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                ) {
                    items(episodes) { ep ->
                        Box(
                            modifier = Modifier
                                .aspectRatio(1f)
                                .clip(RoundedCornerShape(12.dp))
                                .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f))
                                .clickable { 
                                    onEpisodeClick(ep) 
                                },
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = ep,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onBackground
                            )
                        }
                    }
                }
            }
        }
    }
}
