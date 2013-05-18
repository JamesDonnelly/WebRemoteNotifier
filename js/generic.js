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

/* Generate a GUID.
 * http://stackoverflow.com/a/2117523/1317805
 */
function guid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {var r = Math.random()*16|0,v=c=='x'?r:r&0x3|0x8;return v.toString(16);});
}

$(document).ready(function() {
    /* Declare scope variables.
     * ----
     * Element references here are used to avoid repetition.
     */
    var
        // Global variables
        channel,
        pusher,
        selectedDevice,
        devicesArray = [],

        // Global initiated variables
        animationSpeed = 500,

        // Element references
            // Authentication elements
            $auth_appKey = $('#txtAppKey'),
            $auth_channel = $('#txtChannel'),
            $auth_deviceTag = $('#txtDeviceTag'),
            $auth_form = $('#connectionForm'),
            $auth_section = $('#authentication'),

            // Devices elements
            $devices_commands_container = $('#devices-commands-container'),
            $device_commands = $('#device-commands'),
            $devices_section = $('#devices'),
            $devices_sidebar = $('#devices-sidebar'),
            $devices_list = $devices_sidebar.children('ul'),

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
     */
    $devices_list.on('click', 'li.device', function() {
        var
            $this = $(this),
            $this_ref = $this.data('deviceRef')
        ;

        if($this.hasClass('active'))
            return false;

        // Remove the currently active device's active state
        $('li.device.active').removeClass('active');

        populateDeviceCommandList(devicesArray[$this_ref]);
        $this.addClass('active');
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
                // Ensure the contents are visible and prepend them to $main
                $contents.show().prependTo($main);
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

    function populateDeviceCommandList(deviceArray) {
        // Hide the current page
        $devices_commands_container.stop().animate({marginLeft:-210}, (animationSpeed/2), function() {
            // Check if the $device_commands has any current children
            if($device_commands.children().length > 0)
            {
                // From this we assume the devices page has already been created
                // Create the main devices page elements
                $device_commands.children('h1').text(deviceArray.deviceName);
            }
            // If not, create page elements
            else
            {
                // Create the main devices page elements
                var
                    $commands_list = $('<ul id="device-commands-list"/>').appendTo($device_commands)
                ;

                // Create the commands list heading
                $('<li id="device-commands-list-title"/>').text('Commands').appendTo($commands_list);

                // Loop through each of the commands to populate the table
                for(var i=0;i<deviceArray.commands.length;i++)
                {
                    var
                        command = deviceArray.commands[i]/*,
                        command_html = command.com*/
                    ;

                    // Display the device command name
                    $('<li class="command"/>').text(command.name).appendTo($commands_list);

                    /*// If the device's command has no arguments, append ()
                    if(typeof command.args == 'undefined')
                        command_html += ' ()';
                    // Otherwise, loop through each argument and add it to the command
                    else
                    {
                        var args = command.args;
                        command_html += ' ( ';
                        for(var j=0;j<args.length;j++)
                        {
                            var arg = args[j];
                            command_html += '<small>[' + arg.type + ']</small> ' + arg.name;
                            command_html += (j + 1) < args.length ? ', ' : ' ';
                        }
                        command_html += ')';
                    }

                    // Display the device command
                    $('<td/>').html(command_html).appendTo($command_tbody_row);*/
                }

                $device_name.text(deviceArray.deviceName);
            }

            // Show the newly populated page
            $devices_commands_container.stop().animate({marginLeft:0}, animationSpeed);
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
            channel.trigger('client-device_poll_new',
                {
                    'requestedDevice': 'all',
                    'requestedDeviceTag': $auth_deviceTag.val(),
                    'senderType': 'controller'
                }
            );
            channel.trigger('client-device_poll_new',
                {
                    'requestedDevice': 'all',
                    'requestedDeviceTag': $auth_deviceTag.val(),
                    'senderType': 'controller'
                }
            );

            setPage_New($devices_section, 'fullSize');
        });

        /* Pusher register_device event handler
         * ----
         * This is fired whenever a device is registered. We use this to generate the
         * device list and each individual device 'page'.
         * todo: Update this to work with the new setPage_* functions
         */
        channel.bind('register_device', function(device) {
            console.log(device);
            // { deviceName , deviceType , deviceTag , commands[ n{ com , name } ] }
            var
                // Pull device properties from device, ensuring that they exist
                // todo: Make these globally accessible?
                deviceCommands = device.commands = device.commands || [],
                deviceName = device.deviceName = device.deviceName || 'Unnamed Device',
                deviceTag = device.deviceTag = device.deviceTag || 'None',
                deviceType = device.deviceType = device.deviceType || 'Unknown',

                // Create a unique device reference
                deviceRef = guid();

                // Create new device list elements and populate list
                $device_listItem = $('<li class="device"/>').data('deviceRef',deviceRef).hide(),
                $device_name = $('<h5 class="deviceName" />').text(deviceName).appendTo($device_listItem),
                $device_tag = $('<span class="deviceDetail" data-detailType="tag" />').text(deviceTag).appendTo($device_listItem),
                $device_type = $('<span class="deviceDetail" data-detailType="type" />').text(deviceType).appendTo($device_listItem)
            ;

            // Add the device to the devicesArray
            devicesArray[deviceRef] = device;

            // Make this device the selected device if none are currently selected
            if(typeof selectedDevice == 'undefined')
            {
                selectedDevice = deviceRef;
                $device_listItem.addClass('active');

                // Create the devices page content
                populateDeviceCommandList(devicesArray[deviceRef]);
            }

            // Add the $device_listItem to the devices sidebar list
            $device_listItem.appendTo($devices_list).slideDown(animationSpeed/2);
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