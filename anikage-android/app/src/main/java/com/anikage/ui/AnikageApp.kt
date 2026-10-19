package com.anikage.ui

import android.content.res.Configuration
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import kotlinx.coroutines.launch
import com.anikage.ui.components.AnikageNavDestination
import com.anikage.ui.components.AnikageTopAppBar
import com.anikage.ui.screens.*
import com.anikage.ui.theme.AnikageTheme

/**
 * Main application scaffold managing the persistent Top Bar and NavHost routes.
 */
fun encodeNavArg(s: String): String {
    if (s.isEmpty()) return "_"
    return android.util.Base64.encodeToString(s.toByteArray(Charsets.UTF_8), android.util.Base64.URL_SAFE or android.util.Base64.NO_PADDING or android.util.Base64.NO_WRAP)
}

fun decodeNavArg(s: String?): String {
    if (s == null || s == "_" || s.isEmpty()) return ""
    return try {
        String(android.util.Base64.decode(s, android.util.Base64.URL_SAFE or android.util.Base64.NO_PADDING or android.util.Base64.NO_WRAP), Charsets.UTF_8)
    } catch (e: Exception) {
        s
    }
}

@Composable
fun AnikageApp(
    modifier: Modifier = Modifier
) {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route ?: AnikageNavDestination.Home.route

    val currentDestination = remember(currentRoute) {
        AnikageNavDestination.values().find { it.route == currentRoute } ?: AnikageNavDestination.Home
    }

    val isFullScreen = currentRoute.startsWith("player") || currentRoute.startsWith("details")

    Scaffold(
        modifier = modifier.fillMaxSize(),
        topBar = {
            if (!isFullScreen) {
                AnikageTopAppBar(
                    currentDestination = currentDestination,
                    onNavigate = { destination ->
                        navController.navigate(destination.route) {
                            popUpTo(AnikageNavDestination.Home.route) {
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                )
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = AnikageNavDestination.Home.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(AnikageNavDestination.Home.route) {
                HomeScreen(
                    onAnimeClick = { anime ->
                        val encId = encodeNavArg(anime.id)
                        val encTitle = encodeNavArg(anime.title)
                        val encImg = encodeNavArg(anime.imageUrl)
                        val epsCount = anime.totalEpisodes
                        navController.navigate("details/$encId/$encTitle/$encImg/$epsCount")
                    },
                    onWatchClick = { anime, ep ->
                        val encId = encodeNavArg(anime.id)
                        val encTitle = encodeNavArg(anime.title)
                        val encImg = encodeNavArg(anime.imageUrl)
                        val encBanner = encodeNavArg(anime.bannerUrl)
                        navController.navigate("player/$encId/$ep/$encTitle/$encImg/$encBanner")
                    }
                )
            }
            composable(
                "details/{showId}/{title}/{imageUrl}/{episodesCount}"
            ) { backStackEntry ->
                val showId = decodeNavArg(backStackEntry.arguments?.getString("showId"))
                val title = decodeNavArg(backStackEntry.arguments?.getString("title")).ifEmpty { "Anime" }
                val imageUrl = decodeNavArg(backStackEntry.arguments?.getString("imageUrl"))
                val episodesCount = backStackEntry.arguments?.getString("episodesCount")?.toIntOrNull() ?: 0
                
                DetailsScreen(
                    showId = showId,
                    title = title,
                    imageUrl = imageUrl,
                    episodesCount = episodesCount,
                    onClose = { navController.popBackStack() },
                    onWatchEp1 = {
                        val encId = encodeNavArg(showId)
                        val encTitle = encodeNavArg(title)
                        val encImg = encodeNavArg(imageUrl)
                        navController.navigate("player/$encId/1/$encTitle/$encImg/_")
                    },
                    onEpisodeClick = { episode ->
                        val encId = encodeNavArg(showId)
                        val encTitle = encodeNavArg(title)
                        val encImg = encodeNavArg(imageUrl)
                        navController.navigate("player/$encId/$episode/$encTitle/$encImg/_")
                    }
                )
            }
            composable("player/{showId}/{episode}/{title}/{imageUrl}/{bannerUrl}") { backStackEntry ->
                val showId = decodeNavArg(backStackEntry.arguments?.getString("showId"))
                val episode = backStackEntry.arguments?.getString("episode") ?: "1"
                val title = decodeNavArg(backStackEntry.arguments?.getString("title")).ifEmpty { "Anime" }
                val imageUrl = decodeNavArg(backStackEntry.arguments?.getString("imageUrl"))
                val bannerUrl = decodeNavArg(backStackEntry.arguments?.getString("bannerUrl"))
                VideoPlayerScreen(
                    showId = showId,
                    episodeString = episode,
                    title = title,
                    subtitle = "Episode $episode",
                    imageUrl = imageUrl,
                    bannerUrl = bannerUrl,
                    onClose = { navController.popBackStack() },
                    onEpisodeChange = { newEp ->
                        val encId = encodeNavArg(showId)
                        val encTitle = encodeNavArg(title)
                        val encImg = encodeNavArg(imageUrl)
                        val encBanner = encodeNavArg(bannerUrl)
                        navController.navigate("player/$encId/$newEp/$encTitle/$encImg/$encBanner") {
                            popUpTo("player/{showId}/{episode}/{title}/{imageUrl}/{bannerUrl}") { inclusive = true }
                        }
                    }
                )
            }
            composable(AnikageNavDestination.Search.route) {
                var query by remember { mutableStateOf("") }
                SearchScreen(
                    query = query,
                    onQueryChange = { query = it },
                    onAnimeClick = { anime ->
                        val encId = encodeNavArg(anime.id)
                        val encTitle = encodeNavArg(anime.title)
                        val encImg = encodeNavArg(anime.imageUrl)
                        val epsCount = anime.totalEpisodes
                        navController.navigate("details/$encId/$encTitle/$encImg/$epsCount")
                    }
                )
            }
            composable(AnikageNavDestination.MyList.route) {
                MyListScreen(
                    onAnimeClick = { anime ->
                        val encId = encodeNavArg(anime.id)
                        val encTitle = encodeNavArg(anime.title)
                        val encImg = encodeNavArg(anime.imageUrl)
                        val epsCount = anime.totalEpisodes
                        navController.navigate("details/$encId/$encTitle/$encImg/$epsCount")
                    }
                )
            }
            composable(AnikageNavDestination.Downloads.route) {
                DownloadsScreen()
            }
            composable(AnikageNavDestination.Notifications.route) {
                NotificationsScreen()
            }
            composable(AnikageNavDestination.Settings.route) {
                val context = androidx.compose.ui.platform.LocalContext.current
                val coroutineScope = rememberCoroutineScope()
                val db = remember { com.anikage.data.local.AppDatabase.getDatabase(context) }
                val gson = remember { com.google.gson.Gson() }
                
                val createDocumentLauncher = androidx.activity.compose.rememberLauncherForActivityResult(
                    androidx.activity.result.contract.ActivityResultContracts.CreateDocument("application/json")
                ) { uri ->
                    uri?.let {
                        coroutineScope.launch {
                            try {
                                val savedAnime = db.myListDao().getAllSavedAnimeSync()
                                val json = gson.toJson(savedAnime)
                                context.contentResolver.openOutputStream(it)?.use { out ->
                                    out.write(json.toByteArray())
                                }
                                android.widget.Toast.makeText(context, "Backup exported successfully!", android.widget.Toast.LENGTH_SHORT).show()
                            } catch (e: Exception) {
                                e.printStackTrace()
                                android.widget.Toast.makeText(context, "Failed to export backup", android.widget.Toast.LENGTH_SHORT).show()
                            }
                        }
                    }
                }
                
                val openDocumentLauncher = androidx.activity.compose.rememberLauncherForActivityResult(
                    androidx.activity.result.contract.ActivityResultContracts.OpenDocument()
                ) { uri ->
                    uri?.let {
                        coroutineScope.launch {
                            try {
                                val json = context.contentResolver.openInputStream(it)?.bufferedReader().use { reader -> reader?.readText() }
                                if (json != null) {
                                    val listType = object : com.google.gson.reflect.TypeToken<List<com.anikage.data.local.MyListEntity>>() {}.type
                                    val importedList: List<com.anikage.data.local.MyListEntity> = gson.fromJson(json, listType)
                                    
                                    db.myListDao().clearAll() // Overwrite current library
                                    importedList.forEach { entity ->
                                        db.myListDao().insertAnime(entity)
                                    }
                                    android.widget.Toast.makeText(context, "Backup restored successfully!", android.widget.Toast.LENGTH_SHORT).show()
                                }
                            } catch (e: Exception) {
                                e.printStackTrace()
                                android.widget.Toast.makeText(context, "Failed to restore backup", android.widget.Toast.LENGTH_SHORT).show()
                            }
                        }
                    }
                }

                SettingsScreen(
                    onCreateBackup = { createDocumentLauncher.launch("anikage_backup.json") },
                    onRestoreBackup = { openDocumentLauncher.launch(arrayOf("application/json")) },
                    onResetApp = {
                        coroutineScope.launch {
                            db.myListDao().clearAll()
                            android.widget.Toast.makeText(context, "Library Reset", android.widget.Toast.LENGTH_SHORT).show()
                        }
                    }
                )
            }
        }
    }
}

@Preview(uiMode = Configuration.UI_MODE_NIGHT_YES)
@Composable
fun AnikageAppPreview() {
    AnikageTheme {
        AnikageApp()
    }
}
