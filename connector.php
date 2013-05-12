<?php
    ini_set('display_errors',1);
    ini_set('display_startup_errors',1);
    error_reporting(-1);
    $app_id  = '29152';
    $app_secret  = '361259e4cc3ace476b2d';
    $app_key = 'baa7ee7cee05c74a69af';


    require_once('pusher/pusher.php');
    $pusher = new Pusher( $app_key, $app_secret, $app_id, false, 'https://api.pusherapp.com', 443 );

    echo $pusher->socket_auth($_POST['channel_name'], $_POST['socket_id']);