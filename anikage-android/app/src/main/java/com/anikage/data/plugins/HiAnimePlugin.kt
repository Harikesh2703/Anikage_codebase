package com.anikage.data.plugins

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.jsoup.Jsoup
import java.util.concurrent.TimeUnit

class HiAnimePlugin : AnimeScraper {
    override val id: String = "hianime"
    override val name: String = "HiAnime"
    override val version: String = "1.0.1"

    private val apiUrl = "https://hianime.to" // The current working domain for HiAnime
    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    private val userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0"

    private suspend fun fetchHtml(url: String): String = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url(url)
            .header("User-Agent", userAgent)
            .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8")
            .header("Accept-Language", "en-US,en;q=0.5")
            .build()
            
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) throw Exception("HTTP ${response.code}")
            response.body?.string() ?: throw Exception("Empty body")
        }
    }

    override suspend fun searchAnime(query: String): List<AnimeItem> = withContext(Dispatchers.IO) {
        val url = "$apiUrl/search?keyword=${java.net.URLEncoder.encode(query, "UTF-8")}"
        val html = fetchHtml(url)
        val doc = Jsoup.parse(html)
        val shows = mutableListOf<AnimeItem>()

        val elements = doc.select("#main-content .film_list-wrap .flw-item")
        for (el in elements) {
            val aTag = el.selectFirst("a.dynamic-name")
            val href = aTag?.attr("href") ?: ""
            val id = href.substringBefore("?").split("/").filter { it.isNotEmpty() }.lastOrNull() ?: continue
            val title = aTag?.text()?.trim()?.takeIf { it.isNotEmpty() } ?: aTag?.attr("title") ?: "Unknown Title"
            val imgTag = el.selectFirst("img.film-poster-img")
            val thumbnail = imgTag?.attr("src")?.takeIf { it.isNotEmpty() } ?: imgTag?.attr("data-src") ?: ""
            val type = el.select(".fdi-item").firstOrNull()?.text()?.trim() ?: "TV"
            val epsStr = el.selectFirst(".tick-eps")?.text()?.trim() 
                ?: el.selectFirst(".tick-sub")?.text()?.trim() ?: "0"
            val eps = epsStr.filter { it.isDigit() }.toIntOrNull() ?: 0

            if (title.isNotEmpty()) {
                shows.add(
                    AnimeItem(
                        id = id,
                        name = title,
                        thumbnail = thumbnail,
                        banner = thumbnail,
                        type = type,
                        episodes = eps
                    )
                )
            }
        }
        
        shows
    }

    // For home screen trending, since search doesn't return trending
    override suspend fun getTrending(): List<AnimeItem> = withContext(Dispatchers.IO) {
        val url = "$apiUrl/home"
        val html = fetchHtml(url)
        val doc = Jsoup.parse(html)
        val shows = mutableListOf<AnimeItem>()

        // Trending usually uses .flw-item in #trending-home or similar
        val elements = doc.select(".flw-item")
        for (el in elements.take(15)) {
            val aTag = el.selectFirst("a.dynamic-name") ?: continue
            val href = aTag.attr("href")
            val id = href.substringBefore("?").split("/").filter { it.isNotEmpty() }.lastOrNull() ?: continue
            val title = aTag.text().trim().takeIf { it.isNotEmpty() } ?: aTag.attr("title")
            val imgTag = el.selectFirst("img.film-poster-img")
            val thumbnail = imgTag?.attr("src")?.takeIf { it.isNotEmpty() } ?: imgTag?.attr("data-src") ?: ""

            if (title.isNotEmpty()) {
                shows.add(
                    AnimeItem(
                        id = id,
                        name = title,
                        thumbnail = thumbnail,
                        banner = thumbnail
                    )
                )
            }
        }
        shows
    }

    override suspend fun getEpisodesList(showId: String): List<String> = withContext(Dispatchers.IO) {
        val showIdNumeric = showId.split("-").lastOrNull() ?: return@withContext emptyList()
        val url = "$apiUrl/ajax/v2/episode/list/$showIdNumeric"
        val responseText = fetchHtml(url)
        // Basic extraction from JSON response containing HTML
        val htmlContent = responseText.substringAfter("\"html\":\"").substringBefore("\"}").replace("\\\"", "\"").replace("\\n", "\n")
        val doc = Jsoup.parse(htmlContent)
        
        val episodes = mutableListOf<String>()
        doc.select(".ep-item").forEach { el ->
            el.attr("data-number").takeIf { it.isNotEmpty() }?.let { episodes.add(it) }
        }
        
        episodes.mapNotNull { it.toFloatOrNull() }.sorted().map {
            if (it % 1 == 0f) it.toInt().toString() else it.toString()
        }
    }

    override suspend fun getEpisodeEmbedUrls(showId: String, episodeString: String): Map<String, String> {
        // Full extraction logic is complex for this stub due to requiring base64 decode and AJAX,
        // but this shows how it would be structured.
        return mapOf("HiAnime" to "$apiUrl/watch/$showId?ep=$episodeString")
    }

    override suspend fun getVideoLinks(providerId: String, providerName: String): List<VideoLink> {
        // Returns the provider ID as a fallback video URL for now, since unpacking RabbitStream/Megacloud is complex
        return listOf(
            VideoLink(
                quality = "auto",
                url = providerId,
                provider = providerName
            )
        )
    }
}
