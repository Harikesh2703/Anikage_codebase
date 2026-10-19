package com.anikage.data.history

import android.content.Context
import android.content.SharedPreferences
import com.anikage.ui.components.AnimeItem
import org.json.JSONArray
import org.json.JSONObject

/**
 * Manages persistent watch history and playback progress across sessions.
 * Matches desktop watch history storage.
 */
object WatchHistoryRepository {
    private const val PREF_NAME = "anikage_watch_history"
    private const val KEY_HISTORY = "history_entries"

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
    }

    /**
     * Saves or updates watch progress for a given anime episode.
     */
    fun saveProgress(
        context: Context,
        id: String,
        title: String,
        episode: String,
        currentPositionMs: Long,
        durationMs: Long,
        imageUrl: String = "",
        bannerUrl: String = ""
    ) {
        if (id.isEmpty() || title.isEmpty() || durationMs <= 0) return

        try {
            val prefs = getPrefs(context)
            val jsonStr = prefs.getString(KEY_HISTORY, "[]") ?: "[]"
            val array = JSONArray(jsonStr)

            val progressFraction = (currentPositionMs.toFloat() / durationMs.toFloat()).coerceIn(0f, 1f)

            // Remove existing entry for same show if present
            val updatedList = mutableListOf<JSONObject>()
            for (i in 0 until array.length()) {
                val obj = array.getJSONObject(i)
                if (obj.optString("id") != id) {
                    updatedList.add(obj)
                }
            }

            // Create new entry
            val newEntry = JSONObject().apply {
                put("id", id)
                put("title", title)
                put("episode", episode)
                put("currentPositionMs", currentPositionMs)
                put("durationMs", durationMs)
                put("progress", progressFraction)
                put("imageUrl", imageUrl)
                put("bannerUrl", bannerUrl)
                put("updatedAt", System.currentTimeMillis())
            }

            // Prepend new entry so most recently watched appears first
            updatedList.add(0, newEntry)

            // Keep top 20 items
            val finalArray = JSONArray()
            for (i in 0 until minOf(20, updatedList.size)) {
                finalArray.put(updatedList[i])
            }

            prefs.edit().putString(KEY_HISTORY, finalArray.toString()).apply()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    /**
     * Retrieves the list of recently watched anime for the "Continue Watching" row.
     */
    fun getContinueWatching(context: Context): List<AnimeItem> {
        return try {
            val prefs = getPrefs(context)
            val jsonStr = prefs.getString(KEY_HISTORY, "[]") ?: "[]"
            val array = JSONArray(jsonStr)
            val list = mutableListOf<AnimeItem>()

            for (i in 0 until array.length()) {
                val obj = array.getJSONObject(i)
                val id = obj.optString("id")
                val title = obj.optString("title")
                val episode = obj.optString("episode", "1")
                val progress = obj.optDouble("progress", 0.0).toFloat()
                val imageUrl = obj.optString("imageUrl")
                val bannerUrl = obj.optString("bannerUrl")

                list.add(
                    AnimeItem(
                        id = id,
                        title = title,
                        genres = listOf("Action", "Anime"),
                        imageUrl = imageUrl.ifEmpty { bannerUrl },
                        bannerUrl = bannerUrl.ifEmpty { imageUrl },
                        episodeInfo = "Episode $episode",
                        progress = progress
                    )
                )
            }
            list
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }

    /**
     * Clears all watch history.
     */
    fun clearHistory(context: Context) {
        getPrefs(context).edit().remove(KEY_HISTORY).apply()
    }
}
