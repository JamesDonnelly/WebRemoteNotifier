/* Define the Pusher endpoint and transport method.
 * ----
 * The endpoint here is our connector.php class - this is where Pusher will respond to
 * our requests - we're then telling Pusher to use AJAX as the data transport method.
 */
Pusher = Pusher || 0;
Pusher.channel_auth_endpoint = 'http://jamesmdonnelly.com/WebRemoteNotifier/connector.php';
Pusher.channel_auth_transport = 'ajax';

/* Pre-defined custom element functions.
 */
$(function() {
    /* Update connection status message.
     * ----
     * This is intended to be used solely on the connection message element.
     */
    $.fn.updateStatus = function(type, message) {
        var $status = $(this);
        // Remove any current class, then add the new class and change the status message
        $status.removeClass().addClass('status' + type).children('span').text(message);
    };
});

$(document).ready(function() {
    /* Declare scope variables.
     * ----
     * Element references here are used to avoid repetition.
     */
    var
        // Global variables
        channel,
        pusher,

        // Global initiated variables
        animationSpeed = 500,

        // Element references
            // Authentication elements
            $auth_appKey = $('#txtAppKey'),
            $auth_channel = $('#txtChannel'),
            $auth_deviceTag = $('#txtDeviceTag'),
            $auth_form = $('#connectionForm'),
            $auth_section = $('#authentication'),

            // Main interface elements
            $main = $('#main'),
            $status = $('#connectionMessage'),

        // Dynamic elements
        $loading_section = $('<section id="loading"/>'),
        $loading_message = $('<span id="loadingMessage"/>').text('Loading...').appendTo($loading_section),
        $loading_log = $('<span id="loadingLog"/>').insertAfter($loading_message)
    ;

    /* Set up Pusher logging.
     * ----
     * This is Pusher's in-built logging function which we're modifying to allow us to
     * display the log to the user upon authentication. logTimeFormat is used here to
     * easily see when events were logged.
     * We do this within document.ready as the front-facing log is dynamically added.
     */
    Pusher.log = function(msg) {
        var date = new Date();
        var logTimeFormat = '[' + ("0" + date.getHours()).slice(-2) + ":"
                                + ("0" + date.getMinutes()).slice(-2) + ":"
                                + ("0" + date.getSeconds()).slice(-2) + ']';

        if(window.console && window.console.log)
            window.console.log(logTimeFormat + ' ' + msg);
    };

    /* Authentication form submission.
     * ----
     * This function is triggered when the authentication form is submitted. Here we
     * attempt to connect to a Pusher instance, much like a generic login form.
     */
    $auth_form.on('click', 'input[type="submit"]', function(event) {
        // Prevent the submit button triggering the usual HTML form submit
        event.preventDefault();

        // Disable the form's inputs to prevent repetitive submissions and value changes
        $auth_form.children('input').prop('disabled', true);

        // Display the loading pane
        $loading_log.html('Subscribing to channel "' + $auth_channel.val() + '"...');
        setPage_Loading();

        // Update the connection status to inform the user that a connection is happening
        $status.updateStatus('Neutral', 'Connecting...');

        // Create a new instance of Pusher based on the user's input App Key
        pusher = new Pusher($auth_appKey.val());

        // Subscribe to the Pusher channel, again based on the user's input
        channel = pusher.subscribe($auth_channel.val());

        // Trigger Pusher event binding
        handleEvents();
    });

    /* Display main pane loading message
     * ----
     * This replaces the current $main content with a loading screen; used in connection
     * with setPage_New when changing the main content to display a different pane.
     * todo: A "this is taking a long time, do you want to retry?" notice?
     */
    function setPage_Loading() {
        // Fade out the current main pane
        $main.fadeOut((animationSpeed/2), function() {
            // Set the pane's loading data to true to easily identify the loading pane
            $main.data('loading', true).addClass('loading');
            // Completely remove the authentication section if it's in DOM
            if($.contains(document.documentElement, $auth_section[0]))
                $auth_section.remove();
            // Hide the status message
            $status.hide();
            // todo: Hide the log if it exists
            // Move loading message to $main
            $loading_section.prependTo($main);
            // Fade in the new main pane
            $main.fadeIn((animationSpeed/2));
        });
    }

    /* Change main pane content
     * ----
     * This replaces the current $main content with the passed in content, accepting
     * optional arguments to further control the new page display.
     */
    function setPage_New($contents, args) {
        // args is an optional parameter; check if it exists, if not, zero it
        args = args || 0;
        // Ensure the loading pane has finished fading in
        $main.queue(function() {
            // If the loading pane isn't in DOM, set the loading pane for better user experience
            if($.contains(document.documentElement, $loading_section[0]))
            setPage_Loading();
            // Fade out the loading pane
            $main.fadeOut((animationSpeed/2), function() {
                // Hide the loading message and loading state and remove the loading class
                $main.data('loading', false).removeClass('loading');
                $loading_section.hide();
                // Re-display the status message
                $status.show();
                // Prepend the passed in contents to $main
                $contents.prependTo($main);
                // Process optional arguments
                if(args)
                {
                    switch(args) {
                        // 'fullSize' means we need to expand $main to 100% width/height
                        // todo: Change this to "class-fullSize" to dynamically change class?
                        case 'fullSize':
                            $main.addClass('fullSize');
                            // Due to a Chrome bug (v26) we need to 'reload' $main's parent
                            // todo: Proper browser support? This only affects Chrome
                            $main.parent().fadeOut(1, function() {
                                $(this).fadeIn(1);
                            });
                            break;
                        default:
                            break;
                    }
                }
                // Fade in the new main pane
                $main.fadeIn((animationSpeed/2));
            });
            $main.dequeue();
        });
    }

    /* Handle Pusher events
     * ----
     * This function is a placeholder for all the channel binding events.
     * todo: Make this more... logical?
     */
    function handleEvents() {
        /* Pusher subscription_succeeded event handler
         * ----
         * This is fired when a subscription to a channel is successful. We use this to
         * log the user in, effectively.
         */
        channel.bind('pusher:subscription_succeeded', function() {
            // Update the connection status
            $status.updateStatus('Ok', 'Connected!');

            /* Request connected devices.
             * ----
             * Ask Pusher to return which devices are connected to the subscribed channel
             */
            $loading_log.text('Requesting devices...');
            channel.trigger('client-device_poll_new',
                {
                    'requestedDevice': 'all',
                    'requestedDeviceTag': $auth_deviceTag.val(),
                    'senderType': 'controller'
                }
            );
        });

        channel.bind('register_device', function(devices) {
            $loading_log.text('Devices received, building interface...');
            console.log(devices);
            var $devices = $('<div/>').text('Test');
            setPage_New($devices, 'fullSize');
        });

        /* Pusher subscription_error event handler
         * ----
         * This is fired when a subscription to a channel fails due to a HTTP error.
         * todo: Update this to work with the new setPage_* functions
         */
        channel.bind('pusher:subscription_error', function(HTTPstatus) {
            $status.updateStatus('Error', 'Connection failed, please try again (' + HTTPstatus + ').');
        });

        /* Pusher member event handlers
         * These do not apply to private channels, currently unused
         */
        //channel.bind('pusher:member_added', function(member) {});
        //channel.bind('pusher:member_removed', function(member) {});
    }
});