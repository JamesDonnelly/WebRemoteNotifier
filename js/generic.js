/* Define the Pusher endpoint and transport method.
 * ----
 * The endpoint here is our connector.php class - this is where Pusher will respond to
 * our requests - we're then telling Pusher to use AJAX as the data transport method.
 */
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
        // Authentication elements
        $auth_appKey = $('#txtAppKey'),
        $auth_deviceTag = $('#txtDeviceTag'),
        $auth_form = $('#connectionForm'),

        // Connection status message
        $status = $('p#connectionMessage')
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

    /* Authentication form submissions.
     * This function is triggered when the authentication form is submitted. Here we
     * attempt to connect to a Pusher instance, much like a generic login form.
     */
    $auth_form.on('click', 'input[type="submit"]', function(event) {
        // Prevent the submit button triggering the usual HTML form submit
        event.preventDefault();

        // Disable the form's inputs to prevent repetitive submissions and value changes
        $auth_form.children('input').prop('disabled', true);

        // Update the connection status to inform the user that a connection is happening
        $status.updateStatus('Busy', 'Connecting...');

        // Create a new instance of Pusher based on the user's input App Key
        var pusher = new Pusher($auth_appKey.val());

        var privateChannel = pusher.subscribe($('#txtChannel').val());

        privateChannel.bind('pusher:subscription_succeeded', function() {
            $('.progress').hide();
            $status.updateStatus('Ok', 'Connected!');
            $('#main').fadeOut(500);
        });
    })
});