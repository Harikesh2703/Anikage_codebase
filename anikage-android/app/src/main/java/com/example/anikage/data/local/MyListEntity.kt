package com.example.anikage.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "my_list")
data class MyListEntity(
    @PrimaryKey val id: String,
    val title: String,
    val imageUrl: String,
    val addedAtMillis: Long = System.currentTimeMillis()
)
