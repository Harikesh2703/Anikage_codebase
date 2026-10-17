const CATALOG_CACHE = new Map();

/**
 * Fetch catalog directly from AniList for discovery, categories, and hero slideshow
 */
export async function getCatalogAnime({ page = 1, perPage = 30, genre = null, sort = 'TRENDING_DESC' } = {}) {
  const cacheKey = `${page}:${perPage}:${genre || 'all'}:${sort}`;
  if (CATALOG_CACHE.has(cacheKey)) {
    return CATALOG_CACHE.get(cacheKey);
  }

  const query = `
    query ($page: Int, $perPage: Int, $genre: String, $sort: [MediaSort]) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: $sort, genre: $genre, isAdult: false) {
          id
          idMal
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
          averageScore
          episodes
          format
        }
      }
    }
  `;

  try {
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          page,
          perPage,
          genre: genre || undefined,
          sort: [sort]
        }
      })
    });

    if (!response.ok) {
      throw new Error(`AniList HTTP ${response.status}`);
    }

    const json = await response.json();
    const mediaList = json?.data?.Page?.media || [];

    const mapped = mediaList.map(m => {
      const preferredTitle = m.title.english || m.title.romaji || m.title.native || 'Unknown Anime';
      return {
        id: `anilist:${m.id}`,
        anilistId: m.id,
        malId: m.idMal,
        title: preferredTitle,
        romajiTitle: m.title.romaji,
        englishTitle: m.title.english,
        coverImage: m.coverImage?.extraLarge || m.coverImage?.large || '',
        banner: m.bannerImage || m.coverImage?.extraLarge || m.coverImage?.large || '',
        tags: m.genres || [],
        synopsis: (m.description || '').replace(/<[^>]*>/g, ''),
        score: m.averageScore ? m.averageScore / 10 : 0,
        type: m.format || 'TV',
        episodes: m.episodes || null,
        provider: 'catalog'
      };
    });

    if (mapped.length > 0) {
      CATALOG_CACHE.set(cacheKey, mapped);
      // Cache auto-expiry in 30 minutes
      setTimeout(() => CATALOG_CACHE.delete(cacheKey), 30 * 60 * 1000);
    }

    return mapped;
  } catch (err) {
    console.error(`[Metadata] Catalog fetch failed: ${err.message}`);
    return [];
  }
}

/**
 * Resolve an AniList ID to its English and Romaji titles
 */
export async function getAnimeTitleById(anilistId) {
  const cacheKey = `anilist:${anilistId}`;
  if (CATALOG_CACHE.has(cacheKey)) {
    return CATALOG_CACHE.get(cacheKey);
  }

  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id
        title {
          english
          romaji
          native
        }
      }
    }
  `;

  try {
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { id: parseInt(anilistId) }
      })
    });

    if (response.ok) {
      const json = await response.json();
      const media = json?.data?.Media;
      if (media?.title) {
        const titles = {
          english: media.title.english,
          romaji: media.title.romaji,
          native: media.title.native,
          preferred: media.title.english || media.title.romaji || media.title.native
        };
        CATALOG_CACHE.set(cacheKey, titles);
        return titles;
      }
    }
  } catch (err) {
    console.error(`[Metadata] getAnimeTitleById failed for ${anilistId}:`, err.message);
  }
  return null;
}

/**
 * Enriches a list of anime objects (from any scraper) with high-quality metadata from AniList.
 * @param {Array} animeList Array of anime objects `{ id, name, thumbnail, banner, description, ... }`
 * @returns {Promise<Array>} Enriched array
 */
export async function enrichAnimeList(animeList) {
  if (!animeList || !Array.isArray(animeList) || animeList.length === 0) {
    return [];
  }

  const enriched = await Promise.all(animeList.map(async (anime) => {
    if (!anime.name) return anime;

    const cacheKey = anime.name.toLowerCase().trim();
    
    // Check in-memory cache
    if (CACHE.has(cacheKey)) {
      const cached = CACHE.get(cacheKey);
      return { ...anime, ...cached };
    }

    try {
      const query = `
        query ($search: String) {
          Media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
            id
            idMal
            title {
              romaji
              english
            }
            coverImage {
              large
              extraLarge
            }
            bannerImage
            description
            genres
            averageScore
            episodes
          }
        }
      `;

      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: { search: anime.name }
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.warn(`[Metadata] AniList Rate Limit reached for ${anime.name}`);
          return anime;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();
      const media = json?.data?.Media;

      if (media) {
        const metadata = {
          thumbnail: media.coverImage?.extraLarge || media.coverImage?.large || anime.thumbnail,
          banner: media.bannerImage || anime.banner || anime.thumbnail,
          description: (media.description || anime.description || '').replace(/<[^>]*>/g, ''),
          score: media.averageScore ? media.averageScore / 10 : anime.score,
          episodes: media.episodes || anime.episodes || null,
          anilistId: media.id,
          malId: media.idMal,
          genres: media.genres || anime.genres || []
        };

        CACHE.set(cacheKey, metadata);
        return { ...anime, ...metadata };
      }

      CACHE.set(cacheKey, {});
      return anime;

    } catch (err) {
      console.error(`[Metadata] Failed to fetch data for "${anime.name}": ${err.message}`);
      return anime;
    }
  }));

  return enriched;
}
