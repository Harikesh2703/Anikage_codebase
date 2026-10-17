package com.example.anikage.data.plugins

data class AnimeItem(
    val id: String,
    val name: String,
    val thumbnail: String,
    val banner: String = "",
    val description: String = "",
    val type: String = "TV",
    val episodes: Int = 0,
    val genres: List<String> = emptyList()
)

data class VideoLink(
    val quality: String,
    val url: String,
    val provider: String,
    val subtitles: List<Subtitle> = emptyList()
)

data class Subtitle(
    val label: String,
    val url: String,
    val lang: String,
    val isDefault: Boolean = false
)

interface AnimeScraper {
    val id: String
    val name: String
    val version: String

    suspend fun searchAnime(query: String): List<AnimeItem>
    suspend fun getTrending(): List<AnimeItem>
    suspend fun getEpisodesList(showId: String): List<String>
    suspend fun getEpisodeEmbedUrls(showId: String, episodeString: String): Map<String, String>
    suspend fun getVideoLinks(providerId: String, providerName: String): List<VideoLink>
}
