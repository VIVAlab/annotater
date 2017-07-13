/**
 * Created by goren on 17-06-15.
 */
var socket;


// init socket
function socket_init(){
    //new socket
    socket = io.connect('http://localhost:8081');

    //add listeners to socket event
    socket.on('new frame', function(new_coord, data){
        newTrackedBox(new_coord, data);
    });
}

/**
 * send socket to nodejs server
 * @param name : name of the socket
 * @param data : data passed to nodejs server
 */
function socket_send(name, data){
    socket.emit(name, data);
    //console.log('Socket "' + name + '" sent from app to server');
}