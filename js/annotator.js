
// global variables
var canvas; 
var context = null;   //context
var image= null;
var dataset = {};
var current = null;
var frameIndex = 0;
var bBox;
var setLoaded = false;
var annCurrentSet;

// type of labels
var labels = ["Full hand", "1 Finger", "L pose", "Thumb out", "Fist", "4 Fingers", "4 Fingers together", "4 Fingers together with thumb out", "Peace Sign", "2 Fingers and thumb"];


/**
 * object that contains info for mouse
 * interaction to create bounding boxes.
 */
function stateBBox(){
  this.nClicks     =  0;               // number of clicks
  this.coordinates =  [0, 0, 0, 0];    // coordinates of the bounding box: x, y, width, height
  this.mx           =  0;              // mouse coordinates
  this.my           =  0;
  this.click = function (){            // update states according to the number of clicks
    this.nClicks +=1;
    if(this.nClicks === 1){
      this.coordinates[0] = this.mx;
      this.coordinates[1] = this.my;
    }
    else if(this.nClicks === 2){
      this.coordinates[2] = this.mx;
      this.coordinates[3] = this.my;
    }
  }
  this.reset = function (){
    this.nClicks = 0;
  }
};


/**
 * inform users about #frames in the DB, in which he is and the number of bounding boxes in the current frame 
 */
function informUser(){
  var nRec = dataset.frames[frameIndex].locations.length; // get # of bounding boxes current image
  $("#details").html(sprintf("Frame: $d / $d <span class='pull-right'>  $d detections</span>",frameIndex, dataset.frames.length - 1, nRec));
}

/**
 * display image 
 */
function displayImage(){
  //get frame which index is indexFrame 
  image.src =  dataset.url + dataset.frames[frameIndex].file;
  
  image.onload = function(){
    context.drawImage(image, 0, 0);
    drawBoundingBox();
    informUser();
  }
}


/***
 * Load the information about the image set the user selected
 */
function loadImagesInformation(){
  $('#select').change( function () {
    var _url = $('#select').val();
    
    if (_url != "" )
    {
      $.getJSON(sprintf('$s?q=$f',_url, Math.random()), function(data) {
        
        dataset =  data;
        frameIndex = 0;
        
        //get image size from JSON file
        canvas.width =  dataset.canvas[0];  
        canvas.height = dataset.canvas[1];
        
        //change canvas size 
        document.getElementById('canvas').setAttribute('width', canvas.width);
        document.getElementById('canvas').setAttribute('height', canvas.height);
        
        displayImage();

      });
                
      $('#canvas').focus();
      setLoaded = true;
    }
  });
}


/**
 *  push a new bounding box for the current image
 */
function pushNewBoundingBox(bb){
  var listCoord = [];
  listCoord.push(bb.coordinates[0]);  // x
  listCoord.push(bb.coordinates[1]);  // y
  listCoord.push(bb.coordinates[2]);  // width
  listCoord.push(bb.coordinates[3]);  // height
  dataset.frames[frameIndex].locations.push(listCoord); 
}


/**
 * display all the bounding boxes for current image
 */
function getAndPrintAllBoxesForCurrentImage(){
  context.beginPath();  
  context.strokeStyle = 'green';
  //draw previous bounding boxes if any
  try {
    if (typeof dataset.frames[frameIndex] !== "undefined") {
      var nRec = dataset.frames[frameIndex].locations.length;
      for(var i = 0; i< nRec; i++ ){
        context.rect(dataset.frames[frameIndex].locations[i][0],
                    dataset.frames[frameIndex].locations[i][1],
                    dataset.frames[frameIndex].locations[i][2],
                    dataset.frames[frameIndex].locations[i][3]);
      }
    }
  }
  catch(err) {
    console.log("error");
  }

  context.stroke();
  context.closePath();
} //end function


/**
 * 
 */
function drawBoundingBox(x, y){

  if(!setLoaded)
    return;

  getAndPrintAllBoxesForCurrentImage();
  
  context.beginPath();
  // draw bounding box interactively
  if(bBox.nClicks === 1){
    var widthBB  =  x - bBox.coordinates[0];
    var heightBB =  y - bBox.coordinates[1];
    context.drawImage(image, 0, 0, canvas.width, canvas.height); // refresh image
    getAndPrintAllBoxesForCurrentImage();
    context.rect(bBox.coordinates[0], bBox.coordinates[1], widthBB, heightBB);
  }
  // draw full bounding box because user has selected the second point
  else if(bBox.nClicks === 2){
    bBox.coordinates[2] =  x - bBox.coordinates[0];
    bBox.coordinates[3] =  y - bBox.coordinates[1];
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    context.rect(bBox.coordinates[0], bBox.coordinates[1], bBox.coordinates[2], bBox.coordinates[3]);
   
    // new bounding box
    pushNewBoundingBox(bBox);
    informUser();
    bBox.reset(); // original state
  }

  context.strokeStyle = 'red';
  context.stroke();
  context.closePath();
}


/**
 * Events move mouse and click on canvas 
 */
function addListenerToCanvas(){
  // mouse over canvas
   canvas.addEventListener('mousemove', function(e) {
      var r = canvas.getBoundingClientRect();
       bBox.mx = e.clientX - r.left,
       bBox.my = e.clientY - r.top;
       drawBoundingBox(bBox.mx, bBox.my);
    });
    
    // click over canvas
    canvas.addEventListener('click', function(e){
      bBox.click();    // count the number of clicks and add coordinates
      drawBoundingBox(bBox.mx, bBox.my); 
    });

}


/**
 * to get pressed keys
 */
function addListenersToDocument(){
  document.addEventListener('keydown', function(event) 
  {
    //space, next frame
    if (event.keyCode == 32 || event.keyCode == 39)
    {
      if (frameIndex < dataset.frames.length - 1)
      {
          frameIndex++;
          displayImage();
          
      }
    }
    //'p' key , previous frame
    else if (event.keyCode == 80 || event.keyCode == 37)
    {
      if (frameIndex > 0)
      {
        frameIndex--;
        displayImage();              
        
      }
    }
  });
}


/**
 * reads a JSON file containing datasets info, populate the drop-down list 
 * with dataset names and the paths to the directory where the actual 
 * set of images live.
 */
function loadDatasetsInfo(){
  // read json file  
  $.getJSON(sprintf("./data/datasets.json?q=$f", Math.random()), function(data) 
  {
    $('#select').json2html(data, {'<>':'option','html':'${name}', 'value':'${url}'});
  });
}// end loadDatasetsInfo


/**
 * waits until the HTML is finished loading and then it runs the script
 */
$(document).ready(function(){
  
  canvas    = document.getElementById('canvas');  // select canvas element
  context   = canvas.getContext('2d');            // select context
  image = new Image();
  bBox  = new stateBBox();                        // to track the mouse status when creating a bounding box
  setLoaded = false;

  // load datasets names and populate the drop-down list
  loadDatasetsInfo();
 
  // allow user to choose a dataset and load images
  loadImagesInformation();
  
  // add listener for keyboard
  addListenersToDocument();
  
  // add listener to canvas
  addListenerToCanvas();

  //$('#canvas').focus();

}); // end ready function
   
    