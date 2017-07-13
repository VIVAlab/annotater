var express = require('express') //Module of Node.js for web applications
    , app = express()
    , server = require('http').Server(app) //Create server
    , io = require('socket.io')(server) //listen for socket
    , exphbs  = require('express-handlebars') //template engine
    , util = require('util') //debug tool
    , fs = require('fs') //file saver
    , execFile = require('child_process').execFile; //allow to execute a file

//create server
var port = 8081;
server.listen(port, function(req, response) {
    console.log('Listening on port %d', port);
});


//declare public folder accessible by views
app.use(express.static(__dirname + '/public'));

//template engine : Express-handlebars using .hbs extension
app.engine('.hbs', exphbs({ extname: '.hbs' }));
app.set('view engine', '.hbs');

//display viewd
app.get('/', function(request, response){
    response.render('index'); //or response.sendfile(__dirname + '/index.html');
});


//get sockets
io.on('connection', function(socket){
    //socket sent by public/js/annotater.js
    socket.on('new frame', function(data){
        console.log(util.inspect("Event new frame received"));

        if(data.region){ //if there isn't any annotation, we do nothing
            var path_images = './tmp/' //path where temporary images will be saved
                , path_data = "./public/" + data.url; //path where the base of the program is saved

            //write current image
            fs.readFile(path_data + '/' + data.frame_src, function(err, data){
                if(err) throw err;
                fs.writeFile(path_images + "frame_src.jpg", data, 'binary', function(err2){
                    if(err2) throw err2;
                });

            });
            //write next image
            fs.readFile(path_data + '/' + data.next_frame, function(err, data){
                if(err) throw err;
                fs.writeFile(path_images + "next_frame.jpg", data, 'binary', function(err){
                    if(err) throw err;
                });
            });
            //console.log(util.inspect(["Région recue : ", data.regions[0].x, data.regions[0].y, data.regions[0].width, data.regions[0].height]));
            //execute the built file and pass it the args
            execFile('./cpp/build/Release/tracker', [data.region.x, data.region.y, data.region.width, data.region.height],function(error, stdout) {
                if (error) throw error;
                //receive all the datas gave by opencv
                //so we need to make some operations to convert
                //them to integers
                var new_coord = stdout.split("\n").slice().map(function (line) {
                    line = line.replace('[',"");
                    line = line.replace(']',"");
                    return line.split(',').slice().map(function(number){
                        return (parseFloat(number));
                    })
                });

                //console.log(util.inspect("Nouvelles coordonées : ",new_coord));
                //we send a socket to /public/js/socket.js with the new coord
                socket.emit('new frame', new_coord, data);
            });
        }
    });


});

//copy and paste it where you need to
console.log(util.inspect());