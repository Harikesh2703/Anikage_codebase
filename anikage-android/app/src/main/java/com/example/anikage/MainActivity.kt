package com.example.anikage

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.example.anikage.ui.theme.AnikageTheme
import com.example.anikage.ui.AnikageApp

import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    
    GlobalScope.launch {
        com.example.anikage.data.plugins.PluginManager.getInstance().init(this@MainActivity)
    }

    // Configure Coil globally with desktop User-Agent, Referer, and disk/memory cache
    val okHttpClient = okhttp3.OkHttpClient.Builder()
        .addInterceptor { chain ->
            val request = chain.request().newBuilder()
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36")
                .header("Referer", "https://anilist.co/")
                .build()
            chain.proceed(request)
        }
        .build()

    val imageLoader = coil.ImageLoader.Builder(this)
        .okHttpClient(okHttpClient)
        .memoryCache {
            coil.memory.MemoryCache.Builder(this)
                .maxSizePercent(0.25)
                .build()
        }
        .diskCache {
            coil.disk.DiskCache.Builder()
                .directory(cacheDir.resolve("image_cache"))
                .maxSizeBytes(150L * 1024 * 1024)
                .build()
        }
        .crossfade(true)
        .respectCacheHeaders(false)
        .build()

    coil.Coil.setImageLoader(imageLoader)

    enableEdgeToEdge()
    setContent {
      AnikageTheme { 
        Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) { 
          AnikageApp() 
        } 
      }
    }
  }
}
