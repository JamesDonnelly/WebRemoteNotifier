<!DOCTYPE html>
<html lang="en">
    <head>
        <title>WebRemoteNotifier</title>
        <link href='http://fonts.googleapis.com/css?family=Merriweather+Sans' rel='stylesheet' type='text/css'>
        <link type="text/css" rel="stylesheet" href="css/stylesheet.css">
        <script type="text/javascript">
            (function() {
                function getScript(url,success){
                    var script=document.createElement('script');
                    script.src=url;
                    var head=document.getElementsByTagName('head')[0],
                    done=false;
                    script.onload=script.onreadystatechange = function(){
                        if ( !done && (!this.readyState || this.readyState == 'loaded' || this.readyState == 'complete') ) {
                            done=true;
                            success();
                            script.onload = script.onreadystatechange = null;
                            head.removeChild(script);
                        }
                    };
                    head.appendChild(script);
                }
                getScript("js/jquery-1.9.1.min.js",function(){
                    getScript("http://js.pusher.com/2.0/pusher.min.js", function() {
                        getScript("js/generic.js", function() {})
                    })
                });
            })();
        </script>
    </head>
    <body>
        <div id="outerWrapper">
            <div id="innerWrapper">
                <div id="main" class="loading">
                    <section id="authentication">
                        <h1 id="title">
                            Authentication
                            <small>| Remote Notifier</small>
                        </h1>
                        <div id="inner">
                            <form method="post" id="connectionForm">
                                <fieldset>
                                    <label for="txtAppKey">
                                        <h3>App Key</h3>
                                        <span>Please enter your application key.</span>
                                        <input type="text" name="txtAppKey" id="txtAppKey" placeholder="1206-2AE3-FD05..." value="baa7ee7cee05c74a69af" />
                                    </label>
                                </fieldset>
                                <fieldset>
                                    <label for="txtChannel">
                                        <h3>Channel</h3>
                                        <span>Please enter your channel name. Remember that private channels should start with <code>private-</code>.</span>
                                        <input type="text" name="txtChannel" id="txtChannel" placeholder="my_superchannel" value="private-matt_sandbox" />
                                    </label>
                                </fieldset>
                                <fieldset>
                                    <label for="txtDeviceTag">
                                        <h3>Device Tag</h3>
                                        <span>Please enter the unique device tag associated with your notifier-enabled devices.</span>
                                        <input type="text" name="txtDeviceTag" id="txtDeviceTag" placeholder="1206-2AE3-FD05..." value="Test" />
                                    </label>
                                </fieldset>
                                <fieldset class="submit">
                                    <input type="submit" value="Authenticate"/>
                                </fieldset>
                            </form>
                        </div>
                    </section>
                    <section id="devices">
                        <div id="devices-sidebar">
                            <ul id="devices-list">
                                <li id="device-list-title">Devices</li>
                            </ul>
                        </div>
                        <div id="devices-commands-container" style="margin-left:-210px;">
                            <div id="device-commands">
                                <ul id="device-commands-list">
                                    <li id="device-commands-list-title">Commands</li>
                                </ul>
                            </div>
                        </div>
                    </section>
                    <section id="initial-loading"><span id="initial-loadingMessage">Loading...</span><span id="initial-loadingLog">Requesting devices...</span></section>
                    <p id="connectionMessage" class="statusNeutral">Status: <span>Not connected</span></p>
                </div>
            </div>
        </div>
    </body>
</html>