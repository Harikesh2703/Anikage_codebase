package com.anikage.ui.screens


import android.content.res.Configuration
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.tween
import com.anikage.ui.components.HomeScreenSkeleton
import com.anikage.ui.components.HeroSectionSkeleton
import com.anikage.ui.components.AnimeItem
import com.anikage.ui.components.AnimePosterCard
import com.anikage.ui.components.ContinueWatchingCard
import com.anikage.ui.components.GenreChip
import com.anikage.ui.theme.AnikageSpacing
import com.anikage.ui.theme.AnikageTheme
import com.anikage.data.plugins.PluginManager
import kotlinx.coroutines.launch
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import coil.compose.AsyncImage
import androidx.compose.ui.layout.ContentScale

@Composable
fun HomeScreen(
    modifier: Modifier = Modifier,
    onAnimeClick: (AnimeItem) -> Unit = {},
    onWatchClick: (AnimeItem, String) -> Unit = { _, _ -> }
) {
    val coroutineScope = rememberCoroutineScope()
    var trendingAnime by remember { mutableStateOf<List<AnimeItem>>(emptyList()) }
    var actionAnime by remember { mutableStateOf<List<AnimeItem>>(emptyList()) }
    var solAnime by remember { mutableStateOf<List<AnimeItem>>(emptyList()) }
    var fantasyAnime by remember { mutableStateOf<List<AnimeItem>>(emptyList()) }
    var continueWatching by remember { mutableStateOf<List<AnimeItem>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }

    val context = androidx.compose.ui.platform.LocalContext.current
    val lifecycleOwner = androidx.compose.ui.platform.LocalLifecycleOwner.current

    // Reload continue watching on resume
    androidx.compose.runtime.DisposableEffect(lifecycleOwner) {
        val observer = androidx.lifecycle.LifecycleEventObserver { _, event ->
            if (event == androidx.lifecycle.Lifecycle.Event.ON_RESUME) {
                continueWatching = com.anikage.data.history.WatchHistoryRepository.getContinueWatching(context)
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    LaunchedEffect(Unit) {
        continueWatching = com.anikage.data.history.WatchHistoryRepository.getContinueWatching(context)
        val pluginManager = PluginManager.getInstance()
        pluginManager.init(context) // Initialize QuickJS plugins in background

        try {
            val catalogRepo = com.anikage.data.catalog.CatalogRepository.getInstance()
            
            val tList = catalogRepo.getCatalog(null, 20, sort = "TRENDING_DESC")
            val aList = catalogRepo.getCatalog("Action", 20, sort = "POPULARITY_DESC")
            val sList = catalogRepo.getCatalog("Slice of Life", 20, sort = "SCORE_DESC")
            val fList = catalogRepo.getCatalog("Fantasy", 20, sort = "FAVOURITES_DESC")

            val seenIds = mutableSetOf<String>()
            fun mapToUi(items: List<com.anikage.data.plugins.AnimeItem>): List<AnimeItem> {
                val list = mutableListOf<AnimeItem>()
                for (it in items) {
                    if (seenIds.add(it.id)) {
                        list.add(
                            AnimeItem(
                                id = it.id,
                                title = it.name,
                                genres = it.genres,
                                imageUrl = it.thumbnail,
                                bannerUrl = it.banner,
                                description = it.description,
                                totalEpisodes = it.episodes
                            )
                        )
                    }
                }
                return list
            }

            trendingAnime = mapToUi(tList)
            actionAnime = mapToUi(aList)
            solAnime = mapToUi(sList)
            fantasyAnime = mapToUi(fList)

            // Fallback to active scraper if offline or catalog empty
            if (trendingAnime.isEmpty()) {
                val activeScraper = pluginManager.getActiveScraper()
                if (activeScraper != null) {
                    val liveData = activeScraper.getTrending()
                    trendingAnime = mapToUi(liveData)
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            isLoading = false
        }
    }

    val db = remember { com.anikage.data.local.AppDatabase.getDatabase(context) }

    Crossfade(
        targetState = isLoading,
        animationSpec = tween(durationMillis = 350),
        modifier = modifier
    ) { loading ->
        if (loading) {
            HomeScreenSkeleton()
        } else {
            val navBarsPadding = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding()
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.background),
                contentPadding = PaddingValues(bottom = AnikageSpacing.ExtraLarge + navBarsPadding)
            ) {
        // Spotlight / Hero Section (dynamic slides with 7s timer)
        item {
            HeroSpotlightSection(
                slides = trendingAnime.take(6),
                onWatchNow = { anime -> onWatchClick(anime, "1") },
                onAddToList = { anime ->
                    coroutineScope.launch {
                        val entity = com.anikage.data.local.MyListEntity(
                            id = anime.id,
                            title = anime.title,
                            imageUrl = anime.imageUrl.ifEmpty { anime.bannerUrl }
                        )
                        db.myListDao().insertAnime(entity)
                        android.widget.Toast.makeText(context, "Added to My List", android.widget.Toast.LENGTH_SHORT).show()
                    }
                }
            )
        }

        // Continue Watching Section (only if user has watch history)
        if (continueWatching.isNotEmpty()) {
            item {
                SectionHeader(
                    title = "Continue Watching",
                    subtitle = "Resume where you left off"
                )
                LazyRow(
                    contentPadding = PaddingValues(horizontal = AnikageSpacing.Medium),
                    horizontalArrangement = Arrangement.spacedBy(AnikageSpacing.Medium)
                ) {
                    items(continueWatching) { item ->
                        val epNumber = item.episodeInfo?.replace("Episode ", "")?.trim() ?: "1"
                        ContinueWatchingCard(
                            anime = item,
                            onClick = { onWatchClick(item, epNumber) }
                        )
                    }
                }
                Spacer(modifier = Modifier.height(AnikageSpacing.Large))
            }
        }

        // Trending Now Section
        if (trendingAnime.isNotEmpty()) {
            item {
                SectionHeader(
                    title = "Trending Now",
                    subtitle = "What everyone is watching"
                )
                LazyRow(
                    contentPadding = PaddingValues(horizontal = AnikageSpacing.Medium),
                    horizontalArrangement = Arrangement.spacedBy(AnikageSpacing.Medium)
                ) {
                    items(trendingAnime) { item ->
                        AnimePosterCard(
                            anime = item,
                            onClick = { onAnimeClick(item) },
                            modifier = Modifier.width(130.dp)
                        )
                    }
                }
                Spacer(modifier = Modifier.height(AnikageSpacing.Large))
            }
        }

        // Shounen & Action Section
        if (actionAnime.isNotEmpty()) {
            item {
                SectionHeader(
                    title = "Shounen & Action",
                    subtitle = "The blades everyone is talking about"
                )
                LazyRow(
                    contentPadding = PaddingValues(horizontal = AnikageSpacing.Medium),
                    horizontalArrangement = Arrangement.spacedBy(AnikageSpacing.Medium)
                ) {
                    items(actionAnime) { item ->
                        AnimePosterCard(
                            anime = item,
                            onClick = { onAnimeClick(item) },
                            modifier = Modifier.width(130.dp)
                        )
                    }
                }
                Spacer(modifier = Modifier.height(AnikageSpacing.Large))
            }
        }

        // Slice of Life Section
        if (solAnime.isNotEmpty()) {
            item {
                SectionHeader(
                    title = "Slice of Life",
                    subtitle = "Slow afternoons, warm hearts"
                )
                LazyRow(
                    contentPadding = PaddingValues(horizontal = AnikageSpacing.Medium),
                    horizontalArrangement = Arrangement.spacedBy(AnikageSpacing.Medium)
                ) {
                    items(solAnime) { item ->
                        AnimePosterCard(
                            anime = item,
                            onClick = { onAnimeClick(item) },
                            modifier = Modifier.width(130.dp)
                        )
                    }
                }
                Spacer(modifier = Modifier.height(AnikageSpacing.Large))
            }
        }

        // Fantasy & Supernatural Section
        if (fantasyAnime.isNotEmpty()) {
            item {
                SectionHeader(
                    title = "Fantasy & Supernatural",
                    subtitle = "Neon skies and ancient spirits"
                )
                LazyRow(
                    contentPadding = PaddingValues(horizontal = AnikageSpacing.Medium),
                    horizontalArrangement = Arrangement.spacedBy(AnikageSpacing.Medium)
                ) {
                    items(fantasyAnime) { item ->
                        AnimePosterCard(
                            anime = item,
                            onClick = { onAnimeClick(item) },
                            modifier = Modifier.width(130.dp)
                        )
                    }
                }
            }
        }
    }
}
}
}

@Composable
fun HeroSpotlightSection(
    slides: List<AnimeItem>,
    onWatchNow: (AnimeItem) -> Unit,
    onAddToList: (AnimeItem) -> Unit,
    modifier: Modifier = Modifier
) {
    if (slides.isEmpty()) {
        HeroSectionSkeleton(modifier = modifier)
        return
    }

    var currentIndex by remember { androidx.compose.runtime.mutableIntStateOf(0) }

    // Ensure valid index if slides list changes
    if (currentIndex >= slides.size) {
        currentIndex = 0
    }

    val currentAnime = slides[currentIndex]

    // 7-second auto advance timer (Desktop matching)
    LaunchedEffect(currentIndex, slides.size) {
        if (slides.size > 1) {
            kotlinx.coroutines.delay(7000)
            currentIndex = (currentIndex + 1) % slides.size
        }
    }

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
            .background(Color(0xFF1E293B))
    ) {
        val heroImg = currentAnime.bannerUrl.takeIf { it.isNotBlank() && it != "null" }
            ?: currentAnime.imageUrl.takeIf { it.isNotBlank() && it != "null" } ?: ""
            
        if (heroImg.isNotEmpty()) {
            AsyncImage(
                model = heroImg,
                contentDescription = currentAnime.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )
        }

        // Gradient overlay to fade smoothly into background
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Transparent,
                            MaterialTheme.colorScheme.background.copy(alpha = 0.6f),
                            MaterialTheme.colorScheme.background
                        )
                    )
                )
        )

        // Hero Info Overlay
        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(horizontal = AnikageSpacing.Medium, vertical = if (isLandscape) AnikageSpacing.Small else AnikageSpacing.Large)
        ) {
            // "• TRENDING NOW" badge
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.primary)
                )
                Text(
                    text = "TRENDING NOW",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                )
            }

            Spacer(modifier = Modifier.height(4.dp))

            // Dynamic Main Title (scales down gracefully in landscape or on compact displays)
            Text(
                text = currentAnime.title,
                style = MaterialTheme.typography.displayLarge.copy(fontSize = if (isLandscape) 24.sp else 30.sp),
                color = MaterialTheme.colorScheme.onBackground,
                fontWeight = FontWeight.Bold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(if (isLandscape) 4.dp else 8.dp))

            // Dynamic Genre Chips - horizontally scrollable so long genres or enlarged system fonts never clip
            val displayGenres = currentAnime.genres
                .filter { it.isNotBlank() && it != "null" }
                .take(4)
                .ifEmpty { listOf("Anime", "Trending") }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(AnikageSpacing.Small)
            ) {
                displayGenres.forEach { genre ->
                    GenreChip(name = genre)
                }
            }

            Spacer(modifier = Modifier.height(if (isLandscape) 8.dp else 16.dp))

            // Action Buttons
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Primary "Watch Now" Button
                Button(
                    onClick = { onWatchNow(currentAnime) },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = Color.Black
                    ),
                    shape = MaterialTheme.shapes.small,
                    contentPadding = PaddingValues(horizontal = AnikageSpacing.Medium, vertical = AnikageSpacing.Small)
                ) {
                    Icon(Icons.Filled.PlayArrow, contentDescription = null, modifier = Modifier.size(20.dp), tint = Color.Black)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Watch Now", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = Color.Black)
                }

                // Secondary "+ My List" Button (Frosted glass dark translucent)
                Button(
                    onClick = { onAddToList(currentAnime) },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color.Black.copy(alpha = 0.65f),
                        contentColor = Color.White
                    ),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.20f)),
                    shape = MaterialTheme.shapes.small,
                    contentPadding = PaddingValues(horizontal = AnikageSpacing.Medium, vertical = AnikageSpacing.Small)
                ) {
                    Icon(Icons.Filled.Add, contentDescription = null, modifier = Modifier.size(18.dp), tint = Color.White)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("My List", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold, color = Color.White)
                }
            }

            Spacer(modifier = Modifier.height(if (isLandscape) 8.dp else 16.dp))

            // Dynamic Carousel Indicators & Pagination Controls
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.End
            ) {
                IconButton(
                    onClick = {
                        currentIndex = if (currentIndex - 1 < 0) slides.size - 1 else currentIndex - 1
                    },
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        Icons.Filled.ChevronLeft,
                        contentDescription = "Previous Slide",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                
                Spacer(modifier = Modifier.width(4.dp))
                
                slides.indices.forEach { index ->
                    val isSelected = index == currentIndex
                    Box(
                        modifier = Modifier
                            .padding(horizontal = 2.dp)
                            .height(6.dp)
                            .width(if (isSelected) 20.dp else 6.dp)
                            .clip(CircleShape)
                            .background(
                                if (isSelected) MaterialTheme.colorScheme.primary
                                else MaterialTheme.colorScheme.surfaceVariant
                            )
                            .clickable { currentIndex = index }
                    )
                }
                
                Spacer(modifier = Modifier.width(4.dp))
                
                IconButton(
                    onClick = {
                        currentIndex = (currentIndex + 1) % slides.size
                    },
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        Icons.Filled.ChevronRight,
                        contentDescription = "Next Slide",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

@Composable
fun SectionHeader(
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = AnikageSpacing.Medium, vertical = AnikageSpacing.Small)
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground
        )
        Text(
            text = subtitle,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Preview(uiMode = Configuration.UI_MODE_NIGHT_YES)
@Composable
fun HomeScreenPreview() {
    AnikageTheme {
        HomeScreen()
    }
}
