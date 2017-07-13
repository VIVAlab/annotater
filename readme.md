# Annotater Node.js and OpenCV

### Introduction
This project allow to integrate every C/C++/Python on your browser. 
All the programs are compiled locally so be sure to have CMake installed with Python, a C/C++ compiler and OpenCV. 

### Node.js 
Node.js doesn't allow by itself to integrate OpenCV. There is a famous library called node-opencv but many features are missing.  
Be sure to have npm installed (normally it comes with Node.js).  

### npm
Here are the dependencies :  
- **Express** : it's kind of a Node.js web framework, allowing to pass var to the views but also making the routing easily.
- **Socket.io** : allow to create socket between server and javascripts files in public folder.
- **Node-gyp** : this library build a file understandable by "child_process"

### Project
**Server**  
The server is built in ./server.js. It's the center of our application.  
You can find in the _package.json_ all dependencies used by it.  
To start the server and reload it whenever a modification is done run `npm run start`  

**Views**  
The index.html is the _view_ folder. The extension is .hbs because you can pass var from the server to this file and express-handlebars make it very easy.

**C++ files**  
_cpp_ folder contains files used by the server. The _binding.gyp_ is needed to compile the _main.cpp_. If you change something run `node-gyp configure`. When configuration is done, run `node-gyp build` and it'll build an executable file in _./build/Release/_ with the target name of the _binding.gyp_
 
 
### Installation
Please follow these steps :
1. 
    `sudo apt-get install python-software-properties python g++ make`  
    `sudo add-apt-repository ppa:chris-lea/node.js`  
    `sudo apt-get update`  
    `sudo apt-get install nodejs`  

    Be sure nodejs was correctly installed by running `node -v`
 
2. Follow this tutorial to install opencv with cmake http://docs.opencv.org/trunk/d7/d9f/tutorial_linux_install.html

3. Clone this git repository : `git clone -b opencv https://github.com/VIVAlab/annotater.git`  

4. Now we need to indicate to node-gyp the path file :
    `cd annotater/cpp`  
    `node-gyp configure`  
    If this worked, you can go to next step and type :
    `node-gyp build` whichi is going to compile our c++ files and create a executable file in build/Release/
    
5. Once it's done, you can start the server :  
    `cd ..`  
    `npm run start`