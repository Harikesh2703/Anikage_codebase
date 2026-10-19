package com.anikage.ui.screens

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.content.pm.ActivityInfo
import android.content.res.Configuration
import android.net.Uri
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.text.CueGroup
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.trackselection.DefaultTrackSelector
import androidx.media3.ui.PlayerView
import com.anikage.data.plugins.PluginManager
import com.anikage.data.plugins.Subtitle
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

val EmeraldPrimary = Color(0xFF10B981)
val DarkOverlay = Color(0xCC090D16)

// Reliable helper to find Activity from Context (including Compose ContextWrapper)
fun Context.findActivity(): Activity? {
    var current = this
    while (current is ContextWrapper) {
        if (current is Activity) return current
        current = current.baseContext
    }
    return null
}

@Composable
fun VideoPlayerScreen(
    showId: String = "demo-1",
    episodeString: String = "1",
    title: String = "Anime",
    subtitle: String = "Episode 1",
    imageUrl: String = "",
    bannerUrl: String = "",
    headers: Map<String, String> = emptyMap(),
    onClose: () -> Unit = {},
    onEpisodeChange: (String) -> Unit = {}
) {
    val context = LocalContext.current
    val activity = remember(context) { context.findActivity() }
    val coroutineScope = rememberCoroutineScope()

    var streamUrl by remember { mutableStateOf<String?>(null) }
    var currentProvider by remember { mutableStateOf("Vidstream") }
    var allMirrors by remember { mutableStateOf<List<Pair<String, String>>>(emptyList()) }
    var currentMirrorIndex by remember { mutableStateOf(0) }
    var availableSubtitles by remember { mutableStateOf<List<Subtitle>>(emptyList()) }
    var activeSubtitleText by remember { mutableStateOf("") }
    var isCcEnabled by remember { mutableStateOf(true) }

    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var showControls by remember { mutableStateOf(true) }
    var isPlaying by remember { mutableStateOf(true) }
    var currentPositionMs by remember { mutableStateOf(0L) }
    var durationMs by remember { mutableStateOf(0L) }
    var isDraggingSlider by remember { mutableStateOf(false) }
    var sliderPosition by remember { mutableStateOf(0f) }

    var isLandscape by remember {
        mutableStateOf(context.resources.configuration.orientation == Configuration.ORIENTATION_LANDSCAPE)
    }

    val configuration = androidx.compose.ui.platform.LocalConfiguration.current
    LaunchedEffect(configuration.orientation) {
        isLandscape = configuration.orientation == Configuration.ORIENTATION_LANDSCAPE
    }

    var seekRippleSide by remember { mutableStateOf<String?>(null) } // "left" or "right"
    var seekRippleKey by remember { androidx.compose.runtime.mutableIntStateOf(0) }
    LaunchedEffect(seekRippleKey) {
        if (seekRippleSide != null) {
            delay(650)
            seekRippleSide = null
        }
    }

    // Determine if this is an iframe embed (MegaCloud, StreamSB, etc. matching Desktop)
    val isIframe = remember(streamUrl) {
        val url = streamUrl ?: ""
        url.isNotEmpty() && !url.contains(".m3u8") && !url.contains(".mp4")
    }

    // Default track selector with subtitle preferences
    val trackSelector = remember {
        DefaultTrackSelector(context).apply {
            parameters = buildUponParameters()
                .setPreferredTextLanguage("en")
                .setSelectUndeterminedTextLanguage(true)
                .build()
        }
    }

    // Create persistent ExoPlayer
    val exoPlayer = remember(headers) {
        val dataSourceFactory = androidx.media3.datasource.DefaultHttpDataSource.Factory()
            .setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36")
        
        val defaultHeaders = mapOf(
            "Referer" to "https://megaplay.buzz/",
            "Origin" to "https://megaplay.buzz"
        )
        dataSourceFactory.setDefaultRequestProperties(defaultHeaders + headers)
        
        ExoPlayer.Builder(context)
            .setTrackSelector(trackSelector)
            .setMediaSourceFactory(androidx.media3.exoplayer.source.DefaultMediaSourceFactory(dataSourceFactory))
            .build().apply {
                playWhenReady = true
            }
    }

    fun setFullscreen(landscape: Boolean) {
        isLandscape = landscape
        activity?.let { act ->
            act.requestedOrientation = if (landscape) {
                ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
            } else {
                ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
            }
            val controller = WindowCompat.getInsetsController(act.window, act.window.decorView)
            if (landscape) {
                controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                controller.hide(WindowInsetsCompat.Type.systemBars())
            } else {
                controller.show(WindowInsetsCompat.Type.systemBars())
            }
        }
    }

    fun toggleFullscreen() {
        setFullscreen(!isLandscape)
    }

    fun exitPlayer() {
        activity?.let { act ->
            act.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
            val controller = WindowCompat.getInsetsController(act.window, act.window.decorView)
            controller.show(WindowInsetsCompat.Type.systemBars())
        }
        onClose()
    }

    // Intercept hardware back button to restore portrait and system bars
    androidx.activity.compose.BackHandler {
        exitPlayer()
    }

    // Manage player lifecycle and listeners
    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val listener = object : Player.Listener {
            override fun onCues(cueGroup: CueGroup) {
                if (isCcEnabled && !isIframe) {
                    val rawText = cueGroup.cues.joinToString("\n") { it.text?.toString() ?: "" }.trim()
                    activeSubtitleText = rawText
                } else {
                    activeSubtitleText = ""
                }
            }

            override fun onIsPlayingChanged(playing: Boolean) {
                isPlaying = playing
            }

            override fun onPlaybackStateChanged(state: Int) {
                if (state == Player.STATE_READY) {
                    durationMs = exoPlayer.duration.coerceAtLeast(0L)
                    isLoading = false
                }
            }
        }
        exoPlayer.addListener(listener)

        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_PAUSE -> exoPlayer.pause()
                Lifecycle.Event.ON_RESUME -> if (!isIframe) exoPlayer.play()
                else -> {}
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)

        onDispose {
            if (durationMs > 0 && currentPositionMs > 0) {
                com.anikage.data.history.WatchHistoryRepository.saveProgress(
                    context = context,
                    id = showId,
                    title = title,
                    episode = episodeString,
                    currentPositionMs = currentPositionMs,
                    durationMs = durationMs,
                    imageUrl = imageUrl,
                    bannerUrl = bannerUrl
                )
            }
            lifecycleOwner.lifecycle.removeObserver(observer)
            exoPlayer.removeListener(listener)
            exoPlayer.release()
            activity?.let { act ->
                act.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
                val controller = WindowCompat.getInsetsController(act.window, act.window.decorView)
                controller.show(WindowInsetsCompat.Type.systemBars())
            }
        }
    }

    // Auto-enter landscape on launch
    LaunchedEffect(Unit) {
        setFullscreen(true)
    }

    // Toggle track selector when CC button is pressed
    LaunchedEffect(isCcEnabled) {
        trackSelector.parameters = trackSelector.buildUponParameters()
            .setTrackTypeDisabled(C.TRACK_TYPE_TEXT, !isCcEnabled)
            .build()
        if (!isCcEnabled) {
            activeSubtitleText = ""
        }
    }

    // Progress updater coroutine & watch history periodic save
    LaunchedEffect(isPlaying, showId, episodeString) {
        var lastSavedSec = 0L
        while (true) {
            if (isPlaying && !isDraggingSlider) {
                currentPositionMs = exoPlayer.currentPosition.coerceAtLeast(0L)
                if (exoPlayer.duration > 0) {
                    durationMs = exoPlayer.duration
                    val currentSec = currentPositionMs / 1000
                    if (currentSec > 0 && currentSec - lastSavedSec >= 5) {
                        lastSavedSec = currentSec
                        com.anikage.data.history.WatchHistoryRepository.saveProgress(
                            context = context,
                            id = showId,
                            title = title,
                            episode = episodeString,
                            currentPositionMs = currentPositionMs,
                            durationMs = durationMs,
                            imageUrl = imageUrl,
                            bannerUrl = bannerUrl
                        )
                    }
                }
            }
            delay(250)
        }
    }

    // Auto-hide controls timer (3 seconds, matching desktop)
    LaunchedEffect(showControls, isPlaying) {
        if (showControls && isPlaying) {
            delay(3500)
            showControls = false
        }
    }

    // Resolve stream links
    LaunchedEffect(showId, episodeString) {
        isLoading = true
        errorMessage = null
        activeSubtitleText = ""
        val pm = PluginManager.getInstance()
        val scraper = pm.getActiveScraper()
        var targetId = showId

        if (showId.startsWith("anilist:") && title.isNotEmpty() && scraper != null) {
            try {
                val found = scraper.searchAnime(title)
                if (found.isNotEmpty()) {
                    targetId = found[0].id
                }
            } catch (e: Exception) {}
        }

        val scrapersToTry = mutableListOf<com.anikage.data.plugins.AnimeScraper>()
        if (scraper != null) scrapersToTry.add(scraper)
        pm.getPlugins().forEach { if (it.id != scraper?.id) scrapersToTry.add(it) }

        var resolved = false
        for (currentScraper in scrapersToTry) {
            try {
                var currentTargetId = targetId
                if (currentTargetId.startsWith("anilist:") || currentScraper.id != scraper?.id) {
                    if (title.isNotEmpty() && title != "Anime") {
                        val search = currentScraper.searchAnime(title)
                        if (search.isNotEmpty()) {
                            currentTargetId = search[0].id
                        }
                    }
                }

                if (currentTargetId.startsWith("anilist:")) continue

                val embedUrls = currentScraper.getEpisodeEmbedUrls(currentTargetId, episodeString)
                if (embedUrls.isNotEmpty()) {
                    allMirrors = embedUrls.toList()
                    for (i in allMirrors.indices) {
                        val (pName, embedUrl) = allMirrors[i]
                        try {
                            val videoLinks = currentScraper.getVideoLinks(embedUrl, pName)
                            if (videoLinks.isNotEmpty()) {
                                val firstLink = videoLinks.first()
                                val parsedUrl = firstLink.url
                                if (parsedUrl.isNotEmpty()) {
                                    streamUrl = parsedUrl
                                    currentProvider = pName
                                    currentMirrorIndex = i
                                    availableSubtitles = firstLink.subtitles

                                    val isStream = parsedUrl.contains(".m3u8") || parsedUrl.contains(".mp4")
                                    if (isStream) {
                                        val mediaItemBuilder = MediaItem.Builder().setUri(Uri.parse(parsedUrl))
                                        if (firstLink.subtitles.isNotEmpty()) {
                                            val subtitleConfigs = firstLink.subtitles.map { sub ->
                                                MediaItem.SubtitleConfiguration.Builder(Uri.parse(sub.url))
                                                    .setMimeType(androidx.media3.common.MimeTypes.TEXT_VTT)
                                                    .setLanguage(sub.lang)
                                                    .setLabel(sub.label)
                                                    .setSelectionFlags(if (sub.isDefault || sub.label.contains("English", ignoreCase = true)) C.SELECTION_FLAG_DEFAULT else 0)
                                                    .build()
                                            }
                                            mediaItemBuilder.setSubtitleConfigurations(subtitleConfigs)
                                        }

                                        exoPlayer.setMediaItem(mediaItemBuilder.build())
                                        exoPlayer.prepare()
                                        exoPlayer.play()
                                    } else {
                                        // Iframe / Web player
                                        exoPlayer.pause()
                                        isLoading = false
                                    }
                                    resolved = true
                                    break
                                }
                            }
                        } catch (e: Exception) {
                            android.util.Log.w("VideoPlayer", "Failed mirror $pName: ${e.message}")
                        }
                    }
                    if (resolved) break
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        if (!resolved) {
            errorMessage = "No playable stream links found."
            isLoading = false
        }
    }

    // Function to switch mirror
    fun switchMirror(newIndex: Int) {
        if (allMirrors.isEmpty()) return
        val targetIndex = (newIndex % allMirrors.size + allMirrors.size) % allMirrors.size
        currentMirrorIndex = targetIndex
        val (pName, embedUrl) = allMirrors[targetIndex]
        isLoading = true
        activeSubtitleText = ""
        currentProvider = pName

        val pm = PluginManager.getInstance()
        val scraper = pm.getActiveScraper()
        if (scraper != null) {
            coroutineScope.launch(Dispatchers.IO) {
                try {
                    val videoLinks = scraper.getVideoLinks(embedUrl, pName)
                    if (videoLinks.isNotEmpty()) {
                        val firstLink = videoLinks.first()
                        val parsedUrl = firstLink.url
                        streamUrl = parsedUrl
                        availableSubtitles = firstLink.subtitles

                        withContext(Dispatchers.Main) {
                            val isStream = parsedUrl.contains(".m3u8") || parsedUrl.contains(".mp4")
                            if (isStream) {
                                val mediaItemBuilder = MediaItem.Builder().setUri(Uri.parse(parsedUrl))
                                if (firstLink.subtitles.isNotEmpty()) {
                                    val subtitleConfigs = firstLink.subtitles.map { sub ->
                                        MediaItem.SubtitleConfiguration.Builder(Uri.parse(sub.url))
                                            .setMimeType(androidx.media3.common.MimeTypes.TEXT_VTT)
                                            .setLanguage(sub.lang)
                                            .setLabel(sub.label)
                                            .setSelectionFlags(if (sub.isDefault || sub.label.contains("English", ignoreCase = true)) C.SELECTION_FLAG_DEFAULT else 0)
                                            .build()
                                    }
                                    mediaItemBuilder.setSubtitleConfigurations(subtitleConfigs)
                                }
                                exoPlayer.setMediaItem(mediaItemBuilder.build())
                                exoPlayer.prepare()
                                exoPlayer.play()
                            } else {
                                exoPlayer.pause()
                                isLoading = false
                            }
                        }
                    } else {
                        withContext(Dispatchers.Main) {
                            isLoading = false
                        }
                    }
                } catch (e: Exception) {
                    withContext(Dispatchers.Main) {
                        isLoading = false
                    }
                }
            }
        }
    }

    fun formatTime(ms: Long): String {
        val totalSec = (ms / 1000).coerceAtLeast(0)
        val mins = totalSec / 60
        val secs = totalSec % 60
        return "%02d:%02d".format(mins, secs)
    }

    val currentEpNum = episodeString.toIntOrNull() ?: 1
    val hasPrev = currentEpNum > 1
    val hasNext = true

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .pointerInput(isIframe) {
                if (!isIframe) {
                    detectTapGestures(
                        onDoubleTap = { offset ->
                            val width = size.width
                            if (offset.x < width * 0.4f) {
                                // Double tap on left side -> -10s
                                val target = (exoPlayer.currentPosition - 10000).coerceAtLeast(0)
                                exoPlayer.seekTo(target)
                                currentPositionMs = target
                                seekRippleSide = "left"
                                seekRippleKey++
                            } else if (offset.x > width * 0.6f) {
                                // Double tap on right side -> +10s
                                val target = (exoPlayer.currentPosition + 10000).coerceAtMost(durationMs)
                                exoPlayer.seekTo(target)
                                currentPositionMs = target
                                seekRippleSide = "right"
                                seekRippleKey++
                            } else {
                                // Center double tap -> toggle pause/play
                                if (isPlaying) exoPlayer.pause() else exoPlayer.play()
                            }
                        },
                        onTap = { offset ->
                            val width = size.width
                            val height = size.height
                            val isCenter = (offset.x in (width * 0.3f)..(width * 0.7f)) &&
                                           (offset.y in (height * 0.25f)..(height * 0.75f))
                            if (isCenter) {
                                // Tap on center to pause / play
                                if (isPlaying) exoPlayer.pause() else exoPlayer.play()
                                showControls = true
                            } else {
                                // Tap elsewhere to toggle controls
                                showControls = !showControls
                            }
                        }
                    )
                } else {
                    detectTapGestures {
                        showControls = !showControls
                    }
                }
            }
    ) {
        // Video rendering area
        if (!isIframe) {
            // Persistent Hardware TextureView Player for Direct HLS / MP4
            AndroidView(
                factory = { ctx ->
                    val view = android.view.LayoutInflater.from(ctx).inflate(com.anikage.R.layout.player_view, null) as PlayerView
                    view.apply {
                        player = exoPlayer
                        useController = false
                        // Crucial: hide built-in SubtitleView so captions are never doubled!
                        subtitleView?.visibility = android.view.View.GONE
                    }
                },
                modifier = Modifier.fillMaxSize()
            )
        } else {
            // Embedded WebView for iframe providers (MegaCloud, RapidCloud, StreamSB - 1:1 with Desktop)
            AndroidView(
                factory = { ctx ->
                    WebView(ctx).apply {
                        layoutParams = ViewGroup.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT
                        )
                        settings.javaScriptEnabled = true
                        settings.domStorageEnabled = true
                        settings.mediaPlaybackRequiresUserGesture = false
                        settings.javaScriptCanOpenWindowsAutomatically = false
                        settings.setSupportMultipleWindows(false)
                        settings.userAgentString = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"

                        webChromeClient = object : WebChromeClient() {
                            override fun onCreateWindow(view: WebView?, isDialog: Boolean, isUserGesture: Boolean, resultMsg: android.os.Message?): Boolean {
                                // Block popups and window.open redirects completely
                                return false
                            }
                        }

                        webViewClient = object : WebViewClient() {
                            override fun shouldOverrideUrlLoading(view: WebView?, request: android.webkit.WebResourceRequest?): Boolean {
                                val targetUri = request?.url ?: return true
                                val targetUrl = targetUri.toString()
                                val initialUri = Uri.parse(streamUrl ?: "")

                                val initialHost = initialUri.host ?: ""
                                val targetHost = targetUri.host ?: ""

                                // Allow player stream hosts & media domains
                                val isAllowed = (targetHost.isNotEmpty() && initialHost.isNotEmpty() &&
                                    (targetHost.equals(initialHost, ignoreCase = true) || targetHost.endsWith("." + initialHost))) ||
                                    targetHost.contains("megacloud") || targetHost.contains("rapid-cloud") ||
                                    targetHost.contains("rabbitstream") || targetHost.contains("streamwish") ||
                                    targetHost.contains("vidstream") || targetHost.contains("hianime")

                                if (isAllowed && !targetUrl.contains("google.") && !targetUrl.contains("doubleclick") && !targetUrl.contains("adservice") && !targetUrl.contains("googlesyndication")) {
                                    return false // Allow internal player operations
                                }

                                // Intercept and block Google / ad redirects when pausing or clicking
                                android.util.Log.d("VideoPlayer", "Blocked popup/ad redirect to: $targetUrl")
                                return true
                            }

                            override fun onPageFinished(view: WebView?, url: String?) {
                                isLoading = false
                                // Neutralize click-hijackers and window.open in web player iframe
                                view?.evaluateJavascript(
                                    """
                                    (function() {
                                        window.open = function() { return null; };
                                        window.alert = function() {};
                                        window.confirm = function() { return true; };
                                        document.querySelectorAll('a[target="_blank"]').forEach(function(el) {
                                            el.removeAttribute('target');
                                            el.onclick = function(e) { e.preventDefault(); e.stopPropagation(); return false; };
                                        });
                                        var adSelectors = ['#mobile-ad', '.ad-box', '.ad-overlay', '[id*="ad_"]', '[class*="banner"]', 'iframe[src*="ad"]'];
                                        adSelectors.forEach(function(sel) {
                                            document.querySelectorAll(sel).forEach(function(node) { node.remove(); });
                                        });
                                    })();
                                    """.trimIndent(),
                                    null
                                )
                            }
                        }
                    }
                },
                update = { webView ->
                    if (streamUrl != null && webView.url != streamUrl) {
                        webView.loadUrl(streamUrl!!)
                    }
                },
                modifier = Modifier.fillMaxSize()
            )
        }

        // Double Tap Visual Indicators (-10s / +10s)
        AnimatedVisibility(
            visible = seekRippleSide == "left",
            enter = fadeIn() + scaleIn(initialScale = 0.8f),
            exit = fadeOut() + scaleOut(targetScale = 1.15f),
            modifier = Modifier
                .align(Alignment.CenterStart)
                .padding(start = if (isLandscape) 72.dp else 36.dp)
        ) {
            Surface(
                color = Color.Black.copy(alpha = 0.7f),
                shape = CircleShape,
                border = BorderStroke(1.5.dp, EmeraldPrimary),
                modifier = Modifier.size(72.dp)
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(
                        Icons.Filled.FastRewind,
                        contentDescription = "-10s",
                        tint = EmeraldPrimary,
                        modifier = Modifier.size(28.dp)
                    )
                    Text(
                        text = "-10s",
                        color = Color.White,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        AnimatedVisibility(
            visible = seekRippleSide == "right",
            enter = fadeIn() + scaleIn(initialScale = 0.8f),
            exit = fadeOut() + scaleOut(targetScale = 1.15f),
            modifier = Modifier
                .align(Alignment.CenterEnd)
                .padding(end = if (isLandscape) 72.dp else 36.dp)
        ) {
            Surface(
                color = Color.Black.copy(alpha = 0.7f),
                shape = CircleShape,
                border = BorderStroke(1.5.dp, EmeraldPrimary),
                modifier = Modifier.size(72.dp)
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(
                        Icons.Filled.FastForward,
                        contentDescription = "+10s",
                        tint = EmeraldPrimary,
                        modifier = Modifier.size(28.dp)
                    )
                    Text(
                        text = "+10s",
                        color = Color.White,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        // Big Play Button Flash when paused (Matching Desktop lines 428-434)
        if (!isPlaying && !isLoading && errorMessage == null && !isIframe) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(80.dp)
                        .clip(CircleShape)
                        .background(Color.Black.copy(alpha = 0.5f))
                        .clickable { exoPlayer.play() },
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.PlayArrow,
                        contentDescription = "Play",
                        tint = Color.White,
                        modifier = Modifier.size(44.dp)
                    )
                }
            }
        }

        // Custom High-Contrast Styled Subtitle Overlay (Matching Desktop lines 452-466)
        if (isCcEnabled && activeSubtitleText.isNotEmpty() && !isIframe) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomCenter)
                    .padding(bottom = if (showControls) 115.dp else 45.dp, start = 32.dp, end = 32.dp),
                contentAlignment = Alignment.Center
            ) {
                Surface(
                    color = Color.Black.copy(alpha = 0.8f),
                    shape = RoundedCornerShape(8.dp),
                    border = BorderStroke(1.dp, Color.White.copy(alpha = 0.2f))
                ) {
                    Text(
                        text = activeSubtitleText,
                        color = Color.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
                    )
                }
            }
        }

        // Loading and Error Overlays
        if (isLoading || errorMessage != null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.85f)),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                    modifier = Modifier.padding(24.dp)
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(
                            color = EmeraldPrimary,
                            strokeWidth = 3.dp,
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "Fetching stream…",
                            color = Color.White.copy(alpha = 0.7f),
                            fontSize = 14.sp
                        )
                    } else if (errorMessage != null) {
                        Surface(
                            shape = CircleShape,
                            color = Color(0xFFEF4444).copy(alpha = 0.2f),
                            modifier = Modifier.size(64.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    Icons.Default.Warning,
                                    contentDescription = "Error",
                                    tint = Color(0xFFEF4444),
                                    modifier = Modifier.size(32.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "Playback Issue Detected",
                            color = Color.White,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 18.sp
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = errorMessage ?: "",
                            color = Color.White.copy(alpha = 0.6f),
                            fontSize = 13.sp,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                        if (allMirrors.size > 1) {
                            Spacer(modifier = Modifier.height(20.dp))
                            Button(
                                onClick = { switchMirror(currentMirrorIndex + 1) },
                                colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Icon(Icons.Default.Dns, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Try Next Mirror (${currentMirrorIndex + 1}/${allMirrors.size})", color = Color.Black, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }

        // ==========================================
        // TOP BAR (Matching Desktop lines 646-669 & 671-735)
        // ==========================================
        AnimatedVisibility(
            visible = showControls,
            enter = fadeIn(),
            exit = fadeOut(),
            modifier = Modifier.align(Alignment.TopCenter)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(Color.Black.copy(alpha = 0.85f), Color.Transparent)
                        )
                    )
                    .statusBarsPadding()
                    .displayCutoutPadding()
                    .padding(horizontal = 20.dp, vertical = 14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Left Title info
                Column(modifier = Modifier.weight(1f).padding(end = 12.dp)) {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White,
                        maxLines = 1,
                        overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "Episode $episodeString",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color.White.copy(alpha = 0.5f),
                            fontSize = 12.sp,
                            maxLines = 1
                        )
                        Text(text = " • ", color = Color.White.copy(alpha = 0.2f), fontSize = 12.sp)
                        Text(
                            text = "Mirror: $currentProvider",
                            style = MaterialTheme.typography.bodySmall,
                            color = EmeraldPrimary,
                            fontWeight = FontWeight.Medium,
                            fontSize = 12.sp,
                            maxLines = 1,
                            overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                        )
                    }
                }

                // Right Actions
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Mirror Switcher Pill
                    if (allMirrors.size > 1) {
                        Surface(
                            color = EmeraldPrimary.copy(alpha = 0.2f),
                            shape = RoundedCornerShape(20.dp),
                            border = BorderStroke(1.dp, EmeraldPrimary.copy(alpha = 0.4f)),
                            modifier = Modifier.clickable { switchMirror(currentMirrorIndex + 1) }
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Icon(Icons.Default.Dns, contentDescription = null, tint = EmeraldPrimary, modifier = Modifier.size(14.dp))
                                Text(
                                    text = "MIRROR ${currentMirrorIndex + 1}/${allMirrors.size}",
                                    color = EmeraldPrimary,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 0.5.sp
                                )
                            }
                        }
                    }

                    // Fullscreen / Landscape Toggle
                    Surface(
                        color = Color.White.copy(alpha = 0.15f),
                        shape = CircleShape,
                        modifier = Modifier
                            .size(36.dp)
                            .clickable { toggleFullscreen() }
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = if (isLandscape) Icons.Default.FullscreenExit else Icons.Default.Fullscreen,
                                contentDescription = "Toggle Fullscreen",
                                tint = Color.White,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }

                    // Close Button
                    Surface(
                        color = Color.White.copy(alpha = 0.15f),
                        shape = CircleShape,
                        modifier = Modifier
                            .size(36.dp)
                            .clickable { exitPlayer() }
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.White, modifier = Modifier.size(18.dp))
                        }
                    }
                }
            }
        }

        // ==========================================
        // BOTTOM CONTROLS BAR (Responsive for Portrait & Landscape)
        // ==========================================
        if (!isIframe) {
            AnimatedVisibility(
                visible = showControls,
                enter = fadeIn(),
                exit = fadeOut(),
                modifier = Modifier.align(Alignment.BottomCenter)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.7f), Color.Black)
                            )
                        )
                        .navigationBarsPadding()
                        .displayCutoutPadding()
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                ) {
                    // Custom Desktop-Style Progress Bar
                    val progressFraction = if (durationMs > 0) {
                        if (isDraggingSlider) sliderPosition else (currentPositionMs.toFloat() / durationMs.toFloat()).coerceIn(0f, 1f)
                    } else 0f

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(28.dp)
                            .pointerInput(durationMs) {
                                detectTapGestures { offset ->
                                    val newFraction = (offset.x / size.width).coerceIn(0f, 1f)
                                    val targetMs = (newFraction * durationMs).toLong()
                                    exoPlayer.seekTo(targetMs)
                                    currentPositionMs = targetMs
                                }
                            },
                        contentAlignment = Alignment.Center
                    ) {
                        // Track background
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(6.dp)
                                .clip(RoundedCornerShape(3.dp))
                                .background(Color.White.copy(alpha = 0.2f))
                        ) {
                            // Emerald progress fill
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth(progressFraction)
                                    .fillMaxHeight()
                                    .clip(RoundedCornerShape(3.dp))
                                    .background(EmeraldPrimary)
                            )
                        }
                    }

                    // Buttons Row (Responsive: adjusts spacing & elements so Quality button NEVER wraps)
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(if (isLandscape) 10.dp else 4.dp)
                    ) {
                        // Prev Episode
                        IconButton(
                            onClick = { onEpisodeChange((currentEpNum - 1).toString()) },
                            enabled = hasPrev,
                            modifier = Modifier.size(if (isLandscape) 34.dp else 28.dp)
                        ) {
                            Icon(
                                Icons.Default.SkipPrevious,
                                contentDescription = "Prev Episode",
                                tint = if (hasPrev) Color.White.copy(alpha = 0.7f) else Color.White.copy(alpha = 0.25f),
                                modifier = Modifier.size(if (isLandscape) 22.dp else 18.dp)
                            )
                        }

                        // Play/Pause
                        IconButton(
                            onClick = {
                                if (isPlaying) exoPlayer.pause() else exoPlayer.play()
                            },
                            modifier = Modifier.size(if (isLandscape) 36.dp else 30.dp)
                        ) {
                            Icon(
                                imageVector = if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                                contentDescription = if (isPlaying) "Pause" else "Play",
                                tint = EmeraldPrimary,
                                modifier = Modifier.size(if (isLandscape) 28.dp else 22.dp)
                            )
                        }

                        // Next Episode
                        IconButton(
                            onClick = { onEpisodeChange((currentEpNum + 1).toString()) },
                            enabled = hasNext,
                            modifier = Modifier.size(if (isLandscape) 34.dp else 28.dp)
                        ) {
                            Icon(
                                Icons.Default.SkipNext,
                                contentDescription = "Next Episode",
                                tint = if (hasNext) Color.White.copy(alpha = 0.7f) else Color.White.copy(alpha = 0.25f),
                                modifier = Modifier.size(if (isLandscape) 22.dp else 18.dp)
                            )
                        }

                        // Skip -10s and +10s (only shown in landscape to prevent crowding on portrait phones)
                        if (isLandscape) {
                            Text(
                                text = "< 10s",
                                color = Color.White.copy(alpha = 0.6f),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                                modifier = Modifier
                                    .clickable {
                                        val target = (exoPlayer.currentPosition - 10000).coerceAtLeast(0)
                                        exoPlayer.seekTo(target)
                                        currentPositionMs = target
                                    }
                                    .padding(horizontal = 4.dp, vertical = 4.dp)
                            )

                            Text(
                                text = "10s >",
                                color = Color.White.copy(alpha = 0.6f),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                                modifier = Modifier
                                    .clickable {
                                        val target = (exoPlayer.currentPosition + 10000).coerceAtMost(durationMs)
                                        exoPlayer.seekTo(target)
                                        currentPositionMs = target
                                    }
                                    .padding(horizontal = 4.dp, vertical = 4.dp)
                            )
                        }

                        // Time display
                        Text(
                            text = "${formatTime(currentPositionMs)} / ${formatTime(durationMs)}",
                            color = Color.White.copy(alpha = 0.6f),
                            fontSize = if (isLandscape) 12.sp else 10.sp,
                            fontFamily = FontFamily.Monospace,
                            maxLines = 1,
                            softWrap = false
                        )

                        Spacer(modifier = Modifier.weight(1f))

                        // CC Toggle Pill (Desktop style)
                        Surface(
                            color = EmeraldPrimary.copy(alpha = 0.2f),
                            shape = RoundedCornerShape(4.dp),
                            border = BorderStroke(1.dp, EmeraldPrimary.copy(alpha = 0.3f)),
                            modifier = Modifier.clickable {
                                isCcEnabled = !isCcEnabled
                            }
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = if (isLandscape) 8.dp else 6.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "CC",
                                    color = EmeraldPrimary.copy(alpha = 0.6f),
                                    fontSize = 8.sp,
                                    fontWeight = FontWeight.Black,
                                    letterSpacing = 0.5.sp,
                                    maxLines = 1,
                                    softWrap = false
                                )
                                Spacer(modifier = Modifier.width(3.dp))
                                Text(
                                    text = if (isCcEnabled) "ON" else "OFF",
                                    color = EmeraldPrimary,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 1,
                                    softWrap = false
                                )
                            }
                        }

                        // Quality Pill (Desktop style) - Fixed: never wraps character-by-character
                        Surface(
                            color = EmeraldPrimary.copy(alpha = 0.2f),
                            shape = RoundedCornerShape(4.dp),
                            border = BorderStroke(1.dp, EmeraldPrimary.copy(alpha = 0.3f))
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = if (isLandscape) 8.dp else 6.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                if (isLandscape) {
                                    Text(
                                        text = "QUALITY",
                                        color = EmeraldPrimary.copy(alpha = 0.6f),
                                        fontSize = 8.sp,
                                        fontWeight = FontWeight.Black,
                                        letterSpacing = 0.5.sp,
                                        maxLines = 1,
                                        softWrap = false
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                }
                                Text(
                                    text = "1080p",
                                    color = EmeraldPrimary,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 1,
                                    softWrap = false
                                )
                            }
                        }

                        // Fullscreen Toggle
                        IconButton(
                            onClick = { toggleFullscreen() },
                            modifier = Modifier.size(if (isLandscape) 34.dp else 28.dp)
                        ) {
                            Icon(
                                imageVector = if (isLandscape) Icons.Default.FullscreenExit else Icons.Default.Fullscreen,
                                contentDescription = "Toggle Fullscreen",
                                tint = Color.White.copy(alpha = 0.7f),
                                modifier = Modifier.size(if (isLandscape) 20.dp else 18.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}
