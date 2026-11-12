package com.sundarly.app.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.sundarly.app.R

// Couleurs du site (assets/style.css)
val Rose = Color(0xFFD81B60)
val RoseFonce = Color(0xFFB0124D)
val RoseClair = Color(0xFFFDEEF3)
val RosePale = Color(0xFFFFF7FA)
val Encre = Color(0xFF1F1A1D)
val Gris = Color(0xFF6B6168)
val GrisTexte = Color(0xFF4A4146)
val Ligne = Color(0xFFF0E4E9)
val Bord = Color(0xFFDDD0D6)
val VertFond = Color(0xFFE8F6EE)
val Vert = Color(0xFF14532D)
val JauneFond = Color(0xFFFFF4D6)
val Jaune = Color(0xFF5C4000)
val RougeFond = Color(0xFFFDECEC)
val Rouge = Color(0xFF9B1C1C)

val Jakarta = FontFamily(
    Font(R.font.jakarta_regular, FontWeight.Normal),
    Font(R.font.jakarta_medium, FontWeight.Medium),
    Font(R.font.jakarta_semibold, FontWeight.SemiBold),
    Font(R.font.jakarta_bold, FontWeight.Bold),
    Font(R.font.jakarta_extrabold, FontWeight.ExtraBold),
)

private fun style(taille: Int, poids: FontWeight, interligne: Int, espacement: Double = 0.0) =
    TextStyle(fontFamily = Jakarta, fontSize = taille.sp, fontWeight = poids, lineHeight = interligne.sp, letterSpacing = espacement.sp)

private val Textes = Typography(
    displaySmall = style(30, FontWeight.ExtraBold, 36, -0.8),
    headlineLarge = style(28, FontWeight.ExtraBold, 34, -0.6),
    headlineMedium = style(24, FontWeight.ExtraBold, 30, -0.5),
    headlineSmall = style(21, FontWeight.Bold, 27, -0.3),
    titleLarge = style(19, FontWeight.Bold, 25, -0.2),
    titleMedium = style(16, FontWeight.Bold, 22),
    titleSmall = style(14, FontWeight.Bold, 20),
    bodyLarge = style(16, FontWeight.Normal, 24),
    bodyMedium = style(14, FontWeight.Normal, 21),
    bodySmall = style(12, FontWeight.Normal, 17),
    labelLarge = style(15, FontWeight.Bold, 20),
    labelMedium = style(12, FontWeight.SemiBold, 16),
    labelSmall = style(11, FontWeight.SemiBold, 14),
)

private val Couleurs = lightColorScheme(
    primary = Rose, onPrimary = Color.White,
    primaryContainer = RoseClair, onPrimaryContainer = Encre,
    secondary = Encre, onSecondary = Color.White,
    secondaryContainer = RoseClair, onSecondaryContainer = Encre,
    tertiary = RoseFonce, onTertiary = Color.White,
    background = Color.White, onBackground = Encre,
    surface = Color.White, onSurface = Encre,
    surfaceVariant = RosePale, onSurfaceVariant = Gris,
    surfaceContainerLowest = Color.White, surfaceContainerLow = Color.White, surfaceContainer = Color.White,
    surfaceContainerHigh = RosePale, surfaceContainerHighest = RoseClair,
    outline = Bord, outlineVariant = Ligne,
    error = Rouge, onError = Color.White, errorContainer = RougeFond, onErrorContainer = Rouge,
)

private val Formes = Shapes(
    extraSmall = RoundedCornerShape(8.dp), small = RoundedCornerShape(12.dp), medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(22.dp), extraLarge = RoundedCornerShape(28.dp),
)

@Composable
fun ThemeSundarly(contenu: @Composable () -> Unit) {
    MaterialTheme(colorScheme = Couleurs, typography = Textes, shapes = Formes, content = contenu)
}
