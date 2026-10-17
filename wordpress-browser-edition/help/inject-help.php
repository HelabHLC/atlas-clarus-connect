    /** Text-only help. Never edits runtime files or starts a computation. */
    private static function inject_exchange_help( $html ) {
        $page = get_page_by_path( 'atlas-clarus-browser-bundle', OBJECT, 'page' );
        if ( ! $page || 'publish' !== $page->post_status ) {
            return $html;
        }
        $content = '';
        foreach ( parse_blocks( $page->post_content ) as $block ) {
            if ( 'core/html' === $block['blockName'] && false !== strpos( $block['innerHTML'], 'id="exchange-between-tools"' ) ) {
                $content = wp_kses_post( $block['innerHTML'] );
                break;
            }
        }
        if ( '' === $content || false !== strpos( $html, 'id="atlas-exchange-help"' ) ) {
            return $html;
        }
        $help = '<style id="atlas-exchange-help-style">'
            . '#atlas-exchange-help{position:fixed;right:16px;bottom:16px;z-index:10000;width:340px;max-width:calc(100vw - 32px);box-sizing:border-box;padding:14px 18px;background:#131b28;color:#f2f5fa;border:1px solid #708096;border-radius:12px;box-shadow:0 4px 24px #0008;font:15px/1.55 system-ui;overflow-wrap:anywhere}'
            . '#atlas-exchange-help[open]{width:680px;max-height:75vh;overflow:auto}'
            . '#atlas-exchange-help>summary{cursor:pointer;font-weight:700;list-style:revert}'
            . '#atlas-exchange-help a{color:#a9dcff}#atlas-exchange-help h2{font-size:22px;margin-top:18px}'
            . '#atlas-exchange-help p{margin:12px 0}#atlas-exchange-help ol{padding-left:24px}'
            . '#atlas-exchange-help details{margin-top:16px}#atlas-exchange-help summary:focus-visible{outline:2px solid #a9dcff;outline-offset:4px}'
            . '</style><details id="atlas-exchange-help"><summary>Exchange between tools · Help / Hilfe</summary>'
            . $content . '</details>';
        return preg_replace_callback( '/<\/body>/i', static function () use ( $help ) { return $help . '</body>'; }, $html, 1 );
    }
