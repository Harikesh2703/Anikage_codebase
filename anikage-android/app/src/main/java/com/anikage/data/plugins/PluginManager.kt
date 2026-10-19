package com.anikage.data.plugins

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File

class PluginManager private constructor() {

    private val _plugins = mutableMapOf<String, AnimeScraper>()
    private val _activePluginId = MutableStateFlow<String?>(null)

    val activePluginId: StateFlow<String?> = _activePluginId.asStateFlow()
    
    private val client = OkHttpClient()
    private var isInitialized = false

    /**
     * Initializes the manager by loading pre-bundled JS plugins from assets,
     * and any downloaded plugins from internal storage.
     */
    suspend fun init(context: Context) = withContext(Dispatchers.IO) {
        if (isInitialized) return@withContext
        
        // 1. Load from assets (Bundled plugins like hianime.js and anikoto.js)
        try {
            val assetManager = context.assets
            val pluginFiles = assetManager.list("plugins") ?: emptyArray()
            for (file in pluginFiles) {
                if (file.endsWith(".js")) {
                    val jsSource = assetManager.open("plugins/$file").bufferedReader().use { it.readText() }
                    val id = file.removeSuffix(".js")
                    registerPlugin(QuickJsPluginWrapper(id, id.replaceFirstChar { it.uppercase() }, "1.0", jsSource))
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // 2. Load from internal storage (Downloaded plugins)
        val pluginsDir = File(context.filesDir, "plugins")
        if (!pluginsDir.exists()) pluginsDir.mkdirs()
        
        pluginsDir.listFiles()?.forEach { file ->
            if (file.extension == "js") {
                val jsSource = file.readText()
                val id = file.nameWithoutExtension
                registerPlugin(QuickJsPluginWrapper(id, id.replaceFirstChar { it.uppercase() }, "1.0", jsSource))
            }
        }
        
        isInitialized = true
    }

    /**
     * Installs a raw JS plugin from source string, saves it to internal storage, and loads it.
     */
    suspend fun installPluginFromSource(context: Context, pluginId: String, jsSource: String, version: String = "1.0"): Boolean = withContext(Dispatchers.IO) {
        try {
            val sanitizedId = pluginId.trim().lowercase().replace(Regex("[^a-z0-9_-]"), "_")
            if (sanitizedId.isEmpty()) return@withContext false

            val wrapper = QuickJsPluginWrapper(
                id = sanitizedId,
                name = sanitizedId.replaceFirstChar { it.uppercase() },
                version = version,
                jsSourceCode = jsSource
            )

            // Save to internal storage
            val pluginsDir = File(context.filesDir, "plugins")
            if (!pluginsDir.exists()) pluginsDir.mkdirs()

            val file = File(pluginsDir, "$sanitizedId.js")
            file.writeText(jsSource)

            registerPlugin(wrapper)
            _activePluginId.value = sanitizedId
            return@withContext true
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext false
        }
    }

    /**
     * Deletes a plugin from internal storage and unregisters it.
     */
    suspend fun deletePlugin(context: Context, pluginId: String): Boolean = withContext(Dispatchers.IO) {
        try {
            val pluginsDir = File(context.filesDir, "plugins")
            val file = File(pluginsDir, "$pluginId.js")
            if (file.exists()) {
                file.delete()
            }

            _plugins.remove(pluginId)
            if (_activePluginId.value == pluginId) {
                _activePluginId.value = _plugins.keys.firstOrNull()
            }
            return@withContext true
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext false
        }
    }

    /**
     * Downloads a raw JS plugin from a URL, saves it to internal storage, and loads it.
     */
    suspend fun downloadAndInstallPlugin(context: Context, pluginId: String, url: String, version: String): Boolean = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder().url(url).build()
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) return@withContext false
                
                val jsSource = response.body?.string() ?: return@withContext false
                return@withContext installPluginFromSource(context, pluginId, jsSource, version)
            }
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext false
        }
    }

    fun registerPlugin(plugin: AnimeScraper) {
        _plugins[plugin.id] = plugin
        if (_activePluginId.value == null) {
            _activePluginId.value = plugin.id
        }
    }

    fun getPlugins(): List<AnimeScraper> {
        return _plugins.values.toList()
    }

    fun setActivePlugin(id: String) {
        if (_plugins.containsKey(id)) {
            _activePluginId.value = id
        } else {
            throw IllegalArgumentException("Plugin $id not found")
        }
    }

    fun getActiveScraper(): AnimeScraper? {
        return _activePluginId.value?.let { _plugins[it] } ?: _plugins.values.firstOrNull()
    }

    fun getPlugin(id: String): AnimeScraper? {
        return _plugins[id]
    }

    suspend fun resolveEpisodes(showId: String, title: String = ""): List<String> {
        val scraper = getActiveScraper()
        var targetId = showId

        if (showId.startsWith("anilist:") && title.isNotEmpty() && scraper != null) {
            try {
                val found = scraper.searchAnime(title)
                if (found.isNotEmpty()) {
                    targetId = found[0].id
                }
            } catch (e: Exception) {}
        }

        if (scraper != null) {
            try {
                val eps = scraper.getEpisodesList(targetId)
                if (eps.isNotEmpty()) return eps
            } catch (e: Exception) {}
        }

        // Cross-provider fallback
        for (other in _plugins.values) {
            if (other.id == scraper?.id) continue
            try {
                var otherId = showId
                if (title.isNotEmpty()) {
                    val found = other.searchAnime(title)
                    if (found.isNotEmpty()) otherId = found[0].id
                }
                val eps = other.getEpisodesList(otherId)
                if (eps.isNotEmpty()) return eps
            } catch (e: Exception) {}
        }

        return emptyList()
    }

    companion object {
        @Volatile
        private var instance: PluginManager? = null

        fun getInstance(): PluginManager {
            return instance ?: synchronized(this) {
                instance ?: PluginManager().also { instance = it }
            }
        }
    }
}
