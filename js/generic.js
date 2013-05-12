$(document).ready(function() {
    var
        $auth_deviceTag = $('#txtDeviceTag'),
        $auth_appKey = $('#txtAppKey'),
        $log = $('#log'),
        $deviceList = $('#devices'),
        $innerDiv = $('div#inner')
    ;

    $('div.progress > div').css({
        width:$innerDiv.outerWidth(),
        height:$innerDiv.outerHeight()
    });

    Pusher.channel_auth_endpoint = 'http://jamesmdonnelly.com/WebRemoteNotifier/connector.php';
    Pusher.channel_auth_transport = 'ajax';

    Pusher.log = function(msg) {
        var date = new Date();
        var time = '[' + ("0" + date.getHours()).slice(-2) + ":"
                    + ("0" + date.getMinutes()).slice(-2) + ":"
                    + ("0" + date.getSeconds()).slice(-2) + ']';
        if(!$log.is(':visible'))
            $log.slideDown(500);
        $log.html('<span>' + time + '</span>' + msg + '<br>' + $log.html());
        if(window.console && window.console.log) {
            window.console.log(time + ' ' + msg);
        }
    };

    $('div#inner > form').on('click', 'input[type="submit"]', function(e) {
        e.preventDefault();

        $('div.progress').fadeIn(500);

        $('form#connectionForm > *').prop('disabled', true);
        $('p#connectionMessage > span').text('Connecting...');
        $('p#connectionMessage').removeClass('statusNeutral');

        var pusher = new Pusher($('#txtAppKey').val());

        var privateChannel = pusher.subscribe($('#txtChannel').val());

        privateChannel.bind('pusher:subscription_succeeded', function() {
            $('.progress').hide();
            $('p#connectionMessage').addClass('statusOk');
            $('p#connectionMessage > span').text('Connected!');
            $('form').slideUp(500, function() {
                $('div#devicesArea').slideDown(500);
                $('div#main').stop().animate({width:'90%', height:'90%'}, 500);
            });

            privateChannel.bind('controller_authentication_ack', function(test) {
                console.log(test);
            });

            privateChannel.bind('register_device', function(data) {
                console.log(data);

                if(!$deviceList.is(':visible'))
                {
                    $('#devicesLoadingMessage').slideUp(500);
                    $('#devices').slideDown(500);
                }

                var row = $('<tr></tr>');
                var name = $('<td></td>');
                var tag = $('<td></td>');
                var type = $('<td></td>');

                name.text(data.deviceName);
                tag.text(data.deviceTag);
                type.text(data.deviceType);

                row.append(name);
                row.append(tag);
                row.append(type);

                $deviceList.children('tbody').append(row);
            });

            privateChannel.trigger('client-controller_authentication', {
                    'authDeviceTag': $auth_deviceTag.val(),
                    'authAppKey': $auth_appKey.val()
                }
            );

            privateChannel.trigger('client-device_poll_new', {
                'requestedDevice': 'all',
                'requestedDeviceTag': $auth_deviceTag.val(),
                'senderType': 'controller'
            });
        });
    })
});