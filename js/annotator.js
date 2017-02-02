// global variables
var canvas; 
var context          = null;
var image            = null;
var dataset          = {};
var frameIndex       = 0;
var bBox;
var setLoaded        = false;
var labelSelected;
var objectSelected;
var colorBoundingBox = 'red';
var labelFont        = '14px Arial';
var spaceLabel       =  5; //number of pixels between text and bounding box
var key              =  {'a': 65, 'c' : 67, 'd' : 68, 'p' : 80, 'left' : 37, 'right' : 39, 'space' : 32, 'u' : 85};
var settings         = null;   

/**
 * object that contains info for mouse
 * interaction to create bounding boxes.
 */
function stateBBox(){
  this.nClicks        =  0;               // number of clicks
  this.coordinates    =  [0, 0, 0, 0];    // coordinates of the bounding box: x, y, width, height
  this.mx             =  0;               // mouse coordinates
  this.my             =  0;
  this.label          =  'default';
  this.annotationType =  'default';
  this.click = function (){             // update states according to the number of clicks
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
} // end stateBox


/**
 * inform users about #frames in the DB, in which he is and the number of bounding boxes in the current frame 
 */
function informUser(){
  var nRec = dataset.frames[frameIndex].annotations.length; // get # of bounding boxes current image
  $("#details").html(sprintf("Frame: $d / $d <span class='pull-right'>  $d annotations</span>",frameIndex+1, dataset.frames.length, nRec));
} // end informUser


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
} // end displayImage


/**
 * Set image index and selected label to their default values 
 */
function initializeIndexImageSet(){
  frameIndex     = 0;
  labelSelected  = 0;
  objectSelected = 0;
} // end initializeIndexImageSet


/**
 *  Given a JSON object initialize annotation tool
 */
function initializeImgDataset(data){
  dataset =  data;
  initializeIndexImageSet();
            
  //get image size from JSON file to resize canvas
  canvas.width =  dataset.canvas[0];  
  canvas.height = dataset.canvas[1];
  //change canvas size 
  document.getElementById('canvas').setAttribute('width', canvas.width);
  document.getElementById('canvas').setAttribute('height', canvas.height);
  displayImage();
  setLoaded = true;
  //$('#show-label-type').html("Label (" + (1) + "/" + dataset.labels.length + "): " + dataset.labels[0]);
} // end initializeImgDataset


/***
 * Load the information about the image set the user has selected
 */
function loadImagesInformation(){
  $('#select').change( function () {
    var _url = $('#select').val();
    
    if (_url != "" ){
      $.getJSON(sprintf('$s?q=$f',_url, Math.random()), function(data) {
        initializeImgDataset(data);
      });
      $('#canvas').focus();
    }
  });
} // loadImagesInformation


/**
 *  push a new bounding box for the current image
 */
function pushNewBoundingBox(bb){
  
  var oneAnnotation = { 'type'           :   bb.annotationType,
                        'label'          :   bb.label,
                        'x'              :   bb.coordinates[0],
                        'y'              :   bb.coordinates[1],
                        'width'          :   bb.coordinates[2], 
                        'height'         :   bb.coordinates[3]
                      };
  dataset.frames[frameIndex].annotations.push(oneAnnotation); 
} // end pushNewBoundingBox


/**
 * display all the bounding boxes for current image
 */
function getAndPrintAllBoxesForCurrentImage(){
  context.beginPath();  
  context.strokeStyle = colorBoundingBox;
  context.font = labelFont;
  context.fillStyle = colorBoundingBox
  //draw previous bounding boxes if any
  try {
    if (typeof dataset.frames[frameIndex] !== "undefined") {
      var nRec = dataset.frames[frameIndex].annotations.length;
      for(var i = 0; i< nRec; i++ ){
        context.rect(dataset.frames[frameIndex].annotations[i].x,
                    dataset.frames[frameIndex].annotations[i].y,
                    dataset.frames[frameIndex].annotations[i].width,
                    dataset.frames[frameIndex].annotations[i].height);
         
        context.fillText(dataset.frames[frameIndex].annotations[i].label, 
                         dataset.frames[frameIndex].annotations[i].x, 
                         dataset.frames[frameIndex].annotations[i].y - spaceLabel
                         );
      }
    }
  }
  catch(err) {
    console.log("error");
  }
  context.stroke();
  context.closePath();
} //end function getAndPrintAllBoxesForCurrentImage


/**
 * draw bounding boxes interactively while the user selects a region of interest
 */
function drawBoundingBox(x, y){

  if(!setLoaded)
    return;
  // print all previous bounding boxes
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
   
    //var label = dataset.labels[labelSelected];
    var label = settings[objectSelected].labels[labelSelected];
    var annot = settings[objectSelected].type;
    bBox.label = label;
    bBox.annotationType = annot;

    // new bounding box
    pushNewBoundingBox(bBox);
    informUser();

    context.font = labelFont;
    context.fillStyle = colorBoundingBox;
    context.fillText(label, bBox.coordinates[0], bBox.coordinates[1]-spaceLabel);
    bBox.reset(); // original state: no points have been selected
  }

  context.strokeStyle = colorBoundingBox;
  context.stroke();
  context.closePath();
} // end drawBoundingBox


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
} // end addListenerToCanvas


/**
 * to get pressed keys
 */
function addListenersToDocument(){
  document.addEventListener('keydown', function(event) 
  {
    if(!setLoaded)
    return;

    //right key, next frame
    //if (event.keyCode == key['space'] || event.keyCode == key['right'])
    if (event.keyCode == key['right'])
    {
      if (frameIndex < dataset.frames.length - 1)
      {
          frameIndex++;
          displayImage();
      }
    }
    // previous frame
    //else if (event.keyCode == key['p'] || event.keyCode == key['left'])
    else if (event.keyCode == key['left'])
    {
      if (frameIndex > 0)
      {
        frameIndex--;
        displayImage();              
      }
    }

    //select new label 'd' key
    else if (event.keyCode == key['d'])
    {
      labelSelected++;
      if(labelSelected === settings[objectSelected].labels.length) 
         labelSelected = 0; 

      $("#select_label_type").val(settings[objectSelected].labels[labelSelected]);
    }

    // select previous label 'a'
    else if (event.keyCode == key['a'])
    {
      labelSelected--; 
      
      if(labelSelected === -1) 
         labelSelected =  settings[objectSelected].labels.length-1;

      $("#select_label_type").val(settings[objectSelected].labels[labelSelected]);
    }

    // delete last annotation 'u'
    else if (event.keyCode === key['u'])
    {
      // delete last bounding box
      dataset.frames[frameIndex].annotations.pop(); 
      context.drawImage(image, 0, 0, canvas.width, canvas.height); // refresh image
      getAndPrintAllBoxesForCurrentImage();
      informUser();
    }

    // remove all annotations for current frame 'c'
    else if (event.keyCode === key['c'])
    {
      // delete all bounding boxs for current frame
      dataset.frames[frameIndex].annotations = []; 
      context.drawImage(image, 0, 0, canvas.width, canvas.height); // refresh image
      getAndPrintAllBoxesForCurrentImage();
      informUser();
    }
  });
} // end addListenersToDocument


/**
 * save JSON object in a file 
 */
function save(link, data, filename)
{
		var stringfied = JSON.stringify(data, null, 2);
		var blob = new Blob([stringfied], {type: "application/json"});
		var url  = URL.createObjectURL(blob);
		link.attr("download", filename);
		link.attr("href", url );
} // end save


/**
 * Listener for downloading file 
 */
function addListenerToDownloadData(){
  $("#download").click(function(event)
  {
    var filename = sprintf('$s.json', $('#download_name').val());
    var data    = dataset;
    save($('#download'),data, filename);
	});
} // end addListenerToDownloadData


/**
 * Load annotation file 
 */
function addListenerToUploadData(){
  $('#upload').on('change', function(event) {
	  var file = event.target.files[0];
	  var textType = /json.*/;
	  var self = $(this);
		
    if (file.type == "" || file.type.match(textType)) 
	  {
				var reader = new FileReader();
	 			reader.onload = function(e) 
  			{
          // annotations is the JSON file containing all the info about the dataset
				  var annotations = JSON.parse(reader.result);  
          initializeImgDataset(annotations);  // initialize annotation tool

          // set name of file uploaded to the corresponding gui element
          var path = [ {"name": annotations.name, "url": annotations.url}];
					$('#select').json2html(annotations, {'<>':'option','html':'${name}', 'value':'${url}'});
					$('#select').val(annotations.url);
					$('#canvas').focus();
	 			}	
	 			reader.readAsText(file);
	} 
	else 
		alert("File not supported!");	
  }); //upload
} // end addListenerToUploadData


/**
 * reads a JSON file containing datasets info, populate the drop-down list 
 * with dataset names and the paths to the directory where the actual 
 * set of images live.
 */
function loadDatasetsInfo(){
  // read json file  
  $.getJSON(sprintf("./config/datasets.json?q=$f", Math.random()), function(data) 
  { 
    $('#select').json2html(data, {'<>':'option','html':'${name}', 'value':'${url}'});
  });
}// end loadDatasetsInfo


/**
 * Load settings 
 */
function setSettings(){
  var configData;
  // read json file  
  $.getJSON(sprintf("./config/config.json?q=$f", Math.random()), function(configData) 
  {
    settings = configData;
    $('#select_annotation_type').json2html(settings, {'<>':'option','html':'${type}', 'value':'${type}'});
    // the first time, get the labels for the first type of object
    $('#select_label_type').json2html(settings[0].labels, {'<>':'option','html': '$', 'value':'$'});
  });
}


/**
 * Manage the changes in the drop down list that allow us to 
 * select a type of annotation and a label
 */
function annotationTypeAndLabels(){
  //changes in the list of labels for a particular annotation type
   $('#select_label_type').change( function () {
     var index = $("#select_label_type option:selected").index();
     labelSelected = index;
  });

  // changes in the list of annotation types
  $('#select_annotation_type').change( function () {
     var index = $("#select_annotation_type option:selected").index();
     objectSelected = index;
     labelSelected  = 0;
     $('#select_label_type').html(""); //clear drop down list
     $('#select_label_type').json2html(settings[index].labels, {'<>':'option','html': '$', 'value':'$'});
  });
}// end annotationTypeAndLabels

/**
 * waits until the HTML is finished loading and then it runs the script
 */
$(document).ready(function(){
  
  canvas    = document.getElementById('canvas');  // select canvas element
  context   = canvas.getContext('2d');            // select context
  image = new Image();
  bBox  = new stateBBox();                        // to track the mouse status to create a bounding box
  setLoaded = false;                              // flag indicating if the image set has been uploaded
   
  // set settings for the annotation task
  setSettings(); 

  // load datasets names and populate the drop-down list
  loadDatasetsInfo();
  // allow user to choose a dataset and load images
  loadImagesInformation();

  // select annotation type and set of labels.
  annotationTypeAndLabels(); 

  // add listener for keyboard, upload and download files
  addListenersToDocument();
  addListenerToCanvas();
  addListenerToDownloadData();
  addListenerToUploadData();



}); // end ready function
   