## Annotater Node.js and OpenCV

#### Introduction
This project allow to integrate every C/C++/Python on your browser. 
All the programs are compiled locally so be sure to have CMake installed with Python, a C/C++ compiler and OpenCV. 

#### Node.js 
Node.js doesn't allow by itself to integrate OpenCV. There is a famous library called node-opencv but many features are missing.  
Be sure to have npm installed (normally it comes with Node.js).  

#### npm
Here are the dependencies :  
- **Express** : it's kind of a Node.js web framework, allowing to pass var to the views but also making the routing easily.
- **Socket.io** : allow to create socket between server and javascripts files in public folder.
- **Node-gyp** : this library build a file understandable by "child_process"

#### The project  
**Server**  
The server is built in ./server.js. It's the center of our application.  
You can find in the _package.json_ all dependencies used by it.  
To start the server and reload it whenever a modification is done run `npm run start`  

**Views**  
The index.html is the _view_ folder. The extension is .hbs because you can pass var from the server to this file and express-handlebars make it very easy.

**C++ files**  
_cpp_ folder contains files used by the server. The _binding.gyp_ is needed to compile the _main.cpp_. If you change something run `node-gyp configure`. When configuration is done, run `node-gyp build` and it'll build an executable file in _./build/Release/_ with the target name of the _binding.gyp_
 