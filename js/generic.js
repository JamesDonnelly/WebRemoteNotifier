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
            $devices_section = $('#devices'),
            $devices_sidebar = $('#devices-sidebar'),
            $devices_list = $devices_sidebar.children('ul'),

            // Device commands elements
            $device_commands = $('#device-commands'),
            $commands_list = $device_commands.children('ul'),

            // Main interface elements
            $main = $('#main'),
            $status = $('#connectionMessage'),

            // Initial loading section
            $initial_loading_section = $('#initial-loading'),

        // Dynamic elements
        $loading_section = $('<section id="loading"/>'),
        $loading_message = $('<span id="loadingMessage"/>').text('Loading...').appendTo($loading_section),
        $loading_log = $('<span id="loadingLog"/>').insertAfter($loading_message)
    ;

    // If we get here then everything has loaded; hide the loading pane and display auth.
    $initial_loading_section.fadeOut(function() {
        $main.removeClass('loading');
        $auth_section.fadeIn(animationSpeed/2);
        $status.fadeIn(animationSpeed/2);
        $initial_loading_section.remove();
    });

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

    /* Handle device list item click
     * ----
     * When a device is clicked in the devices list we need to display its commands.
     */
    $devices_list.on('click', 'li.device', function() {
        var
            $this = $(this),
            $currentlyActiveDevice = $('li.device.active'),
            $currentlyActiveCommand = $('li.command.active'),
            deviceReference = $this.data('deviceRef')
        ;

        if($this.hasClass('active'))
            return false;

        // Remove the currently active device's active state
        $currentlyActiveDevice.removeClass('active');

        // Remove the currently active command's active state and command list
        $currentlyActiveCommand.removeClass('active');
        $currentlyActiveCommand.children('ul').stop().fadeOut(animationSpeed/2);

        populateDeviceCommandList(devicesArray[deviceReference]);
        return $this.addClass('active');
    });

    /* Display main pane loading message
     * ----
     * This replaces the current $main content with a loading screen; used in connection
     * with setPage_New when changing the main content to display a different pane.
     */
    $commands_list.on('click', 'li.command', function() {
        var
            $this = $(this),
            $currentlyActive = $('li.command.active'),
            deviceReference = selectedDevice
        ;

        if($this.hasClass('active'))
            return false;

        // Remove the currently active command's active state
        $currentlyActive.removeClass('active');
        $currentlyActive.children('ul').stop().fadeOut(animationSpeed/2);

        $this.children('ul').stop().fadeIn(animationSpeed);
        return $this.addClass('active');
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
            // Check if the $commands_list has more than 1 list item
            if($commands_list.children('li').length > 1)
            {
                // Remove the currently active device's active state
                $('li.command.active').removeClass('active');
            }
            // If not, create page elements
            else
            {
                // Loop through each of the commands to populate the table
                for(var i=0;i<deviceArray.commands.length;i++)
                {
                    var
                        command = deviceArray.commands[i],
                        $command_listItem = $('<li/>',{class:"command"}),
                        $command_controlsList = $('<ul/>',{class:"controls-list"})
                    ;

                    // Set the device command name
                    $command_listItem.text(command.name);

                    // If the device has args, add them as list items to the control list
                    if(command.args instanceof Object)
                    {
                        var
                            args = command.args
                        ;

                        // Loop through each argument, adding it to the list
                        for(var j=0;j<args.length;j++)
                        {
                            var
                                arg = args[j],
                                $command_controlsListItem = $('<li/>'),
                                $control,
                                $label = $('<label/>')
                            ;

                            // Determine what the control should be
                            switch(arg.type) {
                                case 'Boolean':
                                    $control = $('<input/>',{type:"checkbox"});
                                    break;
                                case 'String':
                                    $control = $('<input/>',{type:"text"});
                                    break;
                                case 'Time':
                                    $control = $('<input/>',{type:"time"});
                                    break;
                                default:
                                    $control = $('<input/>',{type: "text"});
                                    console.warn('Unhandled argument type:', arg.type);
                                    break;
                            }

                            // Set the label text
                            $('<span/>').text(arg.name).appendTo($label);

                            // Append the control to the label
                            $control.appendTo($label);
                            // Append the label to the controls list item
                            $label.appendTo($command_controlsListItem);
                            // Append the controls list item to the controls list
                            $command_controlsListItem.appendTo($command_controlsList);
                        }
                    }

                    // Create the Run trigger
                    var $command_runCommandListItem = $('<li/>');
                    $('<a/>',{href:"#"}).text('Run').appendTo($command_runCommandListItem);

                    // Append trigger to list
                    $command_runCommandListItem.appendTo($command_controlsList);

                    // Append the controls list to the command list item
                    $command_controlsList.appendTo($command_listItem);
                    // Append the command list item to the commands list
                    $command_listItem.appendTo($commands_list);
                }
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
            if(typeof selectedDevice === 'undefined')
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