plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
}

// Numéro de version : fourni par la compilation automatique (GitHub), sinon 1
val numeroVersion = (System.getenv("SUNDARLY_VERSION_CODE") ?: "1").toInt()
// Clé de signature pour le Play Store : fournie par des secrets GitHub (jamais dans le dépôt)
val cleFichier: String? = System.getenv("SUNDARLY_KEYSTORE")

android {
    namespace = "com.sundarly.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.sundarly.app"
        minSdk = 26
        targetSdk = 36
        versionCode = numeroVersion
        versionName = "1.0.$numeroVersion"
    }

    signingConfigs {
        if (cleFichier != null) {
            create("sundarly") {
                storeFile = file(cleFichier)
                storePassword = System.getenv("SUNDARLY_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("SUNDARLY_KEY_ALIAS")
                keyPassword = System.getenv("SUNDARLY_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = if (cleFichier != null) signingConfigs.getByName("sundarly") else signingConfigs.getByName("debug")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildFeatures { compose = true }
    packaging { resources { excludes += "/META-INF/{AL2.0,LGPL2.1}" } }
}

kotlin { jvmToolchain(17) }

dependencies {
    val bom = platform("androidx.compose:compose-bom:2025.07.00")
    implementation(bom)
    implementation("androidx.core:core-ktx:1.16.0")
    implementation("androidx.exifinterface:exifinterface:1.3.7")
    implementation("androidx.activity:activity-compose:1.10.1")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.9.1")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.9.1")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-core:1.7.8")
    implementation("io.coil-kt.coil3:coil-compose:3.2.0")
    implementation("io.coil-kt.coil3:coil-network-okhttp:3.2.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.9.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
    implementation("org.osmdroid:osmdroid-android:6.1.20")
    debugImplementation("androidx.compose.ui:ui-tooling")
    testImplementation("junit:junit:4.13.2")
}
