<?php
/**
 * Plugin Name: ATLAS Clarus Mischatlas
 * Description: Spektraler Mischatlas mit B/A-Vorschau und lokalem JSON-Import eigener Ausgangsfarben.
 * Version: 0.1.0
 * Requires at least: 5.8
 * Requires PHP: 7.4
 * Author: Norbert Woiwod
 * Author URI: https://arbe-lambda-star.com/
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Update URI: https://arbe-lambda-star.com/atlas-clarus-mischatlas/
 * Text Domain: atlas-clarus-mischatlas
 *
 * GPL applies to the new WordPress wrapper. Bundled datasets retain their
 * source-specific terms; see SOURCES-AND-LICENSES.txt and the atlas itself.
 */
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

function atlas_clarus_mischatlas_asset_url() {
    return add_query_arg( 'ver', '0.1.0', plugins_url( 'assets/mischatlas.html', __FILE__ ) );
}

function atlas_clarus_mischatlas_shortcode( $atts = array() ) {
    $atts = shortcode_atts( array( 'height' => '1100' ), $atts, 'atlas_clarus_mischatlas' );
    $height = max( 500, min( 3000, absint( $atts['height'] ) ) );
    $url = atlas_clarus_mischatlas_asset_url();
    return '<div class="atlas-clarus-mischatlas-embed">'
        . '<p><a href="' . esc_url( $url ) . '" target="_blank" rel="noopener">Mischatlas in eigener Ansicht öffnen</a></p>'
        . '<iframe src="' . esc_url( $url ) . '" title="ATLAS Clarus Mischatlas – digitale Modellvorschläge"'
        . ' width="100%" height="' . esc_attr( (string) $height ) . '"'
        . ' style="display:block;width:100%;border:1px solid #dce3e7;border-radius:10px;background:#f2f4f6;"'
        . ' loading="lazy" referrerpolicy="same-origin"'
        . ' sandbox="allow-scripts allow-same-origin allow-downloads allow-popups allow-popups-to-escape-sandbox"></iframe>'
        . '<p>Eigene Spektraldaten werden lokal im Browser verarbeitet. Berechnete Modellteile sind keine kalibrierten Tropfen- oder Grammrezepte.</p>'
        . '</div>';
}
add_shortcode( 'atlas_clarus_mischatlas', 'atlas_clarus_mischatlas_shortcode' );

function atlas_clarus_mischatlas_admin_menu() {
    add_options_page( 'ATLAS Clarus Mischatlas', 'ATLAS Mischatlas', 'manage_options', 'atlas-clarus-mischatlas', 'atlas_clarus_mischatlas_admin_page' );
}
add_action( 'admin_menu', 'atlas_clarus_mischatlas_admin_menu' );

function atlas_clarus_mischatlas_admin_page() {
    if ( ! current_user_can( 'manage_options' ) ) {
        return;
    }
    echo '<div class="wrap"><h1>ATLAS Clarus Mischatlas · 0.1.0</h1>';
    echo '<p>Shortcode in einen Shortcode-Block einer WordPress-Seite einsetzen:</p><p><code>[atlas_clarus_mischatlas]</code></p>';
    echo '<p>Optionale Höhe: <code>[atlas_clarus_mischatlas height="1400"]</code></p>';
    echo '<p><a class="button button-primary" href="' . esc_url( atlas_clarus_mischatlas_asset_url() ) . '" target="_blank" rel="noopener">Mischatlas direkt testen</a></p>';
    echo '<p>13.283 Referenzen · 12.714 HLC-Modelltreffer · 569 offen. Der zirkuläre Hue-Vergleich berücksichtigt H360 = H000.</p>';
    echo '<p>Import, Suche und B/A-PNG-Export laufen im Browser. Dieses Plugin legt keine hochgeladenen Spektraldaten auf dem Server ab.</p>';
    echo '<p>Bei ausbleibender Initialisierung die sichtbare Startmeldung im Atlas prüfen. Sicherheitsregeln des Servers müssen die enthaltenen Skripte sowie lokale Blob-Web-Worker zulassen.</p>';
    echo '<p>Lizenzhinweise der mitgelieferten Daten bleiben gültig. Insbesondere ist die genaue Version der von Dr. Backes genannten CC-BY-SA-Freigabe bisher nicht bestätigt.</p></div>';
}
