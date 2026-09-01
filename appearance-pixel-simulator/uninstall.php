<?php
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}
delete_option( 'atlas_clarus_aps_pkl_reference' );
delete_option( 'atlas_clarus_aps_hex' );
delete_option( 'atlas_clarus_aps_source_row_id' );
