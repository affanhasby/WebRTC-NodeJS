// When the DOM is ready
document.addEventListener("DOMContentLoaded", function(event) {
    var peer_id;
    var username;
    var conn;

    /**
     * Important: the host needs to be changed according to your requirements.
     * e.g if you want to access the Peer server from another device, the
     * host would be the IP of your host namely 192.xxx.xxx.xx instead
     * of localhost.
     *
     * The iceServers on this example are public and can be used for your project.
     */
    var peer = new Peer({
        host: "172.20.10.14",
        port: 9000,
        path: '/peerjs',
        debug: 3,
        config: {
            'iceServers': [
                { url: 'stun:stun1.l.google.com:19302' },
                {
                    url: 'turn:numb.viagenie.ca',
                    credential: 'muazkh',
                    username: 'webrtc@live.com'
                }
            ]
        }
    });

    // Once the initialization succeeds:
    // Show the ID that allows other user to connect to your session.
    peer.on('open', function () {
        document.getElementById("peer-id-label").innerHTML = peer.id;
    });

    // When someone connects to your session:
    //
    // 1. Hide the peer_id field of the connection form and set automatically its value
    // as the peer of the user that requested the connection.
    // 2.
    peer.on('connection', function (connection) {
        conn = connection;
        peer_id = connection.peer;

        // Use the handleMessage to callback when a message comes in
        conn.on('data', handleMessage);

        // Hide peer_id field and set the incoming peer id as value
        document.getElementById("peer_id").className += " hidden";
        document.getElementById("peer_id").value = peer_id;
        document.getElementById("connected_peer").innerHTML = connection.metadata.username;
    });

    peer.on('error', function(err){
        alert("An error ocurred with peer: " + err);
        console.error(err);
    });

    /**
     * Handle the on receive call event
     */
    peer.on('call', function (call) {
        var acceptsCall = confirm("Videocall incoming, do you want to accept it ?");

        if(acceptsCall){
            // Answer the call with your own video/audio stream
            call.answer(window.localStream);

            // Receive data
            call.on('stream', function (stream) {
                // Store a global reference of the other user stream
                window.peer_stream = stream;
                // Display the stream of the other user in the peer-camera video element !
                onReceiveStream(stream, 'peer-camera');
            });

            // Handle when the call finishes
            call.on('close', function(){
                alert("The videocall has finished");
            });

            // use call.close() to finish a call
        }else{
            console.log("Call denied !");
        }
    });

    /**
     * Starts the request of the camera and microphone
     *
     * @param {Object} callbacks
     */
    function requestLocalVideo(callbacks) {
        // Monkeypatch for crossbrowser geusermedia
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

        // Request audio an video
        navigator.getUserMedia({ audio: true, video: true }, callbacks.success , callbacks.error);
    }

    /**
     * Handle the providen stream (video and audio) to the desired video element
     *
     * @param {*} stream
     * @param {*} element_id
     */
    function onReceiveStream(stream, element_id) {
        // Retrieve the video element according to the desired
        var video = document.getElementById(element_id);
        // Set the given stream as the video source
        video.srcObject = stream;

        // Store a global reference of the stream
        window.peer_stream = stream;
    }

    /**
     * Appends the received and sent message to the listview
     *
     * @param {Object} data
     */
    function handleMessage(data) {
        var orientation = "text-left";

        // If the message is yours, set text to right !
        if(data.from == username){
            orientation = "text-right"
        }

        var messageHTML =  '<a href="javascript:void(0);" class="list-group-item' + orientation + '">';
                messageHTML += '<h4 class="list-group-item-heading">'+ data.from +'</h4>';
                messageHTML += '<p class="list-group-item-text">'+ data.text +'</p>';
            messageHTML += '</a>';

        document.getElementById("messages").innerHTML += messageHTML;
    }

    /**
     * Handle the send message button
     */
    document.getElementById("send-message").addEventListener("click", function(){
        // Get the text to send
        var text = document.getElementById("message").value;

        // Prepare the data to send
        var data = {
            from: username,
            text: text
        };

        // Send the message with Peer
        conn.send(data);

        // Handle the message on the UI
        handleMessage(data);

        document.getElementById("message").value = "";
    }, false);

    /**
     *  Request a videocall the other user
     */
    document.getElementById("call").addEventListener("click", function(){
        console.log('Calling to ' + peer_id);
        console.log(peer);

        var call = peer.call(peer_id, window.localStream);

        call.on('stream', function (stream) {
            window.peer_stream = stream;

            onReceiveStream(stream, 'peer-camera');
        });
    }, false);

    /**
     * On click the connect button, initialize connection with peer
     */
    document.getElementById("connect-to-peer-btn").addEventListener("click", function(){
        username = document.getElementById("name").value;
        peer_id = document.getElementById("peer_id").value;

        if (peer_id) {
            conn = peer.connect(peer_id, {
                metadata: {
                    'username': username
                }
            });

            conn.on('data', handleMessage);
        }else{
            alert("You need to provide a peer to connect with !");
            return false;
        }

        document.getElementById("chat").className = "";
        document.getElementById("connection-form").className += " hidden";
    }, false);

    /**
     * Initialize application by requesting your own video to test !
     */
    requestLocalVideo({
        success: function(stream){
            window.localStream = stream;
            onReceiveStream(stream, 'my-camera');
        },
        error: function(err){
            alert("Cannot get access to your camera and video !");
            console.error(err);
        }
    });
}, false);

'use strict';

/* globals MediaRecorder */

let mediaRecorder;
let recordedBlobs;

const errorMsgElement = document.querySelector('span#errorMsg');
const recordedVideo = document.querySelector('video#recorded');
const recordButton = document.querySelector('button#record');
const playButton = document.querySelector('button#play');
const downloadButton = document.querySelector('button#download');


recordButton.addEventListener('click', () => {
  if (recordButton.textContent === 'Record') {
    startRecording();
  } else {
    stopRecording();
    recordButton.textContent = 'Record';
    playButton.disabled = false;
    downloadButton.disabled = false;
  }
});


playButton.addEventListener('click', () => {
  const superBuffer = new Blob(recordedBlobs, {type: 'video/webm'});
  recordedVideo.src = null;
  recordedVideo.srcObject = null;
  recordedVideo.src = window.URL.createObjectURL(superBuffer);
  recordedVideo.controls = true;
  recordedVideo.play();
});


downloadButton.addEventListener('click', () => {
  const blob = new Blob(recordedBlobs, {type: 'video/mp4'});
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = 'test.mp4';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
});

function handleDataAvailable(event) {
  console.log('handleDataAvailable', event);
  if (event.data && event.data.size > 0) {
    recordedBlobs.push(event.data);
  }
}

function startRecording() {
  recordedBlobs = [];
  let options = {mimeType: 'video/webm;codecs=vp9,opus'};
  try {
    mediaRecorder = new MediaRecorder(window.stream, options);
  } catch (e) {
    console.error('Exception while creating MediaRecorder:', e);
    errorMsgElement.innerHTML = `Exception while creating MediaRecorder: ${JSON.stringify(e)}`;
    return;
  }

  console.log('Created MediaRecorder', mediaRecorder, 'with options', options);
  recordButton.textContent = 'Stop Recording';
  playButton.disabled = true;
  downloadButton.disabled = true;
  mediaRecorder.onstop = (event) => {
    console.log('Recorder stopped: ', event);
    console.log('Recorded Blobs: ', recordedBlobs);
  };
  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.start();
  console.log('MediaRecorder started', mediaRecorder);
}

function stopRecording() {
  mediaRecorder.stop();
}

function handleSuccess(stream) {
  recordButton.disabled = false;
  console.log('getUserMedia() got stream:', stream);
  window.stream = stream;

  const gumVideo = document.querySelector('video#my-camera');
  gumVideo.srcObject = stream;
}

async function init(constraints) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    handleSuccess(stream);
  } catch (e) {
    console.error('navigator.getUserMedia error:', e);
    errorMsgElement.innerHTML = `navigator.getUserMedia error:${e.toString()}`;
  }
}

document.querySelector('button#start').addEventListener('click', async () => {
  
  const constraints = {
    audio: true,
    video: true
  };
  console.log('Using media constraints:', constraints);
  await init(constraints);
});
