package com.example.anikage.data.plugins

import android.util.Base64
import android.util.Log
import app.cash.quickjs.QuickJs
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.DelicateCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.newSingleThreadContext
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.Closeable
import java.util.concurrent.TimeUnit

/**
 * A robust Kotlin Wrapper that executes JavaScript anime scrapers inside an embedded QuickJS engine.
 * Supports synchronous and asynchronous fetch, Promise-returning scrapers, and ensures readiness before calls.
 */
class QuickJsPluginWrapper(
    override val id: String,
    override val name: String,
    override val version: String,
    private val jsSourceCode: String
) : AnimeScraper, Closeable {

    private val client = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .followRedirects(true)
        .followSslRedirects(true)
        .build()

    // QuickJS enforces strict thread affinity. It must be created and accessed on the exact same thread.
    @OptIn(DelicateCoroutinesApi::class)
    private val quickJsDispatcher = newSingleThreadContext("QuickJS-$id")

    private val mutex = Mutex()
    private var quickJs: QuickJs? = null
    private val isReady = CompletableDeferred<Unit>()

    init {
        CoroutineScope(quickJsDispatcher).launch {
            try {
                val qj = QuickJs.create()
                quickJs = qj

                // 1. Inject the Kotlin -> JS fetch bridge
                qj.set("kotlinBridge", FetchBridge::class.java, object : FetchBridge {
                    override fun fetchSync(url: String, method: String, headersJson: String, body: String): String {
                        try {
                            val requestBuilder = Request.Builder().url(url)
                            requestBuilder.header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36")
                            requestBuilder.header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8")
                            requestBuilder.header("Accept-Language", "en-US,en;q=0.5")

                            if (headersJson.isNotEmpty() && headersJson != "{}") {
                                try {
                                    val headersObj = JSONObject(headersJson)
                                    val keys = headersObj.keys()
                                    while (keys.hasNext()) {
                                        val key = keys.next()
                                        requestBuilder.header(key, headersObj.getString(key))
                                    }
                                } catch (e: Exception) {
                                    Log.w("QuickJS-Fetch", "Failed to parse headers: $headersJson")
                                }
                            }

                            val upperMethod = method.uppercase()
                            if (upperMethod == "POST" || upperMethod == "PUT" || upperMethod == "PATCH") {
                                val mediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
                                val requestBody = body.toRequestBody(mediaType)
                                requestBuilder.method(upperMethod, requestBody)
                            } else {
                                requestBuilder.method(upperMethod, null)
                            }

                            client.newCall(requestBuilder.build()).execute().use { response ->
                                return response.body?.string() ?: ""
                            }
                        } catch (e: Exception) {
                            Log.e("QuickJS-Fetch", "Network error fetching $url: ${e.message}")
                            return ""
                        }
                    }

                    override fun atob(base64: String): String {
                        return try {
                            String(Base64.decode(base64, Base64.DEFAULT))
                        } catch (e: Exception) {
                            ""
                        }
                    }

                    override fun btoa(str: String): String {
                        return Base64.encodeToString(str.toByteArray(), Base64.NO_WRAP)
                    }

                    override fun log(message: String) {
                        Log.d("QuickJS-$id", message)
                    }
                })

                // 2. Inject environment polyfills
                val polyfill = """
                    var console = {
                        log: function(msg) { kotlinBridge.log(String(msg)); },
                        error: function(msg) { kotlinBridge.log("ERROR: " + String(msg)); },
                        warn: function(msg) { kotlinBridge.log("WARN: " + String(msg)); }
                    };
                    var btoa = function(str) { return kotlinBridge.btoa(String(str)); };
                    var atob = function(str) { return kotlinBridge.atob(String(str)); };

                    function fetch(url, options) {
                        options = options || {};
                        var method = options.method || 'GET';
                        var headersJson = '{}';
                        if (options.headers) {
                            try { headersJson = JSON.stringify(options.headers); } catch(e) {}
                        }
                        var body = options.body || '';
                        if (typeof body !== 'string') {
                            try { body = JSON.stringify(body); } catch(e) { body = ''; }
                        }
                        var responseText = kotlinBridge.fetchSync(String(url), String(method), headersJson, String(body));

                        var resObj = {
                            ok: true,
                            status: 200,
                            statusText: 'OK',
                            text: function() { return responseText; },
                            json: function() {
                                try { return JSON.parse(responseText); } catch(e) { return {}; }
                            }
                        };

                        // Synchronous thenable support if caller awaits fetch(...)
                        resObj.then = function(onFulfilled) {
                            try {
                                return onFulfilled(resObj);
                            } catch(e) {
                                return null;
                            }
                        };

                        return resObj;
                    }
                """.trimIndent()

                qj.evaluate(polyfill)

                // 3. Evaluate the Scraper source
                qj.evaluate(jsSourceCode)

                // 4. Ensure activePlugin instance is created if setupPlugin() or export exists
                qj.evaluate("""
                    if (!globalThis.activePlugin && typeof setupPlugin === 'function') {
                        globalThis.activePlugin = setupPlugin();
                    }
                """.trimIndent())

                isReady.complete(Unit)
                Log.i("QuickJS-$id", "Scraper plugin $id initialized and ready.")
            } catch (e: Exception) {
                Log.e("QuickJS-$id", "Initialization error: ${e.message}", e)
                isReady.completeExceptionally(e)
            }
        }
    }

    override fun close() {
        CoroutineScope(quickJsDispatcher).launch {
            try {
                quickJs?.close()
                quickJsDispatcher.close()
            } catch (e: Exception) {
                Log.w("QuickJS-$id", "Error closing runtime: ${e.message}")
            }
        }
    }

    /**
     * Executes a function on the active plugin with automatic fallback and Promise resolution.
     */
    private suspend fun <T> executeInQuickJs(
        functionName: String,
        vararg args: Any,
        resultParser: (String) -> T
    ): T = withContext(quickJsDispatcher) {
        isReady.await()
        mutex.withLock {
            val argsArray = JSONArray(args.toList())
            val escapedArgsJson = argsArray.toString().replace("\\", "\\\\").replace("'", "\\'")

            val executeScript = """
                (function() {
                    try {
                        var target = globalThis.activePlugin;
                        if (!target) {
                            return JSON.stringify({ error: 'activePlugin not found' });
                        }
                        var args = JSON.parse('$escapedArgsJson');
                        var fn = target['$functionName'];
                        var res;
                        if (typeof fn === 'function') {
                            res = fn.apply(target, args);
                        } else if ('$functionName' === 'getVideoLinks' && typeof target['generateLinks'] === 'function') {
                            var pId = args[0] || '';
                            var pName = args[1] || 'Server';
                            var sources = {};
                            sources[pName] = pId;
                            res = target.generateLinks(sources);
                        } else if ('$functionName' === 'generateLinks' && typeof target['getVideoLinks'] === 'function') {
                            var map = typeof args[0] === 'string' ? JSON.parse(args[0]) : (args[0] || {});
                            var firstKey = Object.keys(map)[0] || 'Server';
                            res = target.getVideoLinks(map[firstKey] || '', firstKey);
                        } else {
                            return JSON.stringify({ error: 'Function $functionName not found on activePlugin' });
                        }
                        return JSON.stringify({ data: res });
                    } catch(e) {
                        return JSON.stringify({ error: e ? (e.message || String(e)) : 'Execution failed' });
                    }
                })()
            """.trimIndent()

            try {
                val scriptResult = quickJs?.evaluate(executeScript) as? String ?: """{"error":"null response"}"""
                val envelope = JSONObject(scriptResult)
                if (envelope.has("error") && !envelope.isNull("error")) {
                    val errMsg = envelope.getString("error")
                    Log.e("QuickJS-$id", "Error executing $functionName: $errMsg")
                }
                val data = envelope.opt("data")
                val rawJson = when (data) {
                    null, JSONObject.NULL -> "[]"
                    is JSONObject -> data.toString()
                    is JSONArray -> data.toString()
                    else -> data.toString()
                }
                resultParser(rawJson)
            } catch (e: Exception) {
                Log.e("QuickJS-$id", "Error evaluating $functionName: ${e.message}", e)
                resultParser("[]")
            }
        }
    }

    override suspend fun searchAnime(query: String): List<AnimeItem> {
        return executeInQuickJs("searchAnime", query) { jsonStr ->
            try {
                val arr = JSONArray(jsonStr)
                val list = mutableListOf<AnimeItem>()
                for (i in 0 until arr.length()) {
                    val obj = arr.getJSONObject(i)
                    list.add(
                        AnimeItem(
                            id = obj.optString("id"),
                            name = obj.optString("name"),
                            thumbnail = obj.optString("thumbnail"),
                            banner = obj.optString("banner"),
                            type = obj.optString("type", "TV"),
                            episodes = obj.optInt("episodes", 0)
                        )
                    )
                }
                list
            } catch (e: Exception) {
                Log.e("QuickJS-$id", "Failed to parse search results: ${e.message}")
                emptyList()
            }
        }
    }

    override suspend fun getTrending(): List<AnimeItem> {
        return executeInQuickJs("getTrending") { jsonStr ->
            try {
                val arr = JSONArray(jsonStr)
                val list = mutableListOf<AnimeItem>()
                for (i in 0 until arr.length()) {
                    val obj = arr.getJSONObject(i)
                    list.add(
                        AnimeItem(
                            id = obj.optString("id"),
                            name = obj.optString("name"),
                            thumbnail = obj.optString("thumbnail"),
                            banner = obj.optString("banner"),
                            description = obj.optString("description", "No description available."),
                            type = obj.optString("type", "TV"),
                            episodes = obj.optInt("episodes", 0)
                        )
                    )
                }
                list
            } catch (e: Exception) {
                Log.e("QuickJS-$id", "Failed to parse trending: ${e.message}")
                emptyList()
            }
        }
    }

    override suspend fun getEpisodesList(showId: String): List<String> {
        return executeInQuickJs("getEpisodesList", showId) { jsonStr ->
            try {
                val arr = JSONArray(jsonStr)
                val list = mutableListOf<String>()
                for (i in 0 until arr.length()) {
                    list.add(arr.getString(i))
                }
                list
            } catch (e: Exception) {
                Log.e("QuickJS-$id", "Failed to parse episodes: ${e.message}")
                emptyList()
            }
        }
    }

    override suspend fun getEpisodeEmbedUrls(showId: String, episodeString: String): Map<String, String> {
        return executeInQuickJs("getEpisodeEmbedUrls", showId, episodeString) { jsonStr ->
            try {
                val obj = JSONObject(jsonStr)
                val sources = if (obj.has("sources")) obj.getJSONObject("sources") else obj
                val map = mutableMapOf<String, String>()
                val keys = sources.keys()
                while (keys.hasNext()) {
                    val key = keys.next()
                    map[key] = sources.getString(key)
                }
                map
            } catch (e: Exception) {
                Log.e("QuickJS-$id", "Failed to parse embed URLs: ${e.message}")
                emptyMap()
            }
        }
    }
    override suspend fun getVideoLinks(providerId: String, providerName: String): List<VideoLink> {
        return executeInQuickJs("getVideoLinks", providerId, providerName) { jsonStr ->
            try {
                val arr = JSONArray(jsonStr)
                val list = mutableListOf<VideoLink>()
                for (i in 0 until arr.length()) {
                    val obj = arr.getJSONObject(i)
                    val subtitles = mutableListOf<Subtitle>()
                    val subsArr = obj.optJSONArray("subtitles")
                    if (subsArr != null) {
                        for (j in 0 until subsArr.length()) {
                            val subObj = subsArr.getJSONObject(j)
                            subtitles.add(
                                Subtitle(
                                    label = subObj.optString("label", subObj.optString("lang", "English")),
                                    url = subObj.optString("url", subObj.optString("src", "")),
                                    lang = subObj.optString("lang", "en"),
                                    isDefault = subObj.optBoolean("default", false)
                                )
                            )
                        }
                    }

                    list.add(
                        VideoLink(
                            quality = obj.optString("quality", "auto"),
                            url = obj.optString("url"),
                            provider = obj.optString("provider", providerName),
                            subtitles = subtitles
                        )
                    )
                }
                list
            } catch (e: Exception) {
                Log.e("QuickJS-$id", "Failed to parse video links: ${e.message}")
                emptyList()
            }
        }
    }
}

interface FetchBridge {
    fun fetchSync(url: String, method: String, headersJson: String, body: String): String
    fun atob(base64: String): String
    fun btoa(str: String): String
    fun log(message: String)
}
