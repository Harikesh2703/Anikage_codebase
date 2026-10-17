package com.example.anikage.data.local

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface MyListDao {
    @Query("SELECT * FROM my_list ORDER BY addedAtMillis DESC")
    fun getAllSavedAnime(): Flow<List<MyListEntity>>

    @Query("SELECT * FROM my_list")
    suspend fun getAllSavedAnimeSync(): List<MyListEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAnime(anime: MyListEntity)

    @Delete
    suspend fun deleteAnime(anime: MyListEntity)

    @Query("SELECT EXISTS(SELECT 1 FROM my_list WHERE id = :id LIMIT 1)")
    fun isAnimeSaved(id: String): Flow<Boolean>
    
    @Query("DELETE FROM my_list")
    suspend fun clearAll()
}
