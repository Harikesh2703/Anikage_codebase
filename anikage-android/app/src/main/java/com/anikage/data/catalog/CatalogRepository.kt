package com.anikage.data.catalog

import android.util.Log
import com.anikage.data.plugins.AnimeItem
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Decoupled catalog repository querying AniList GraphQL for high quality metadata,
 * distinct genre rows, covers, banners, and accurate episode counts.
 */
class CatalogRepository private constructor() {

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    private val cache = mutableMapOf<String, List<AnimeItem>>()

    suspend fun getCatalog(genre: String? = null, perPage: Int = 20, sort: String = "TRENDING_DESC"): List<AnimeItem> = withContext(Dispatchers.IO) {
        val cacheKey = "${genre ?: "all"}:$perPage:$sort"
        if (cache.containsKey(cacheKey)) {
            return@withContext cache[cacheKey] ?: emptyList()
        }

        val query = """
            query (${'$'}page: Int, ${'$'}perPage: Int, ${'$'}genre: String, ${'$'}sort: [MediaSort]) {
              Page(page: ${'$'}page, perPage: ${'$'}perPage) {
                media(type: ANIME, sort: ${'$'}sort, genre: ${'$'}genre, isAdult: false) {
                  id
                  title {
                    romaji
                    english
                    native
                  }
                  coverImage {
                    extraLarge
                    large
                  }
                  bannerImage
                  description
                  genres
                  format
                  episodes
                }
              }
            }
        """.trimIndent()

        val variables = JSONObject().apply {
            put("page", 1)
            put("perPage", perPage)
            if (genre != null) put("genre", genre)
            put("sort", JSONArray().put(sort))
        }

        val requestBodyJson = JSONObject().apply {
            put("query", query)
            put("variables", variables)
        }

        val mediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
        val request = Request.Builder()
            .url("https://graphql.anilist.co")
            .header("Content-Type", "application/json")
            .header("Accept", "application/json")
            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
            .post(requestBodyJson.toString().toRequestBody(mediaType))
            .build()

        try {
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    Log.w("CatalogRepository", "AniList responded with HTTP ${response.code}")
                    return@withContext emptyList()
                }
                val jsonStr = response.body?.string() ?: return@withContext emptyList()
                val jsonObj = JSONObject(jsonStr)
                val mediaArr = jsonObj.optJSONObject("data")?.optJSONObject("Page")?.optJSONArray("media")
                    ?: return@withContext emptyList()

                fun JSONObject.optCleanString(name: String, fallback: String = ""): String {
                    if (isNull(name)) return fallback
                    val s = optString(name, fallback).trim()
                    return if (s.isEmpty() || s.equals("null", ignoreCase = true)) fallback else s
                }

                val items = mutableListOf<AnimeItem>()
                for (i in 0 until mediaArr.length()) {
                    val m = mediaArr.getJSONObject(i)
                    val titleObj = m.optJSONObject("title")
                    val preferredTitle = titleObj?.optCleanString("english")?.takeIf { it.isNotEmpty() }
                        ?: titleObj?.optCleanString("romaji")?.takeIf { it.isNotEmpty() }
                        ?: titleObj?.optCleanString("native")?.takeIf { it.isNotEmpty() }
                        ?: "Unknown"

                    val coverObj = m.optJSONObject("coverImage")
                    val cover = coverObj?.optCleanString("extraLarge")?.takeIf { it.isNotEmpty() }
                        ?: coverObj?.optCleanString("large")?.takeIf { it.isNotEmpty() }
                        ?: ""

                    val banner = m.optCleanString("bannerImage").takeIf { it.isNotEmpty() } ?: cover
                    val rawDesc = m.optCleanString("description")
                    val cleanDesc = rawDesc.replace(Regex("<[^>]*>"), "")

                    val genresArr = m.optJSONArray("genres")
                    val genresList = mutableListOf<String>()
                    if (genresArr != null) {
                        for (g in 0 until genresArr.length()) {
                            val genreStr = genresArr.optString(g, "").trim()
                            if (genreStr.isNotEmpty() && !genreStr.equals("null", ignoreCase = true)) {
                                genresList.add(genreStr)
                            }
                        }
                    }

                    items.add(
                        AnimeItem(
                            id = "anilist:${m.getInt("id")}",
                            name = preferredTitle,
                            thumbnail = cover.ifEmpty { banner },
                            banner = banner.ifEmpty { cover },
                            description = cleanDesc,
                            type = m.optCleanString("format", "TV"),
                            episodes = m.optInt("episodes", 0),
                            genres = genresList
                        )
                    )
                }

                if (items.isNotEmpty()) {
                    cache[cacheKey] = items
                }
                return@withContext items
            }
        } catch (e: Exception) {
            Log.e("CatalogRepository", "Failed to fetch AniList catalog: ${e.message}")
            return@withContext emptyList()
        }
    }

    companion object {
        @Volatile
        private var instance: CatalogRepository? = null

        fun getInstance(): CatalogRepository {
            return instance ?: synchronized(this) {
                instance ?: CatalogRepository().also { instance = it }
            }
        }
    }
}
