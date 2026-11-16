package com.sundarly.app

import android.app.Application
import coil3.ImageLoader
import coil3.PlatformContext
import coil3.SingletonImageLoader
import coil3.request.crossfade
import com.sundarly.app.data.Api
import com.sundarly.app.data.Langue
import org.osmdroid.config.Configuration
import java.io.File

class SundarlyApp : Application(), SingletonImageLoader.Factory {
    override fun onCreate() {
        super.onCreate()
        Langue.demarrer(this)
        Api.demarrer(this)
        // Carte OpenStreetMap : identifiant de l'app et cache dans le dossier privé
        Configuration.getInstance().apply {
            userAgentValue = packageName
            osmdroidBasePath = File(cacheDir, "osmdroid")
            osmdroidTileCache = File(cacheDir, "osmdroid/tuiles")
        }
    }

    override fun newImageLoader(context: PlatformContext): ImageLoader =
        ImageLoader.Builder(context).crossfade(true).build()
}
