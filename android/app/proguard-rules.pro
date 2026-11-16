# kotlinx.serialization : garder les sérialiseurs générés
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.**
-keepclassmembers class com.sundarly.app.data.** { *** Companion; }
-keepclasseswithmembers class com.sundarly.app.data.** { kotlinx.serialization.KSerializer serializer(...); }
-dontwarn org.osmdroid.**
-dontwarn okhttp3.internal.platform.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
