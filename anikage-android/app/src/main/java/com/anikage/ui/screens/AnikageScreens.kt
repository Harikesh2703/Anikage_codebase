package com.anikage.ui.screens

import android.content.res.Configuration
import androidx.compose.foundation.lazy.grid.items
import kotlinx.coroutines.launch
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BookmarkBorder
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.FileDownload
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Extension
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Storage
import androidx.compose.foundation.border
import androidx.compose.foundation.BorderStroke
import androidx.compose.material3.*
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anikage.ui.theme.AnikageSpacing
import com.anikage.ui.theme.AnikageTheme

// ==========================================
// SCREEN 2: SEARCH SCREEN
// ==========================================
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchScreen(
    query: String,
    onQueryChange: (String) -> Unit,
    recentSearches: List<String> = listOf("Love", "Demon", "Hero"),
    onClearAll: () -> Unit = {},
    modifier: Modifier = Modifier,
    onAnimeClick: (com.anikage.ui.components.AnimeItem) -> Unit = {}
) {
    var searchResults by remember { mutableStateOf<List<com.anikage.ui.components.AnimeItem>>(emptyList()) }
    var isSearching by remember { mutableStateOf(false) }

    LaunchedEffect(query) {
        if (query.length >= 3) {
            isSearching = true
            val scraper = com.anikage.data.plugins.PluginManager.getInstance().getActiveScraper()
            if (scraper != null) {
                try {
                    val results = scraper.searchAnime(query)
                    searchResults = results.map { 
                        com.anikage.ui.components.AnimeItem(id = it.id, title = it.name, imageUrl = it.thumbnail, genres = emptyList())
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
            isSearching = false
        } else {
            searchResults = emptyList()
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = AnikageSpacing.Medium)
    ) {
        Spacer(modifier = Modifier.height(AnikageSpacing.Medium))

        // Search Bar with leading icon
        OutlinedTextField(
            value = query,
            onValueChange = onQueryChange,
            placeholder = {
                Text(
                    text = "Search for anime...",
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            },
            leadingIcon = {
                Icon(
                    imageVector = Icons.Default.Search,
                    contentDescription = "Search",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            },
            singleLine = true,
            shape = MaterialTheme.shapes.small,
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f),
                unfocusedContainerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.2f),
                focusedBorderColor = MaterialTheme.colorScheme.primary,
                unfocusedBorderColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.6f),
                focusedTextColor = MaterialTheme.colorScheme.onBackground,
                unfocusedTextColor = MaterialTheme.colorScheme.onBackground
            ),
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(AnikageSpacing.Large))

        if (query.length < 3) {
            // Recent Searches Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Schedule,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(20.dp)
                    )
                    Text(
                        text = "Recent Searches",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground
                    )
                }
                TextButton(onClick = onClearAll) {
                    Icon(
                        imageVector = Icons.Default.Delete,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "Clear All",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(modifier = Modifier.height(AnikageSpacing.Small))

            // Search Tag Flow - horizontally scrollable to prevent clipping across densities and viewports
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                recentSearches.forEach { term ->
                    Surface(
                        color = MaterialTheme.colorScheme.surfaceVariant,
                        shape = MaterialTheme.shapes.small,
                        modifier = Modifier.clickable { onQueryChange(term) }
                    ) {
                        Text(
                            text = term,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onBackground,
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)
                        )
                    }
                }
            }
        } else {
            // Search Results Grid
            if (isSearching) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                }
            } else if (searchResults.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("No results found.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            } else {
                val navBarsPadding = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding()
                androidx.compose.foundation.lazy.grid.LazyVerticalGrid(
                    columns = androidx.compose.foundation.lazy.grid.GridCells.Adaptive(minSize = 100.dp),
                    horizontalArrangement = Arrangement.spacedBy(AnikageSpacing.Medium),
                    verticalArrangement = Arrangement.spacedBy(AnikageSpacing.Medium),
                    contentPadding = PaddingValues(bottom = AnikageSpacing.ExtraLarge + navBarsPadding),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(searchResults) { item ->
                        com.anikage.ui.components.AnimePosterCard(
                            anime = item,
                            onClick = { onAnimeClick(item) },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }
        }
    }
}

// ==========================================
// SCREEN 3: MY LIST / LIBRARY SCREEN
// ==========================================
@Composable
fun MyListScreen(
    selectedTabIndex: Int = 0,
    onTabSelected: (Int) -> Unit = {},
    modifier: Modifier = Modifier,
    onAnimeClick: (com.anikage.ui.components.AnimeItem) -> Unit = {}
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val db = remember { com.anikage.data.local.AppDatabase.getDatabase(context) }
    val savedAnimeFlow = remember { db.myListDao().getAllSavedAnime() }
    val savedAnime by savedAnimeFlow.collectAsState(initial = emptyList())

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(AnikageSpacing.Medium)
    ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.BookmarkBorder,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary
                    )
                }
                Column {
                    Text(
                        text = "My List",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground
                    )
                    Text(
                        text = "Anime you've saved to watch later.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(modifier = Modifier.height(AnikageSpacing.Large))

            if (savedAnime.isEmpty()) {
                // Empty State Card - dynamically wraps content to adapt across screen heights and font scales
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .wrapContentHeight()
                        .defaultMinSize(minHeight = 180.dp),
                    shape = MaterialTheme.shapes.large,
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(AnikageSpacing.Large),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.BookmarkBorder,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                            modifier = Modifier.size(56.dp)
                        )
                        Spacer(modifier = Modifier.height(AnikageSpacing.Medium))
                        Text(
                            text = "Your list is empty",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onBackground
                        )
                        Spacer(modifier = Modifier.height(AnikageSpacing.Small))
                        Text(
                            text = "Add shows to your list by tapping the \"My List\" button on the home screen or inside a show's details.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center,
                            lineHeight = 20.sp
                        )
                    }
                }
            } else {
                val navBarsPadding = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding()
                androidx.compose.foundation.lazy.grid.LazyVerticalGrid(
                    columns = androidx.compose.foundation.lazy.grid.GridCells.Adaptive(minSize = 100.dp),
                    horizontalArrangement = Arrangement.spacedBy(AnikageSpacing.Medium),
                    verticalArrangement = Arrangement.spacedBy(AnikageSpacing.Medium),
                    contentPadding = PaddingValues(bottom = AnikageSpacing.ExtraLarge + navBarsPadding),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(savedAnime) { item ->
                        com.anikage.ui.components.AnimePosterCard(
                            anime = com.anikage.ui.components.AnimeItem(
                                id = item.id,
                                title = item.title,
                                imageUrl = item.imageUrl,
                                genres = emptyList()
                            ),
                            onClick = { 
                                onAnimeClick(
                                    com.anikage.ui.components.AnimeItem(
                                        id = item.id,
                                        title = item.title,
                                        imageUrl = item.imageUrl,
                                        genres = emptyList()
                                    )
                                ) 
                            },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }
        }
    }

// ==========================================
// SCREEN 4: DOWNLOADS SCREEN
// ==========================================
@Composable
fun DownloadsScreen(
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(AnikageSpacing.Large),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier
                    .size(96.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.FileDownload,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(48.dp)
                )
            }
            Spacer(modifier = Modifier.height(AnikageSpacing.Large))
            Text(
                text = "Downloads Unavailable",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )
            Spacer(modifier = Modifier.height(AnikageSpacing.Small))
            Text(
                text = "Downloads are only available in the Desktop version of the application.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )
        }
    }
}

// ==========================================
// SCREEN 5: NOTIFICATIONS SCREEN
// ==========================================
@Composable
fun NotificationsScreen(
    onCheckNow: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(AnikageSpacing.Medium)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                modifier = Modifier.weight(1f),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(42.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Notifications,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary
                    )
                }
                Column {
                    Text(
                        text = "Notifications",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground
                    )
                    Text(
                        text = "Stay updated with the latest fixes and news.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Surface(
                color = MaterialTheme.colorScheme.surface,
                shape = MaterialTheme.shapes.small,
                modifier = Modifier.clickable(onClick = onCheckNow)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(
                        Icons.Default.Refresh,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = MaterialTheme.colorScheme.onBackground
                    )
                    Text(
                        text = "Check\nNow",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground,
                        lineHeight = 14.sp
                    )
                }
            }
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Notifications,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.surfaceVariant,
                    modifier = Modifier.size(64.dp)
                )
                Spacer(modifier = Modifier.height(AnikageSpacing.Medium))
                Text(
                    text = "All caught up!",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "You have no new notifications.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

// ==========================================
// SCREEN 6: SETTINGS SCREEN
// ==========================================
@Composable
fun SettingsScreen(
    onResetApp: () -> Unit = {},
    onCreateBackup: () -> Unit = {},
    onRestoreBackup: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val coroutineScope = androidx.compose.runtime.rememberCoroutineScope()
    var pluginUrl by remember { mutableStateOf("") }
    var pluginName by remember { mutableStateOf("") }
    var pasteCodeId by remember { mutableStateOf("") }
    var pasteCodeSource by remember { mutableStateOf("") }
    var showPasteDialog by remember { mutableStateOf(false) }
    var isProcessing by remember { mutableStateOf(false) }
    var pluginsList by remember { mutableStateOf(com.anikage.data.plugins.PluginManager.getInstance().getPlugins()) }
    var activePluginId by remember { mutableStateOf(com.anikage.data.plugins.PluginManager.getInstance().activePluginId.value) }

    // SAF / Content Provider Document Picker
    val filePickerLauncher = androidx.activity.compose.rememberLauncherForActivityResult(
        contract = androidx.activity.result.contract.ActivityResultContracts.OpenDocument()
    ) { uri: android.net.Uri? ->
        if (uri != null) {
            coroutineScope.launch {
                isProcessing = true
                try {
                    val contentResolver = context.contentResolver
                    var displayName = "custom_scraper.js"
                    contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                        val nameIndex = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
                        if (nameIndex >= 0 && cursor.moveToFirst()) {
                            displayName = cursor.getString(nameIndex)
                        }
                    }
                    val jsSource = contentResolver.openInputStream(uri)?.bufferedReader()?.use { it.readText() }
                    if (!jsSource.isNullOrBlank()) {
                        val pluginId = displayName.removeSuffix(".js").lowercase().replace(Regex("[^a-z0-9_-]"), "_").ifBlank { "custom_scraper" }
                        val success = com.anikage.data.plugins.PluginManager.getInstance().installPluginFromSource(context, pluginId, jsSource)
                        if (success) {
                            android.widget.Toast.makeText(context, "Plugin '$pluginId' installed successfully!", android.widget.Toast.LENGTH_SHORT).show()
                            pluginsList = com.anikage.data.plugins.PluginManager.getInstance().getPlugins()
                            activePluginId = com.anikage.data.plugins.PluginManager.getInstance().activePluginId.value
                        } else {
                            android.widget.Toast.makeText(context, "Failed to load plugin: Invalid JS format", android.widget.Toast.LENGTH_LONG).show()
                        }
                    } else {
                        android.widget.Toast.makeText(context, "Selected file is empty", android.widget.Toast.LENGTH_SHORT).show()
                    }
                } catch (e: Exception) {
                    android.widget.Toast.makeText(context, "Error reading file: ${e.message}", android.widget.Toast.LENGTH_LONG).show()
                } finally {
                    isProcessing = false
                }
            }
        }
    }

    if (showPasteDialog) {
        AlertDialog(
            onDismissRequest = { showPasteDialog = false },
            title = { Text("Paste Scraper Code (.js)", fontWeight = FontWeight.Bold) },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = pasteCodeId,
                        onValueChange = { pasteCodeId = it },
                        label = { Text("Plugin ID (e.g. hianime)") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = pasteCodeSource,
                        onValueChange = { pasteCodeSource = it },
                        label = { Text("JavaScript Code") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(min = 120.dp, max = 220.dp),
                        maxLines = 15
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (pasteCodeId.isNotBlank() && pasteCodeSource.isNotBlank()) {
                            coroutineScope.launch {
                                isProcessing = true
                                val success = com.anikage.data.plugins.PluginManager.getInstance().installPluginFromSource(
                                    context,
                                    pasteCodeId.trim(),
                                    pasteCodeSource
                                )
                                if (success) {
                                    android.widget.Toast.makeText(context, "Plugin installed successfully!", android.widget.Toast.LENGTH_SHORT).show()
                                    pluginsList = com.anikage.data.plugins.PluginManager.getInstance().getPlugins()
                                    activePluginId = com.anikage.data.plugins.PluginManager.getInstance().activePluginId.value
                                    showPasteDialog = false
                                    pasteCodeId = ""
                                    pasteCodeSource = ""
                                } else {
                                    android.widget.Toast.makeText(context, "Failed to parse plugin code", android.widget.Toast.LENGTH_LONG).show()
                                }
                                isProcessing = false
                            }
                        }
                    },
                    enabled = pasteCodeId.isNotBlank() && pasteCodeSource.isNotBlank() && !isProcessing
                ) {
                    Text("Save & Load")
                }
            },
            dismissButton = {
                TextButton(onClick = { showPasteDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    val navBarsPadding = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding()
    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 20.dp, bottom = 24.dp + navBarsPadding),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        // Header
        item {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.padding(bottom = 16.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f))
                        .border(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.2f), RoundedCornerShape(16.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(androidx.compose.material.icons.Icons.Default.Settings, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                }
                Column {
                    Text(
                        text = "Settings",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Black,
                        color = MaterialTheme.colorScheme.onBackground,
                        letterSpacing = (-0.5).sp
                    )
                    Text(
                        text = "Configure and maintain your Anikage experience.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        // Section: Scraper Plugins
        item {
            SettingsSectionCard(
                icon = androidx.compose.material.icons.Icons.Default.Extension,
                iconTint = MaterialTheme.colorScheme.primary,
                title = "Scraper Plugins",
                subtitle = "Manage external scrapers decoupled from the application."
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    // List currently installed plugins
                    Text("Installed Scrapers", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
                    if (pluginsList.isEmpty()) {
                        Surface(
                            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = "No scrapers installed yet.\nImport a scraper file (.js) below to enable video playback.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(16.dp),
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center
                            )
                        }
                    } else {
                        pluginsList.forEach { plugin ->
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(if (plugin.id == activePluginId) MaterialTheme.colorScheme.primary.copy(alpha = 0.08f) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))
                                    .border(
                                        1.dp,
                                        if (plugin.id == activePluginId) MaterialTheme.colorScheme.primary.copy(alpha = 0.4f) else MaterialTheme.colorScheme.outline.copy(alpha = 0.15f),
                                        RoundedCornerShape(12.dp)
                                    )
                                    .clickable {
                                        com.anikage.data.plugins.PluginManager.getInstance().setActivePlugin(plugin.id)
                                        activePluginId = plugin.id
                                    }
                                    .padding(horizontal = 8.dp, vertical = 6.dp)
                            ) {
                                RadioButton(
                                    selected = (plugin.id == activePluginId),
                                    onClick = {
                                        com.anikage.data.plugins.PluginManager.getInstance().setActivePlugin(plugin.id)
                                        activePluginId = plugin.id
                                    },
                                    colors = androidx.compose.material3.RadioButtonDefaults.colors(
                                        selectedColor = MaterialTheme.colorScheme.primary
                                    )
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(plugin.name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
                                    Text("ID: ${plugin.id} • v${plugin.version}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                IconButton(
                                    onClick = {
                                        coroutineScope.launch {
                                            val deleted = com.anikage.data.plugins.PluginManager.getInstance().deletePlugin(context, plugin.id)
                                            if (deleted) {
                                                pluginsList = com.anikage.data.plugins.PluginManager.getInstance().getPlugins()
                                                activePluginId = com.anikage.data.plugins.PluginManager.getInstance().activePluginId.value
                                                android.widget.Toast.makeText(context, "Plugin '${plugin.id}' deleted", android.widget.Toast.LENGTH_SHORT).show()
                                            }
                                        }
                                    }
                                ) {
                                    Icon(
                                        androidx.compose.material.icons.Icons.Default.Delete,
                                        contentDescription = "Delete plugin",
                                        tint = MaterialTheme.colorScheme.error.copy(alpha = 0.8f),
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                    Text("Add Scraper Plugin", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)

                    // 1. Choose File from Device via Content Provider / SAF
                    Button(
                        onClick = {
                            filePickerLauncher.launch(arrayOf("*/*"))
                        },
                        enabled = !isProcessing,
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary,
                            contentColor = MaterialTheme.colorScheme.onPrimary
                        )
                    ) {
                        if (isProcessing) {
                            CircularProgressIndicator(modifier = Modifier.size(20.dp), color = MaterialTheme.colorScheme.onPrimary, strokeWidth = 2.dp)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Loading Plugin...")
                        } else {
                            Icon(androidx.compose.material.icons.Icons.Default.FileDownload, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("CHOOSE .JS FILE FROM DEVICE", fontWeight = FontWeight.Bold, letterSpacing = 0.5.sp)
                        }
                    }

                    // 2. Secondary actions: Paste Code
                    OutlinedButton(
                        onClick = { showPasteDialog = true },
                        modifier = Modifier.fillMaxWidth().height(42.dp),
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.3f))
                    ) {
                        Icon(androidx.compose.material.icons.Icons.Default.Description, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Or Paste Scraper Code Manually", style = MaterialTheme.typography.labelLarge)
                    }

                    // 3. Download via URL (Optional)
                    OutlinedTextField(
                        value = pluginName,
                        onValueChange = { pluginName = it },
                        label = { Text("Or Remote Plugin ID (e.g., custom_scraper)") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp)
                    )
                    
                    OutlinedTextField(
                        value = pluginUrl,
                        onValueChange = { pluginUrl = it },
                        label = { Text("Remote Plugin URL (Raw JS File)") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp)
                    )

                    Button(
                        onClick = {
                            if (pluginName.isNotBlank() && pluginUrl.isNotBlank()) {
                                isProcessing = true
                                coroutineScope.launch {
                                    val success = com.anikage.data.plugins.PluginManager.getInstance().downloadAndInstallPlugin(context, pluginName, pluginUrl, "1.0")
                                    if (success) {
                                        android.widget.Toast.makeText(context, "Plugin installed!", android.widget.Toast.LENGTH_SHORT).show()
                                        pluginsList = com.anikage.data.plugins.PluginManager.getInstance().getPlugins()
                                        activePluginId = com.anikage.data.plugins.PluginManager.getInstance().activePluginId.value
                                        pluginName = ""
                                        pluginUrl = ""
                                    } else {
                                        android.widget.Toast.makeText(context, "Failed to download plugin", android.widget.Toast.LENGTH_SHORT).show()
                                    }
                                    isProcessing = false
                                }
                            }
                        },
                        enabled = !isProcessing && pluginName.isNotBlank() && pluginUrl.isNotBlank(),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("Download & Install from URL")
                    }
                }
            }
        }

        // Section: Maintenance & Recovery
        item {
            SettingsSectionCard(
                icon = androidx.compose.material.icons.Icons.Default.Warning,
                iconTint = MaterialTheme.colorScheme.error,
                title = "Maintenance & Recovery",
                subtitle = "Tools to fix common playback or loading issues."
            ) {
                Column {
                    Text(
                        text = "Factory Reset Scraper",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Clears all downloaded hot-fixes and temporary logs. Use this if anime mirrors aren't loading or the app feels sluggish.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Icon(androidx.compose.material.icons.Icons.Default.Storage, contentDescription = null, tint = androidx.compose.ui.graphics.Color(0xFF22C55E), modifier = Modifier.size(14.dp))
                            Text("DATABASE SAFE", style = MaterialTheme.typography.labelSmall, color = androidx.compose.ui.graphics.Color(0xFF22C55E), fontWeight = FontWeight.Bold)
                        }
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Icon(androidx.compose.material.icons.Icons.Default.Description, contentDescription = null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(14.dp))
                            Text("LOGS CLEARED", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.Bold)
                        }
                    }
                    Spacer(modifier = Modifier.height(24.dp))
                    Button(
                        onClick = onResetApp,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.error.copy(alpha = 0.1f),
                            contentColor = MaterialTheme.colorScheme.error
                        ),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.2f))
                    ) {
                        Icon(androidx.compose.material.icons.Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("RESET APP", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Black, letterSpacing = 1.sp)
                    }
                }
            }
        }

        // Section: Data Portability
        item {
            SettingsSectionCard(
                icon = androidx.compose.material.icons.Icons.Default.Storage,
                iconTint = MaterialTheme.colorScheme.primary,
                title = "Data Portability",
                subtitle = "Move your watch history and library to a new device."
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(32.dp)) {
                    // Export
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Icon(androidx.compose.material.icons.Icons.Default.FileDownload, contentDescription = null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onBackground)
                            Text("Export Library", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Save your entire watch history and personalized library as a single .json file.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(
                            onClick = onCreateBackup,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                                contentColor = MaterialTheme.colorScheme.primary
                            ),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth().height(48.dp),
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.2f))
                        ) {
                            Text("CREATE BACKUP", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Black, letterSpacing = 1.sp)
                        }
                    }

                    // Import
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Icon(androidx.compose.material.icons.Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onBackground)
                            Text("Import Library", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Restore your history from a backup file.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            text = "This will overwrite your current library.",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.error
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(
                            onClick = onRestoreBackup,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.surfaceVariant,
                                contentColor = MaterialTheme.colorScheme.onBackground
                            ),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth().height(48.dp),
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))
                        ) {
                            Text("RESTORE FROM FILE", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Black, letterSpacing = 1.sp)
                        }
                    }
                }
            }
        }

        // Section: Version Info
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.surfaceVariant),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 18.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        modifier = Modifier.weight(1f, fill = false),
                        horizontalArrangement = Arrangement.spacedBy(14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(MaterialTheme.colorScheme.surfaceVariant),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(androidx.compose.material.icons.Icons.Default.Info, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Column {
                            Text("Version Info", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                "App: v1.0.0\nUI: v1.0.0\nServer: v1.0.0\nScraper: v1.0.0",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Box(
                        modifier = Modifier
                            .border(1.dp, MaterialTheme.colorScheme.primary.copy(alpha=0.2f), RoundedCornerShape(50))
                            .background(MaterialTheme.colorScheme.primary.copy(alpha=0.1f), RoundedCornerShape(50))
                            .padding(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Text("UP TO DATE", color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                    }
                }
            }
        }
    }
}

@Composable
fun SettingsSectionCard(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    iconTint: androidx.compose.ui.graphics.Color,
    title: String,
    subtitle: String,
    content: @Composable () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.surfaceVariant),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column {
            Box(modifier = Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))) {
                Column(modifier = Modifier.padding(24.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(imageVector = icon, contentDescription = null, tint = iconTint, modifier = Modifier.size(20.dp))
                        Text(
                            text = title,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onBackground
                        )
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            HorizontalDivider(color = MaterialTheme.colorScheme.surfaceVariant)
            Box(modifier = Modifier.padding(32.dp)) {
                content()
            }
        }
    }
}

// ==========================================
// SCREEN 8: ANALYTICS SCREEN
// ==========================================
@Composable
fun AnalyticsScreen(
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(24.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        item {
            Column {
                Text(
                    text = "PROFILE",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 2.sp
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Your Watch Profile",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Black,
                    color = MaterialTheme.colorScheme.onBackground
                )
                Text(
                    text = "A look at trending anime genres — discover what's popular right now.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                StatCard(
                    title = "TITLES WATCHED",
                    value = "0",
                    icon = Icons.Default.Schedule,
                    modifier = Modifier.weight(1f)
                )
                StatCard(
                    title = "GENRES EXPLORED",
                    value = "0",
                    icon = Icons.Default.BookmarkBorder,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(24.dp)) {
                    Text(
                        text = "Genre Breakdown",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "Not enough data to display genre statistics yet. Watch more anime to build your profile!",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

@Composable
fun StatCard(
    title: String,
    value: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = title,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )
        }
    }
}

@Preview(uiMode = Configuration.UI_MODE_NIGHT_YES)
@Composable
fun ScreensPreview() {
    AnikageTheme {
        AnalyticsScreen()
    }
}
