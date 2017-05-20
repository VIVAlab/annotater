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
var key              =  {'a': 65, 'c' : 67, 'd' : 68, 'p' : 80, 'left' : 37, 'right' : 39, 'space' : 32, 'u' : 85, 'up' : 38, 'down' : 40, 'w' : 87, 'x' : 88, 'enter' : 13, 'esc' : 27, '1' : 49, '2' : 50};
var messages         =  {'hideAll' : 0, 'closeFirst': 1, 'multipart': 2, 'finish': 3, 'success':4 };
var settings         = null;
var multipart        = false;
var startMultiPart   = false;
var multiPartAnnotation = null;
var multipartObjectIndex = 0;
var shiftKeyDown = false;
var delta = 2;      // translation in x and y
var current_part = -1
var current_annotation = -1; 
 

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
 * 
 */
function showMessage(message) {
  showHideAlerts(messages["hideAll"]);
  $('#alert_part').hide();
  $('#msg').html("<div class='alert alert-info' id ='alert_part' role='alert' style= 'display:display' >"+ "Annotating: " + message +"</div>");
}


/**
 * inform user about the annotation task 
 */
function showHideAlerts(opt){
  if(opt == messages["hideAll"]){
    $('#alert_close_annotation').hide();
    $('#alert_multipart').hide();
    $('#alert_finish').hide();
    $('#alert_success').hide();
     $('#alert_part').show();
  }
  else if(opt === messages['closeFirst']){
    $('#alert_part').hide();
    $('#alert_close_annotation').show();    
  }
  else if(opt === messages['multipart']){
    $('#alert_part').hide();
    $('#alert_multipart').show();    
  }
  else if(opt === messages['finish']){
    $('#alert_part').hide();
    $('#alert_finish').show();    
  }
  else if(opt === messages['success']){
    $('#alert_part').hide();
    $('#alert_success').show();
  }
}// end showHideAlerts


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
  startMultiPart = false;
  current_part = -1;
  current_annotation = -1;
  showHideAlerts(messages['hideAll']);  
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
  // is it not a multipart object
  if(!multipart){
    var setOfParts = { 'parts' : [] };
    setOfParts.parts.push(oneAnnotation);
    dataset.frames[frameIndex].annotations.push(setOfParts);
    current_part = 0
    current_annotation = dataset.frames[frameIndex].annotations.length -1;
  } 
  // it is a multipart object so, all the rois are stored in an array of parts
  else if(multipart && startMultiPart){
     dataset.frames[frameIndex].annotations[multipartObjectIndex].parts.push(oneAnnotation);
     current_part = dataset.frames[frameIndex].annotations[multipartObjectIndex].parts.length -1;
     current_annotation = multipartObjectIndex;
     //move to the next label
     nextLabel();
  }

  
} // end pushNewBoundingBox


/**
 * display all the bounding boxes for current image
 */
function getAndPrintAllBoxesForCurrentImage(){

  if(multipart && !startMultiPart)
    showHideAlerts(messages['multipart']);

  context.beginPath();  
  context.strokeStyle = colorBoundingBox;
  context.font = labelFont;
  context.fillStyle = colorBoundingBox
  //draw previous bounding boxes if any
  try {
    if (typeof dataset.frames[frameIndex] !== "undefined") {
      var nObjects = dataset.frames[frameIndex].annotations.length;
      for(var i = 0; i< nObjects; i++ ){
        var nRec = dataset.frames[frameIndex].annotations[i].parts.length;
        for(var j =0; j < nRec; j++){
          context.rect(dataset.frames[frameIndex].annotations[i].parts[j].x,
                    dataset.frames[frameIndex].annotations[i].parts[j].y,
                    dataset.frames[frameIndex].annotations[i].parts[j].width,
                    dataset.frames[frameIndex].annotations[i].parts[j].height);
         
          context.fillText(dataset.frames[frameIndex].annotations[i].parts[j].label, 
                         dataset.frames[frameIndex].annotations[i].parts[j].x, 
                         dataset.frames[frameIndex].annotations[i].parts[j].y - spaceLabel
                         );
        }
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

    showHideAlerts(messages['hideAll']);
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
    
    if(!multipart)
      showHideAlerts(messages['success']);

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


/***
 * 
*/
function refreshImage()
{
  context.drawImage(image, 0, 0, canvas.width, canvas.height); // refresh image
  getAndPrintAllBoxesForCurrentImage();
  informUser();
}


/***
 * 
 */
function  getLastAnnotationIndices()
{    
    // the annotations array always exists, but it can be empty
    var num_annotations = dataset.frames[frameIndex].annotations.length;
    var num_parts = -1;

    if(num_annotations > 0)
    {
      current_annotation  = num_annotations - 1;
      num_parts = dataset.frames[frameIndex].annotations[current_annotation].parts.length;
      
      if(num_parts > 0)
        current_part = num_parts -1; 
      else
        current_part = -1;
    }
    else
    {
       current_annotation = -1;
       current_part = -1;
    }   
}


/***
 * choose the next label in the list of labels
 */
function nextLabel(){
  labelSelected++;
  if(labelSelected === settings[objectSelected].labels.length){ 
    startMultipartAnnotation(); // stop multipart annotation
    labelSelected = 0; 
    startMultipartAnnotation(); // initiate a new multipart annotation
}

   $("#select_label_type").val(settings[objectSelected].labels[labelSelected]);
   showMessage(settings[objectSelected].labels[labelSelected]);
}

/**
 * to get pressed keys
 */
function addListenersToDocument(){
  document.addEventListener('keydown', function(event) 
  {
    if(!setLoaded)
    return;
    
    if (event.shiftKey) {
      shiftKeyDown = true;
     } 
     else {
      shiftKeyDown = false;
     }
    
    //right key, next frame
    //if (event.keyCode == key['space'] || event.keyCode == key['right'])
    if ((!shiftKeyDown && event.keyCode == key['right']) || (event.keyCode == key['space']) )
    {
      // it is a multipart object and need to be closed before moving
      if(startMultiPart)
      {
        //showHideAlerts(messages['closeFirst']);
        startMultipartAnnotation(); //close
        //startMultipartAnnotation(); // open a new one
        return;
      }

      if (frameIndex < dataset.frames.length - 1)
      {
          frameIndex++;
          displayImage();
          getLastAnnotationIndices();  
      }
     
    }
    // previous frame
    //else if (event.keyCode == key['p'] || event.keyCode == key['left'])
    else if ((!shiftKeyDown && event.keyCode == key['left']) || (event.keyCode == key['p']))
    {
      // it is a multipart object and need to be closed before moving
      if(startMultiPart)
      {
        startMultipartAnnotation(); //close
        //startMultipartAnnotation(); //open a new one

        //showHideAlerts(messages['closeFirst']);
        return;
      }

      if (frameIndex > 0)
      {
          frameIndex--;
          displayImage();              
          getLastAnnotationIndices(); 
      }

    }

    //select new label 'd' key
    else if (event.keyCode == key['d'] || event.keyCode == key['esc'])
    {
      nextLabel();
    }

    // select previous label 'a'
    else if (event.keyCode == key['a'])
    {
      labelSelected--; 
      
      if(labelSelected === -1) 
         labelSelected =  settings[objectSelected].labels.length-1;

      $("#select_label_type").val(settings[objectSelected].labels[labelSelected]);
      showMessage(settings[objectSelected].labels[labelSelected]);
    }

    // delete last annotation 'u'
    else if (event.keyCode === key['u'])
    {
       // it removes an whole set of parts for multipart objects
       // or only one part for single part objects
       dataset.frames[frameIndex].annotations.pop();

      // // if is not a multipart object, remove the whole parts JSON object 
      // if(!multipart){
      //   dataset.frames[frameIndex].annotations.pop();
      // }
      // else { // remove the last part of the parts JSON object
        
      //   if(dataset.frames[frameIndex].annotations.length > 0)
      //     dataset.frames[frameIndex].annotations[multipartObjectIndex].parts.pop();
      //   else
      //     dataset.frames[frameIndex].annotations.pop();
      // }
      getLastAnnotationIndices();
      refreshImage();
    }

    // remove all annotations for current frame 'c'
    else if (event.keyCode === key['c'])
    {
      // delete all bounding boxs for current frame
      dataset.frames[frameIndex].annotations = []; 
      getLastAnnotationIndices();
      refreshImage();
    }
    
    else if(shiftKeyDown && event.keyCode === key['right']){
       getLastAnnotationIndices();
       if(current_annotation == -1)
         return;

       if(dataset.frames[frameIndex].annotations[current_annotation].parts[current_part].x + delta + 
          dataset.frames[frameIndex].annotations[current_annotation].parts[current_part].width < canvas.width )
       {
         dataset.frames[frameIndex].annotations[current_annotation].parts[current_part].x += delta;
         refreshImage();
       }
    }

    else if(shiftKeyDown && event.keyCode === key['left']){
      getLastAnnotationIndices();
      if(current_annotation == -1)
        return;

      if(dataset.frames[frameIndex].annotations[current_annotation].parts[current_part].x - delta > 0){
        dataset.frames[frameIndex].annotations[current_annotation].parts[current_part].x -= delta;
        refreshImage();
      
      }
    }
    
    else if(shiftKeyDown && event.keyCode === key['up']){
      getLastAnnotationIndices();
      if(current_annotation == -1)
        return;

      if(dataset.frames[frameIndex].annotations[current_annotation].parts[current_part].y - delta > 0){
        dataset.frames[frameIndex].annotations[current_annotation].parts[current_part].y -= delta;
        refreshImage();
      }
    }

    else if(shiftKeyDown && event.keyCode === key['down']){
       getLastAnnotationIndices();
       if(current_annotation == -1)
         return;

       if(dataset.frames[frameIndex].annotations[current_annotation].parts[current_part].y + delta + 
          dataset.frames[frameIndex].annotations[current_annotation].parts[current_part].height < canvas.height )
       {
         dataset.frames[frameIndex].annotations[current_annotation].parts[current_part].y += delta;
         refreshImage();
       }
    }
    // expand BoundingBox
    else if(event.keyCode === key['w']){
       
       getLastAnnotationIndices();
       if(current_annotation == -1)
         return;
       if((dataset.frames[frameIndex].annotations[current_annotation].parts[current_part].y - delta > 0) &&
          (dataset.frames[frameIndex].annotations[current_annotation].parts[current_part].x - delta > 0) &&
          (dataset.frames[frameIndex].annotations[current_annotation].parts[current_part].y + delta + 
          dataset.frames[frameIndex].annotations[current_annotation].parts[current_part].height < canvas.height ) &&
          (dataset.frames[frameIndex].annotations[current_annotation].parts[current_part].x + delta + 
          dataset.frames[frameIndex].annotations[current_annotation].parts[current_part].width < canvas.width )
         )
       {
         dataset.frames[frameIndex].annotations[current_annotation].parts[current_part].x -= delta/2;
         dataset.frames[frameIndex].annotations[current_annotation].parts[current_part].y -= delta/2;
         dataset.frames[frameIndex].annotations[current_annotation].parts[current_part].width += delta;
         dataset.frames[frameIndex].annotations[current_annotation].parts[current_part].height += delta;
         refreshImage();
       }
    }
     // reduce BoundingBox
    else if(event.keyCode === key['x'])
    {   
          if((dataset.frames[frameIndex].annotations[current_annotation].parts[current_part].height > delta *2  ) &&
             (dataset.frames[frameIndex].annotations[current_annotation].parts[current_part].width  > delta *2 ) )
         {
            dataset.frames[frameIndex].annotations[current_annotation].parts[current_part].x += delta;
            dataset.frames[frameIndex].annotations[current_annotation].parts[current_part].y += delta;
            dataset.frames[frameIndex].annotations[current_annotation].parts[current_part].width -= 2*delta;
            dataset.frames[frameIndex].annotations[current_annotation].parts[current_part].height -= 2*delta;
            refreshImage();
         }
    }
    //console.log(event.keyCode);
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


/***
 * 
 */
function startMultipartAnnotation(){
  
  showHideAlerts(messages['hideAll']); // remove alerts messages
  startMultiPart = !startMultiPart;
    
  // when starting a multipart annotation 
  // a new object to hold all the annotations is created
  if(startMultiPart){
    //$("#multipartButton").text("Finish");
    //$("#multipartButton").removeClass("btn btn-success").addClass("btn btn-danger");
    var setOfParts = { 'parts' : [] };
    dataset.frames[frameIndex].annotations.push(setOfParts);
    
    // current object parts
    multipartObjectIndex = dataset.frames[frameIndex].annotations.length - 1;  
    showHideAlerts(messages['hideAll']);   
    showHideAlerts(messages['finish']);   

    // set the labels in the first position
    labelSelected = 0 
    $("#select_label_type").val(settings[objectSelected].labels[labelSelected]);
    showMessage(settings[objectSelected].labels[labelSelected]);  
  }
  else{
    // check if there is at least one part annotated. If not, remove the parts object 
    // inserted in the previous section of this if-else
    // this prevent the system to push empty objects
    if(dataset.frames[frameIndex].annotations[multipartObjectIndex].parts.length === 0)
      dataset.frames[frameIndex].annotations.pop();
      
    //$("#multipartButton").text("Start"); 
    //$("#multipartButton").removeClass("btn btn-danger").addClass("btn btn-success");
  }
}


/**
 * Listener for multipartButton  
 */
function addListenerToMultipartButton(){

  $("#multipartButton").click(function(event)
  {
    startMultipartAnnotation();  
  });   
} // end listener for multipartbutton


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
    
    showMessage(settings[0].labels[0]);
  });
} // end load settings


/**
 * Manage the changes in the drop down list that allow us to 
 * select a type of annotation and a label
 */
function annotationTypeAndLabels(){
  //changes in the list of labels for a particular annotation type
   $('#select_label_type').change( function () {
     var index = $("#select_label_type option:selected").index();
     labelSelected = index;
     showMessage(settings[objectSelected].labels[labelSelected]);
  });

  // changes in the list of annotation types
  $('#select_annotation_type').change( function () {
     var index = $("#select_annotation_type option:selected").index();
     objectSelected = index;
     labelSelected  = 0;
     multipart = (settings[index].multipart === "true")? true : false; // if this a multipart annotation or it is not
     
     // display or hide button to start and finish multipart object annotation task
     if(multipart === true){
       //$('#multipartButton').attr("style", "display:display");
       startMultipartAnnotation();  
    }
     //else
       //$('#multipartButton').attr("style", "display:none");
    
     $('#select_label_type').html(""); //clear drop down list
     $('#select_label_type').json2html(settings[index].labels, {'<>':'option','html': '$', 'value':'$'});
     showHideAlerts(messages['hideAll']);
     showMessage(settings[index].labels[0]);
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
  addListenerToMultipartButton();
}); // end ready function
   