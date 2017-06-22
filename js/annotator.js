// global variables
//don't change
var canvas, bBox, line, context, setLoaded;
var image            = null;
var dataset          = {};
var temp_region     = null; // temporary region used for time annotation
var frameIndex       = -1;
var timeAnnotations = []; // contains time annotations that are not yet finished (don't have any frame end)
var timeLabelSelected = 0, timeObjectSelected = 0, labelSelected = 0, objectSelected = 0;
var key              =  {'a': 65,'s':83,'c' : 67, 'd' : 68, 'e':69, 'p' : 80, 'z' : 90, 'r' : 82, 'left' : 37, 'right' : 39, 'space' : 32, 'u' : 85, 'up' : 38, 'down' : 40, 'w' : 87, 'x' : 88, 'enter' : 13, 'esc' : 27, '+' : 107, '-' : 109, 'pgup': 33, 'pgdn': 34, 'ctrl':17, 'shift':16};
var spacial_settings = [];
var time_settings = [];
var shiftKeyDown, ctrlKeyDown, hKeyDown, wKeyDown, dKeyDown, sKeyDown;
var bound_moving = {'left':false, 'right':false, 'lower':false, 'upper':false, 'all':false};
var type_annotation_clicked = ""; //For resizing of moving box
var index_annotation_clicked = -1;//For resizing of moving box
var info_box_before_move = {};
var diff_x, diff_y;
var wait_for_click;
var auto_creation = false;

//changable :
var colorBoundingBox = "#FF0000";
var colorTimeBoundingBox = "#0000FF";
var colorLine = "#FF0000";
var labelFont        = '18px Arial';
var spaceLabel       =  5; //number of pixels between text and bounding box
var line_width = 10;
var auto_creation_torso_height = 1.5;
var auto_creation_torso_width = 2;

/**
 * object that contains info for mouse
 * interaction to create bounding boxes.
 */
function stateBBox(){
    this.nClicks        = 0;               // number of clicks
    this.coordinates    = [0, 0, 0, 0];    // coordinates of the bounding box: x, y, width, height
    this.mx             = 0;               // mouse coordinates
    this.my             = 0;
    this.label          = 'default';
    this.annotationType = 'default';
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
    };
    this.reset = function (){
        this.nClicks = 0;
        this.label          =  'default';
        this.annotationType =  'default';
    }
} // end stateBox

/**
 * if we want to draw a line instead of rectangle
 */
function stateLine(){
    this.nbClicks       = 0;
    this.coordinates    = [];
    this.mx             = 0;
    this.my             = 0;
    this.label          = 'default';
    this.annotationType = 'default';
    this.nbJunctions    = 0;
    this.click = function (){
        this.nbClicks++;
        this.coordinates.push([this.mx, this.my]);
    };
    this.getLastCoordinates = function(){
        var index = this.coordinates.length;
        return [this.coordinates[index-1][0], this.coordinates[index-1][1]];
    };
    this.reset = function (){
        this.nbClicks       = 0;
        this.coordinates    = [];
    }
} // end stateBox

/**
 * object that represents a time annotation
 */
function stateTimeAnnotation(){
    this.frameStart = 0;
    this.frameEnd   = 0;
    this.type       = 'default';
    this.label      = 'default';
    this.region     = null;
} // end stateBox

/**
 * return html code of a collapse with a title and a array given
 * @param title Title where the user will click on
 * @param id_name
 * @param datas array given
 * @param parameter
 * @returns {string} html code
 */
function getHtmlCollapse(title, id_name, data, parameter){
    var code_html = '<a href="#'+id_name+'" data-toggle="collapse">'+ title +'</a>';
    code_html += '<div id="'+id_name+'" class="collapse">';
    code_html += '<table class="centered">';
    for(var i = 0; i < data.length; i++){
        if(parameter === 'time'){
            code_html += '<tr><td>' + data[i] + ' ' + '<a href="#" onclick="deleteTimeAnnotation('+i+')" style="color:red">x</a></td></tr>';
        } else if(parameter === 'spatial'){
            code_html += '<tr><td>' + data[i].label + '</td></tr>';
        }
    }
    code_html += '</table></div>';
    return code_html;
}

/**
 * inform users about #frames in the DB, in which he is and the number of bounding boxes in the current frame
 */
function refreshDatas(){
    // display the # of current frame
    $("#frames").html(sprintf("Frame: $d / $d",frameIndex+1,dataset.frames.length));

    // count the number of spatial&time annotations and display their label under the canvas
    var tAnnotations = getTimeAnnotations();
    var html_sAnnotations = getHtmlCollapse(
        dataset.frames[frameIndex].annotations.length + ' spatials annotations',
        'collapse_spatial_annotations',
        dataset.frames[frameIndex].annotations,
        'spatial'
    );
    var html_tAnnotations = getHtmlCollapse(
        tAnnotations.length + ' time annotations',
        'collapse_time_annotations',
        tAnnotations,
        'time'
    );

    $("#spatial_annotations").html(html_sAnnotations);
    $("#time_annotations").html(html_tAnnotations);

} // end refreshDatas


/**
 * show alert to user
 */
function showMessage(alert) {
    if(alert['type']){ // if alert's type is specified 
        $('#alert').attr("class","alert alert-"+alert['type']);
        $('#alert').html(alert['message']);
    } else { // if we just want to inform the user something
        $('#alert').attr("class","alert alert-info");
        $('#alert').html(alert);
    }
}


/**
 * display image
 */
function displayImage(){
    //get frame which index is indexFrame
    image.src =  dataset.url + dataset.frames[frameIndex].file;
    image.onload = function(){
        if(auto_creation) autoCreateTorsoBox();
        refreshImage();
    }
} // end displayImage

/***
 *
 */
function refreshImage() {
    context.drawImage(image, 0, 0, canvas.width, canvas.height); // refresh image
    getAndPrintAllBoxesForCurrentImage();
    refreshDatas();
} // end refreshImage

/**
 *  Given a JSON object initialize annotation tool
 */
function initializeImgDataset(data){
    //get datas and ordre them by name asc
    frames = data.frames.sort(sortByNameFile);
    dataset = data;
    dataset.frames = frames;

    //initialize
    frameIndex     = 0;
    labelSelected  = 0;
    objectSelected = 0;

    //get image size from JSON file to resize canvas
    canvas.width =  dataset.canvas[0];
    canvas.height = dataset.canvas[1];
    //change canvas size
    document.getElementById('canvas').setAttribute('width', canvas.width);
    document.getElementById('canvas').setAttribute('height', canvas.height);
    displayImage();

    showMessage({'type':'success', 'message':'Frames initialized'});

    setLoaded = true;
} // end initializeImgDataset

/**
 * sort frames array by name file
 */
function sortByNameFile(a ,b){
    var nameA = a.file.toLowerCase();
    var nameB = b.file.toLowerCase();
    return ((nameA < nameB) ? -1 : ((nameA > nameB) ? 1 : 0));
}

/**
 * get whether canvas is busy
 */
function getIfCanvasFree(){
    return (getBoundMoving()==='none' && !wait_for_click && (bBox.nClicks != 1) && (line.nbClicks==0) && (temp_region==null));
}

/**
 * if head annotated, create automatically a torso box
 */
function autoCreateTorsoBox(){
    var annotation, bbox;
    var torso_already_drawn = false;
    //we test if torso is already drawn
    for(var i = 0; i < dataset.frames[frameIndex].annotations.length; i++) {
        annotation = dataset.frames[frameIndex].annotations[i];
        if(annotation.label === "torso" || annotation.label === "Torso"){
            torso_already_drawn = true;
        }
    }
    if(!torso_already_drawn){
        for(var i = 0; i < dataset.frames[frameIndex].annotations.length; i++){
            annotation = dataset.frames[frameIndex].annotations[i];
            if(annotation.label === "head" || annotation.label === "Head"){
                bbox = new stateBBox();
                bbox.coordinates[0] = (annotation.x + annotation.width/2 - annotation.width*auto_creation_torso_width/2) < 0 ? 0 : annotation.x + annotation.width/2 - annotation.width*auto_creation_torso_width/2;
                bbox.coordinates[1] = annotation.y + annotation.height;
                bbox.coordinates[2] = (bbox.coordinates[0] + annotation.width*auto_creation_torso_width) < canvas.width ? annotation.width*auto_creation_torso_width : canvas.width - bbox.coordinates[0];
                bbox.coordinates[3] = (bbox.coordinates[1] + annotation.height*auto_creation_torso_height) < canvas.height ? annotation.height*auto_creation_torso_height : canvas.height - bbox.coordinates[1];
                bbox.label = "Torso";
                bbox.annotationType = annotation.type;
                drawRectangle(
                    bbox.coordinates[0],
                    bbox.coordinates[1],
                    bbox.coordinates[2],
                    bbox.coordinates[3],
                    bbox.label
                );
                pushNewAnnotation(bbox, 'box');
                refreshImage();
            }
        }
    }

}

/**
 * get if user has clicked on a box with a key pressed
 * return true if the click was on a box
 */
function clickOnABox(annotation, mouse_pos , type_annotation, num_annotation){
    num_annotation = num_annotation ? num_annotation : 0;
    var left_bound  = {'x_start':0, 'x_end':0, 'y_start':0, 'y_end':0}; // {coord_x_start, coord_x_end, coord_y_start, coord_y_end}
    var upper_bound = {'x_start':0, 'x_end':0, 'y_start':0, 'y_end':0}; // {coord_x_start, coord_x_end, coord_y_start, coord_y_end}
    var right_bound = {'x_start':0, 'x_end':0, 'y_start':0, 'y_end':0}; // {coord_x_start, coord_x_end, coord_y_start, coord_y_end}
    var lower_bound = {'x_start':0, 'x_end':0, 'y_start':0, 'y_end':0}; // {coord_x_start, coord_x_end, coord_y_start, coord_y_end}
    // get positions of each part of the box
    // verticals parts
    left_bound['x_start']   = annotation.x - line_width;
    left_bound['x_end']     = left_bound['x_start'] + 2*line_width;
    left_bound['y_start']   = annotation.y - line_width;
    left_bound['y_end']     = left_bound['y_start'] + annotation.height + 2*line_width;
    right_bound['x_start']  = annotation.x + annotation.width - line_width;
    right_bound['x_end']    = right_bound['x_start'] + 2*line_width;
    right_bound['y_start']  = left_bound['y_start'];
    right_bound['y_end']    = left_bound['y_end'];
    // horizontals ones
    upper_bound['x_start']   = left_bound['x_start'];
    upper_bound['x_end']     = right_bound['x_end'];
    upper_bound['y_start']   = left_bound['y_start'];
    upper_bound['y_end']     = upper_bound['y_start'] + 2*line_width;
    lower_bound['x_start']   = upper_bound['x_start'];
    lower_bound['x_end']     = upper_bound['x_end'];
    lower_bound['y_end']     = left_bound['y_end'];
    lower_bound['y_start']   = lower_bound['y_end'] - 2*line_width;

    var rectangle = [left_bound, right_bound, lower_bound, upper_bound];
    for(var index_bound = 0; index_bound < rectangle.length; index_bound++){
        if((rectangle[index_bound]['x_start'] < mouse_pos.x) && (mouse_pos.x < rectangle[index_bound]['x_end'])){
            if((rectangle[index_bound]['y_start'] < mouse_pos.y) && (mouse_pos.y < rectangle[index_bound]['y_end'])){
                if(ctrlKeyDown){
                    bound_moving['all'] = true;
                    diff_x = mouse_pos.x - annotation.x;
                    diff_y = mouse_pos.y - annotation.y;
                }
                else if(shiftKeyDown){
                    info_box_before_move  = {
                        'x':annotation.x,
                        'y':annotation.y,
                        'height':annotation.height,
                        'width':annotation.width
                    };
                    switch (index_bound) {
                        case 0:
                            bound_moving['left'] = true;
                            break;
                        case 1:
                            bound_moving['right'] = true;
                            break;
                        case 2:
                            bound_moving['lower'] = true;
                            break;
                        case 3:
                            bound_moving['upper'] = true;
                            break;
                    }
                }
                else if(dKeyDown){
                    if(type_annotation === "spatial"){
                        dataset.frames[frameIndex].annotations.splice(num_annotation, 1);
                        showMessage({'type':'success', 'message':'Box deleted'});
                    }
                    else if(type_annotation === "time"){
                        showMessage({'type':'danger', 'message':'If you want to delete this box please press Cancel button'});
                    }
                    refreshImage();
                }
                type_annotation_clicked = type_annotation;
                index_annotation_clicked = num_annotation;
                return true;
            }
        }
    }
    return false;
}

/**
 * get if user has clicked on a line with d key pressed
 */
function clickOnALine(annotation, mouse_pos){
    var a,b;
    var ax, ay, bx, by;
    var line;
    var vertical = false;

    for(var i = 0; i < annotation.coordinates.length-1; i++){
        [ax , ay]= annotation.coordinates[i];
        [bx , by]= annotation.coordinates[i+1];

        //have to find if a point is in a line
        //y = ax + b
        vertical = Math.abs(bx-ax) > line_width ? false : true;
        if(!vertical){
            //a :
            a = (by - ay)/(bx - ax);
            //b :
            b = ay - a*ax;
            //we now will see if we clicked on the line or near it
            for(var j=0; j <= line_width; j++){
                line = a*mouse_pos.x + (b-(line_width/2)+j);
                if(Math.round(mouse_pos.y) == Math.round(line)){
                    if((mouse_pos.x < bx && mouse_pos.x > ax) || (mouse_pos.x > bx && mouse_pos.x < ax)){
                        return true;
                    }
                }
            }
        }
        else { //if line is verticale
            if(ay > by){ //if from bottom to top
                if( mouse_pos.x     < (ax + line_width)
                    && mouse_pos.x  > (ax - line_width)
                    && mouse_pos.y  > by
                    &&  mouse_pos.y < ay){
                    return true;
                }
            }
            else {
                if( mouse_pos.x     < (ax + line_width)
                    && mouse_pos.x  > (ax - line_width)
                    && mouse_pos.y  < by
                    &&  mouse_pos.y > ay){
                    return true;
                }
            }

        }
    }
    return false;
}

/**
 * get mouse position on the canvas
 */
function getMousePos(evt) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

/**
 * get which bound of the box is moving
 */
function getBoundMoving(){
    if(bound_moving['left']){
        return 'left';
    } else if(bound_moving['right']){
        return 'right';
    } else if(bound_moving['upper']){
        return 'upper';
    } else if(bound_moving['lower']){
        return 'lower';
    } else if(bound_moving['all']){
        return 'all';
    }
    return 'none';
}

/**
 *
 */
function stopBoundMoving(){
    if(bound_moving['all']){
        bound_moving['all'] = false;
        showMessage({'type':'success', 'message':'Box moved'});
    } else {
        bound_moving['left'] = false;
        bound_moving['right'] = false;
        bound_moving['upper'] = false;
        bound_moving['lower'] = false;
        showMessage({'type':'success', 'message':'Box resized'});
    }
}

/**
 * get if the index of the current frame is in a time annotation slot
 */
function getTimeAnnotations(){
    var timeAnnotations = [];
    dataset.time_annotations.forEach(function(timeAnnotation){
        if((frameIndex >= timeAnnotation.frameStart) && (frameIndex <= timeAnnotation.frameEnd)){
            timeAnnotations.push(timeAnnotation.label);
        }
    });
    return timeAnnotations;
}

/**
 * stop time a given annotation
 */
function stopTimeAnnotation(aLabelAnnotation){
    for(var i = 0; i < timeAnnotations.length; i++){
        if(timeAnnotations[i].label === aLabelAnnotation){
            timeAnnotations[i].frameEnd = frameIndex;
            if((timeAnnotations[i].frameEnd - timeAnnotations[i].frameStart) > 0){
                pushNewAnnotation(timeAnnotations[i], 'time');
                timeAnnotations.splice(i, 1); // we destroy 1 element at the index i
                showMessage({'type':'success', 'message':'Time annotation '+aLabelAnnotation+' stopped'});
                updateTimeAnnotations();
                refreshImage();
            } else {
                showMessage({'type':'danger', 'message':'Movements have to be at least during 2 frames'});
            }
        }
    }
}

/**
 * update time annotations
 */
function updateTimeAnnotations(){
    if(timeAnnotations != []){
        var html = '';
        html += '<h3>Time annotations running</h3><table class="centered">';

        timeAnnotations.forEach(function(annotation){
            html += '<tr><td>' + annotation.label +
                '</td><td><button name="'+annotation.label+'" type="button" class="btn btn-danger time_annotation" onclick="stopTimeAnnotation(this.name);">stop</button>' +
                '</td></tr>';

        });
        html += '</table>';
        $("#time_annotations_in_progress").html(html);
    }
}

/**
 * add a time annotation
 */
function deleteTimeAnnotation(index){
    dataset.time_annotations.splice(index, 1); // we destroy 1 element at the index i
    showMessage({'type':'success', 'message':'Time annotation deleted'});
    updateTimeAnnotations();
    refreshImage();
}

/**
 * add a time annotation
 */
function addTimeAnnotation(anAnnotation){
    timeAnnotations.push(anAnnotation);
    updateTimeAnnotations();
    showMessage({'type':'success', 'message':'Time annotation '+anAnnotation.label+' started'});
}



/**
 * Push a new annotation
 */
function pushNewAnnotation(anAnnotation, type){
    var annotation;
    switch (type){
        case 'line':
            annotation = {
                'shape'             : 'line',
                'junctions_number'  : anAnnotation.nbJunctions,
                'type'              : anAnnotation.annotationType,
                'label'             : anAnnotation.label,
                'coordinates'       : anAnnotation.coordinates
            };
            dataset.frames[frameIndex].annotations.push(annotation);
            break;
        case 'box':
            annotation = {
                'shape'     : 'rectangle',
                'type'      : anAnnotation.annotationType,
                'label'     : anAnnotation.label,
                'x'         : anAnnotation.coordinates[0],
                'y'         : anAnnotation.coordinates[1],
                'width'     : anAnnotation.coordinates[2],
                'height'    : anAnnotation.coordinates[3]
            };
            dataset.frames[frameIndex].annotations.push(annotation);
            break;
        case 'time':
            annotation = {
                'shape'         : 'rectangle',
                'frameStart'    :   anAnnotation.frameStart,
                'frameEnd'      :   anAnnotation.frameEnd,
                'type'          :   anAnnotation.annotationType,
                'label'         :   anAnnotation.label,
                'region'        :   anAnnotation.region
            };
            dataset.time_annotations.push(annotation);
    }
}

/**
 * save the region of the time annotation box to allow user to modify it if he wants to
 */
function saveTemporarilyRegion(bb){
    if(temp_region == null){
        temp_region = {
            'type'           :   bb.annotationType,
            'label'          :   bb.label,
            'x'              :   bb.coordinates[0],
            'y'              :   bb.coordinates[1],
            'width'          :   bb.coordinates[2],
            'height'         :   bb.coordinates[3]
        };
    }
}

/**
 * draw label along a line
 */
function drawLineLabel(text, p1, p2){
    var dx = p2[0] - p1[0];
    var dy = p2[1] - p1[1];
    var padding = 2;
    var pad = padding / Math.sqrt(dx*dx+dy*dy);

    context.save();
    context.textAlign = 'left';
    context.translate(p1[0] + dx*pad, p1[1] + dy*pad);
    context.rotate(Math.atan2(dy,dx));

    context.beginPath();
    context.fillStyle = 'white';
    context.fillRect(0, 0, context.measureText(text).width, -20);
    context.fillStyle = colorBoundingBox;
    context.stroke();
    context.closePath();

    context.fillStyle = colorLine;
    context.fillText(text, 0, 0);
    context.restore();
}

/**
 * draw a rectangle on the canvas
 */
function drawRectangle(x, y, width, height, label, color){
    if(color == null) color = colorBoundingBox;
    context.beginPath();
    context.rect(
        x,
        y,
        width,
        height);
    context.strokeStyle = color;
    context.stroke();
    context.closePath();

    if(!sKeyDown){
        // draw the background rectangle
        context.beginPath();
        context.fillStyle = 'white';
        context.fillRect(x, y, context.measureText(label).width, -20);
        context.stroke();
        context.closePath();

        //draw the text
        context.beginPath();
        context.fillStyle = color;
        context.fillText(label, x, y - spaceLabel);
        context.stroke();
        context.closePath();
    }
}

/**
 * display all the bounding boxes for current image
 */
function getAndPrintAllBoxesForCurrentImage(){
    context.font = labelFont;
    //draw previous bounding boxes if any
    if (typeof dataset.frames[frameIndex] !== "undefined") {
        // spacial objects
        for(var i = 0; i<  dataset.frames[frameIndex].annotations.length; i++ ){
            annotation = dataset.frames[frameIndex].annotations[i];
            if(annotation.shape === 'rectangle'){
                //rectangles
                drawRectangle(annotation.x, annotation.y, annotation.width, annotation.height, annotation.label);
            }
            else if(annotation.shape === 'line'){
                //draw every line of the annotation
                for(var j = 0; j < annotation.coordinates.length - 1; j++){
                    context.beginPath();
                    context.moveTo(annotation.coordinates[j][0], annotation.coordinates[j][1]);
                    context.lineTo(annotation.coordinates[j+1][0],annotation.coordinates[j+1][1]);
                    context.strokeStyle = colorLine;
                    context.stroke();
                    context.closePath();
                }
                if(!sKeyDown) drawLineLabel(annotation.label, annotation.coordinates[0], annotation.coordinates[1]);
            }
        }
        //lines which are currently drawing
        if(line.nbClicks > 0){
            for(i = 0; i < line.coordinates.length - 1; i++){
                context.beginPath();
                context.moveTo(line.coordinates[i][0], line.coordinates[i][1]);
                context.lineTo(line.coordinates[i+1][0],line.coordinates[i+1][1]);
                context.strokeStyle = colorLine;
                context.stroke();
                context.closePath();
            }
        }
        //end spatial objects

        //now time annotations
        //first time annotations that are already in dataset
        var nTimeObjects = dataset.time_annotations.length;
        var annotation = null;
        for(var j = 0; j< nTimeObjects; j++ ){
            annotation = dataset.time_annotations[j];
            if(annotation.frameStart <= frameIndex && annotation.frameEnd >= frameIndex){
                drawRectangle(annotation.region.x, annotation.region.y, annotation.region.width, annotation.region.height, annotation.label, colorTimeBoundingBox);
            }
        }
        // if we have time annotation in progress
        for(var ta = 0; ta < timeAnnotations.length; ta++ ){
            annotation = timeAnnotations[ta];
            drawRectangle(annotation.region.x, annotation.region.y, annotation.region.width, annotation.region.height, annotation.label, colorTimeBoundingBox);
        }
        // if we have in memory a temporary region
        if(temp_region != null){
            drawRectangle(temp_region.x, temp_region.y, temp_region.width, temp_region.height, temp_region.label, colorTimeBoundingBox);
        }
    }
} //end function getAndPrintAllBoxesForCurrentImage

/**
 * when type of annotation is order, go to next label
 */
function nextAnnotationLabel(){
    var select_size = document.getElementById("select_annotation_label").length - 1;
    if(document.getElementById('select_annotation_label').selectedIndex == select_size){
        document.getElementById('select_annotation_label').selectedIndex = 0;
    } else {
        document.getElementById('select_annotation_label').selectedIndex += 1;
    }
    var event = new Event('change');
    var select_annotation_label = document.getElementById('select_annotation_label');
    select_annotation_label.dispatchEvent(event);
}

/**
 * draw bounding boxes interactively while the user selects a region of interest
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
        refreshImage();
        context.rect(bBox.coordinates[0], bBox.coordinates[1], widthBB, heightBB);
        showMessage('Annotating : ' + spacial_settings[objectSelected].annotations[labelSelected].label);
    }
    // draw full bounding box because user has selected the second point
    else if(bBox.nClicks === 2){
        bBox.coordinates[2] =  x - bBox.coordinates[0];
        bBox.coordinates[3] =  y - bBox.coordinates[1];
        // put the rectangle with positive height and width
        if(bBox.coordinates[2] < 0){
            bBox.coordinates[0] += bBox.coordinates[2];
            bBox.coordinates[2] *= -1;
        }
        if(bBox.coordinates[3] < 0){
            bBox.coordinates[1] += bBox.coordinates[3];
            bBox.coordinates[3] *= -1;
        }

        if(bBox.annotationType === "time_annotation"){
            wait_for_click = false;
            bBox.label = time_settings[timeObjectSelected].annotations[timeLabelSelected].label;
            showMessage({'type':'success', 'message':'Annotation '+ bBox.label + ' created, you can now start time annotation'});
            saveTemporarilyRegion(bBox);
        }
        else {
            bBox.annotationType = spacial_settings[objectSelected].name;

            if(spacial_settings[objectSelected].type === 'unique'){
                bBox.label = spacial_settings[objectSelected].annotations[0].label;
            } else if(spacial_settings[objectSelected].type === 'multiple'){
                bBox.label = spacial_settings[objectSelected].annotations[labelSelected].label;
            } else if(spacial_settings[objectSelected].type === 'order'){
                bBox.label = spacial_settings[objectSelected].annotations[labelSelected].label;
                nextAnnotationLabel();
            }
            // new bounding box
            pushNewAnnotation(bBox, 'box');
            showMessage({'type':'success', 'message':'Annotation '+ bBox.label + ' created'});
        }
        bBox.reset(); // original state: no points have been selected
        refreshImage();
    }
    if(bBox.annotationType === "time_annotation"){
        context.strokeStyle = colorTimeBoundingBox;
    }
    else {
        context.strokeStyle = colorBoundingBox;
    }
    context.stroke();
    context.closePath();
} // end drawBoundingBox

/**
 * draw line on canvas interactively while the user selects a region of interest
 */
function drawLine(x, y){

    if(!setLoaded)
        return;

    context.beginPath();
    getAndPrintAllBoxesForCurrentImage();

    // draw line interactively
    if(line.nbClicks > 0 && line.nbClicks < line.nbJunctions){
        refreshImage();
        [last_junction_x, last_junction_y] = line.getLastCoordinates();
        context.moveTo(last_junction_x, last_junction_y);
        context.lineTo(x,y);
        showMessage('Annotating : ' + line.label);
    } else if(line.nbClicks == line.nbJunctions){
        // new line
        line.annotationType = spacial_settings[objectSelected].name;
        line.label = spacial_settings[objectSelected].annotations[labelSelected].label;
        pushNewAnnotation(line, 'line');
        showMessage({'type':'success', 'message':'Annotation '+ bBox.label + ' created'});
        if(spacial_settings[objectSelected].type === 'order'){
            nextAnnotationLabel();
        }
        line.reset(); // original state: no points have been selected
        refreshImage();
    }

    context.strokeStyle = colorLine;
    context.stroke();
    context.closePath();
} // end drawBoundingBox

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
    // read json file
    $.getJSON(sprintf("./config/config.json?q=$f", Math.random()), function(configData)
    {
        // load spacial and time settings
        configData.forEach(function (setting){
            if(setting.type === 'time'){
                time_settings.push(setting);
            } else {
                spacial_settings.push(setting);
            }
        });

        var event = new Event('change');

        // time annotations
        // if no time annotation
        if(time_settings.length == 0){
            $('#row_time_annotations').hide();
        } else {
            $('#select_time_annotation_type').json2html(time_settings, {'<>':'option','html':'${name}', 'value':'${type}'});
            var select_time_annotation_type = document.getElementById('select_time_annotation_type');
            select_time_annotation_type.dispatchEvent(event);
            $('#row_time_annotations').show();
        }
        // end time annotations

        // spacial annotations
        // if no spacial annotation
        if(spacial_settings.length == 0){
            $('#row_annotation_type').hide();
            $('#row_annotation_label').hide();
        } else {
            $('#select_annotation_type').json2html(spacial_settings, {'<>':'option','html':'${name} (type : ${type})', 'value':'${type}'});
            var select_annotation_type = document.getElementById('select_annotation_type');
            select_annotation_type.dispatchEvent(event);
            $('#row_annotation_type').show();
            $('#row_annotation_label').show();
        }
        // end spacial annotations

        var select = document.getElementById('select');
        select.dispatchEvent(event);
    });
} // end load settings

/**
 * Events move mouse and click on canvas
 */
function addListenerToCanvas(){
    // click over canvas
    canvas.addEventListener('click', function(e){
        if((ctrlKeyDown || shiftKeyDown || dKeyDown) && (getIfCanvasFree() || temp_region)){
            // is there any annotation on the current frame that is on the position of the click
            // spacial annotations
            var one_box_clicked = false;
            var annotation;
            //on a spatial box ?
            for(var num_annotation = 0; num_annotation < dataset.frames[frameIndex].annotations.length; num_annotation++){
                annotation = dataset.frames[frameIndex].annotations[num_annotation];

                if(annotation.shape === 'rectangle') {
                    clickOnABox(annotation, getMousePos(e), "spatial", num_annotation);
                }
                else {
                    one_box_clicked = clickOnALine(annotation, getMousePos(e));
                    if(one_box_clicked && dKeyDown){
                        dataset.frames[frameIndex].annotations.splice(num_annotation, 1);
                        showMessage({'type':'success', 'message':'Box deleted'});
                        refreshImage();
                    }
                }

            }
            // time annotation ?
            if(temp_region != null && !one_box_clicked){
                clickOnABox(temp_region, getMousePos(e), "time");

            }
        }
        else if(getBoundMoving()!='none'){
            stopBoundMoving();
        }
        else if(temp_region != null && temp_region.width != null){ //it means we are waiting for user to click on start time annotation
            showMessage({'type':'danger', 'message':'You have to start time annotation before drawing another box'});
        }
        else if(wait_for_click){
            bBox.click();    // count the number of clicks and add coordinates
            bBox.annotationType = "time_annotation";
            drawBoundingBox(bBox.mx, bBox.my);
        }
        else if(spacial_settings.length > 0){
            var shape = spacial_settings[objectSelected].annotations[labelSelected].shape;

            if(shape === 'rectangle'){
                bBox.click();    // count the number of clicks and add coordinates
                drawBoundingBox(bBox.mx, bBox.my);
            } else if(shape.indexOf('line')>=0){
                // if it's first click, init junctions numbers
                if(line.nbClicks == 0) line.nbJunctions = shape.match(/\d+/)[0];
                line.click();
                drawLine(line.mx, line.my);
            }
        }

    });

    canvas.addEventListener('mousemove', function(e) {
        bBox.mx = getMousePos(e).x;
        bBox.my = getMousePos(e).y;
        line.mx = getMousePos(e).x;
        line.my = getMousePos(e).y;
        if(bBox.nClicks === 1){ //draw a bouding box
            drawBoundingBox(bBox.mx, bBox.my);
        }
        else if(line.nbClicks > 0){ //draw a line
            drawLine(line.mx, line.my)
        }
        else{
            // if we are moving one bound of the box
            if(getBoundMoving() != 'none'){
                var mouse_pos = getMousePos(e);
                var annotation;
                if(type_annotation_clicked === "time"){
                    annotation = temp_region;
                }
                else if(type_annotation_clicked === "spatial"){
                    annotation = dataset.frames[frameIndex].annotations[index_annotation_clicked];
                }
                switch (getBoundMoving()){
                    case 'all':
                    	var x = mouse_pos.x - diff_x;
                    	var y = mouse_pos.y - diff_y;
                    	if(x > 0 
                    		&& y > 0
                    		&& x + annotation.width < canvas.width
                    		&& y + annotation.height < canvas.height){
                    		annotation.x = mouse_pos.x - diff_x;
                        	annotation.y = mouse_pos.y - diff_y;
                        	showMessage('Moving the box');
                    	}
                    	else{
                    		showMessage({'type':'danger','message':'Stay in the canvas'});
                    	}
                        
                        break;
                    case 'left':
                        if(mouse_pos.x < (info_box_before_move['x'] + info_box_before_move['width'] - line_width/2)){
                            annotation.x = mouse_pos.x;
                            annotation.width = info_box_before_move['x'] - mouse_pos.x + info_box_before_move['width'];
                        }
                        showMessage('Resizing left box bound')
                        break;
                    case 'right':
                        if((info_box_before_move['x'] + line_width/2) < mouse_pos.x) {
                            annotation.width = info_box_before_move['width'] + mouse_pos.x - (info_box_before_move['x'] + info_box_before_move['width']);
                        }
                        showMessage('Resizing right box bound')
                        break;
                    case 'upper':
                        if(mouse_pos.y < (info_box_before_move['y'] + info_box_before_move['height'])){
                            annotation.y = mouse_pos.y;
                            annotation.height = info_box_before_move['y'] - mouse_pos.y + info_box_before_move['height'];
                        }

                        showMessage('Resizing upper box bound')
                        break;
                    case 'lower':
                        if(mouse_pos.y > info_box_before_move['y']){
                            annotation.height = info_box_before_move['height'] + mouse_pos.y - (info_box_before_move['y']+info_box_before_move['height']);
                        }
                        showMessage('Resizing lower box bound')
                        break;
                }
                context.drawImage(image, 0, 0, canvas.width, canvas.height); // refresh image
                refreshImage();
            }

        }

    });

} // end addListenerToCanvas

/**
 * to get events that can occur on the web page
 */
function addListenersToDocument(){
    document.addEventListener('keydown', function(event){
        if(!setLoaded)
            return;

        // remember the pressed keys
        if (event.keyCode == key['shift']) shiftKeyDown = true;
        if (event.keyCode == key['h']) hKeyDown = true;
        if (event.keyCode == key['w']) wKeyDown = true;
        if (event.keyCode == key['ctrl']) ctrlKeyDown = true;
        if (event.keyCode == key['d']) dKeyDown = true;
        if (event.keyCode == key['s']) {
            sKeyDown = !sKeyDown;
            refreshImage();
        }
        //right key, next frame
        if (event.keyCode == key['right']) {
            if(!getIfCanvasFree()){
                wait_for_click? showMessage({'type':'danger', 'message':'You have to draw the box for time annotation'}) :  showMessage({'type':'danger', 'message':'You have to finish resizing/moving the box before changing frame'});
            }
            else if (frameIndex < dataset.frames.length - 1) {
                frameIndex++;
                displayImage();
            }

        }
        // previous frame
        else if (event.keyCode == key['left']) {
            if(!getIfCanvasFree()){
                wait_for_click? showMessage({'type':'danger', 'message':'You have to draw the box for time annotation'}) :  showMessage({'type':'danger', 'message':'You have to finish resizing/moving the box before changing frame'});
            }
            else if (frameIndex > 0)
            {
                frameIndex--;
                displayImage();
            }

        }
        // frame -= 50
        else if (event.keyCode == key['pgdn']) {
            if(!getIfCanvasFree()){
                wait_for_click? showMessage({'type':'danger', 'message':'You have to draw the box for time annotation'}) :  showMessage({'type':'danger', 'message':'You have to finish resizing/moving the box before changing frame'});
            }
            else if (frameIndex > 50) {
                frameIndex =  frameIndex - 50;
            } else {
                frameIndex = 0;
            }
            displayImage();
        }
        // frame += 50
        else if (event.keyCode == key['pgup']) {
            if(!getIfCanvasFree()){
                wait_for_click? showMessage({'type':'danger', 'message':'You have to draw the box for time annotation'}) :  showMessage({'type':'danger', 'message':'You have to finish resizing/moving the box before changing frame'});
            }
            else if (frameIndex < dataset.frames.length - 50) {
                frameIndex =  frameIndex + 50;
            } else {
                frameIndex = dataset.frames.length-1;
            }
            displayImage();

        }
        // duplicate previous annotation for this frame
        else if(event.keyCode === key['r']) {
            if (frameIndex > 0)
            {
                frameIndex--;
                for(var num_annotation = 0; num_annotation < dataset.frames[frameIndex].annotations.length; num_annotation++){
                    var annotation = dataset.frames[frameIndex].annotations[num_annotation];
                    bBox.coordinates[0] =  annotation.x;
                    bBox.coordinates[1] =  annotation.y;
                    bBox.coordinates[2] =  annotation.width;
                    bBox.coordinates[3] =  annotation.height;
                    bBox.label          =  annotation.label;
                    bBox.annotationType =  annotation.type;
                    frameIndex++;
                    pushNewAnnotation(bBox, 'box');
                    frameIndex--;
                }
                frameIndex++;
                displayImage();
                showMessage({'type':'success', 'message':'Annotations of previous frame correctly imported'});
            }
        }

        //select next label type 'z' key
        else if (event.keyCode == key['z']) {
            labelSelected++;
            if(labelSelected === spacial_settings[objectSelected].annotations.length)
                labelSelected = 0;
            var select_annotation_label = document.getElementById('select_annotation_label');
            var event = new Event('change');
            select_annotation_label.selectedIndex = labelSelected;
            select_annotation_label.dispatchEvent(event);
            showMessage(spacial_settings[objectSelected].annotations[labelSelected].label + ' selected');
        }
        //select next annotation 'a' key
        else if (event.keyCode == key['a']) {
            objectSelected++;
            if(objectSelected === spacial_settings.length)
                objectSelected = 0;
            var select_annotation_type = document.getElementById('select_annotation_type');
            var event = new Event('change');
            select_annotation_type.selectedIndex = objectSelected;
            select_annotation_type.dispatchEvent(event);
            showMessage(spacial_settings[objectSelected].name + ' selected');
        }
        //select next time annotation 'e' key
        else if (event.keyCode == key['e']) {
            timeLabelSelected++;
            if(timeLabelSelected === time_settings[timeObjectSelected].labels.length)
                timeLabelSelected = 0;
            var select_time_label_type = document.getElementById('select_time_annotation_label');
            var event = new Event('change');
            select_time_label_type.selectedIndex = timeLabelSelected;
            select_time_label_type.dispatchEvent(event);
            showMessage(time_settings[timeObjectSelected].labels[timeLabelSelected] + ' selected');
        }

        // delete last annotation 'u'
        else if (event.keyCode === key['u']) {
            dataset.frames[frameIndex].annotations.pop();
            refreshImage();
            showMessage({'type':'success', 'message':'Last annotation successfully deleted'});
        }
        // remove all annotations for current frame 'c'
        else if (event.keyCode === key['c']) {
            // delete all bounding boxs for current frame
            dataset.frames[frameIndex].annotations = [];
            refreshImage();
            showMessage({'type':'success', 'message':'All annotations were deleted'});
        }

        // stop drawing
        else if(event.keyCode === key['esc']){
            bBox.reset();
            line.reset();
            refreshImage();
        }
    });

    document.addEventListener('keyup', function(event){
        if (event.keyCode == key['h']) hKeyDown = false;
        if (event.keyCode == key['w']) wKeyDown = false;
        if (event.keyCode == key['ctrl']) ctrlKeyDown = false;
        if (event.keyCode == key['shift']) shiftKeyDown = false;
        if (event.keyCode == key['d']) dKeyDown = false;
    });

    $("#start_box_time_annotation").click(function() {
        if(frameIndex == -1){
            showMessage({'type':'danger', 'message':'Select dataset before start time annotation'});
        }
        else if(temp_region != null || wait_for_click) {
            wait_for_click = false;
            var start_btn = document.getElementById("start_box_time_annotation");
            start_btn.innerText="Start drawing";
            start_btn.setAttribute("class","btn btn-primary");
            temp_region = null;
            bBox.reset();
            refreshImage();
        }
        else {
            wait_for_click = true;
            var start_btn = document.getElementById("start_box_time_annotation");
            start_btn.innerText="Cancel";
            start_btn.setAttribute("class","btn btn-danger");
        }

    });

    $("#start_time_annotation").click(function() {
        if(frameIndex == -1){
            showMessage({'type':'danger', 'message':'Select dataset before start time annotation'});
        } else {
            var annotation          = new stateTimeAnnotation();
            annotation.frameStart   = frameIndex;
            annotation.region = temp_region ? temp_region : {} ;

            temp_region = null;
            var type        = document.getElementById("select_time_annotation_type");
            annotation.type = type.options[type.selectedIndex].value;

            var label           = document.getElementById("select_time_annotation_label");
            annotation.label    = label.options[label.selectedIndex].value;

            var start_btn = document.getElementById("start_box_time_annotation");
            start_btn.innerText="Start drawing";
            start_btn.setAttribute("class","btn btn-primary");

            addTimeAnnotation(annotation);
            refreshImage();
        }

    });

    $('#auto_create_box').change(function(){
        if($(this).is(':checked')){
            auto_creation = true;
            $('#span_auto_create_box').attr("class","glyphicon glyphicon-ok");
            $('#label_auto_create_box').attr("class","btn btn-success active");
        }
        else {
            auto_creation = false;
            $('#span_auto_create_box').attr("class","glyphicon glyphicon-remove");
            $('#label_auto_create_box').attr("class","btn btn-danger");
        }
    });

    $(window).bind('mousewheel DOMMouseScroll', function(event){
        if(!getIfCanvasFree()){
            wait_for_click? showMessage({'type':'danger', 'message':'You have to draw the box for time annotation'}) :  showMessage({'type':'danger', 'message':'You have to finish resizing/moving the box before changing frame'});
        }
        else{
            if (event.originalEvent.wheelDelta > 0 || event.originalEvent.detail < 0) {
                if (frameIndex < dataset.frames.length - 1) {
                    frameIndex++;
                    displayImage();
                }
            }
            else {
                if (frameIndex > 0) {
                    frameIndex--;
                    displayImage();
                }
            }
        }

    });
} // end addListenersToDocument

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
 * save JSON object in a file
 */
function save(link, data, filename) {
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
    $("#download").click(function()
    {
        var filename = sprintf('$s.json', "annotations");
        var annotations = [];
        var data    = dataset;
        for(var i = 0; i < dataset.frames.length; i++){
            if(dataset.frames[i].annotations.length > 0){
                annotations.push(dataset.frames[i]);
            }
        }
        data.frames = annotations;
        save($('#download'),data, filename);
    });
} // end addListenerToDownloadData

/**
 * Manage the changes in the drop down list that allow us to
 * select a type of annotation and a label
 */
function addListenerToSelects(){
    $('#select').change( function () {
        var _url = $('#select').val();

        if (_url != "" ){
            frameIndex = 0;
            $.getJSON(sprintf('$s?q=$f',_url, Math.random()), function(data) {
                initializeImgDataset(data);
            });
            $('#canvas').focus();
            $('#canvas').show();
            $('#details').show();
            $('#annotation_type').show();
            $('#annotation_label').show();
            $('#auto_creation').show();
        } else {
            frameIndex = -1;
            context.clearRect(0, 0, canvas.width, canvas.height);
            $('#canvas').hide();
            $('#details').hide();
            $('#annotation_type').hide();
            $('#annotation_label').hide();
            $('#auto_creation').hide();
        }
    });

    //changes in the list of labels for a particular annotation type
    $('#select_annotation_label').change( function (){
        labelSelected = $("#select_annotation_label option:selected").index();
    });

    // changes in the list of annotation types
    $('#select_annotation_type').change( function (){
        objectSelected = $("#select_annotation_type option:selected").index() < 0 ? 0 : $("#select_annotation_type option:selected").index(); //if no option selected we force it
        if(spacial_settings[objectSelected].type != 'unique'){
            $('#select_annotation_label').html(""); //clear drop down list
            $('#select_annotation_label').json2html(spacial_settings[objectSelected].annotations, {'<>':'option','html': '${label} (shape : ${shape})', 'value':'${label}'});
            $('#select_annotation_label').attr('size', spacial_settings[objectSelected].annotations.length);
            document.getElementById('select_annotation_label').selectedIndex = 0;
            $('#annotation_label').show();
        } else {
            labelSelected = 0;
            $('#annotation_label').hide();
        }
    });

    //changes in the list of labels for a particular annotation time type
    $('#select_time_annotation_label').change( function () {
        timeLabelSelected = $("#select_time_annotation_label option:selected").index();
        $('#start_time_annotation').html('Start ' + time_settings[timeObjectSelected].labels[timeLabelSelected] + ' annotation');
    });

    // changes in the list of annotation time types
    $('#select_time_annotation_type').change( function () {
        timeObjectSelected = $("#select_time_annotation_type option:selected").index() < 0 ? 0 : $("#select_time_annotation_type option:selected").index(); //if no option selected we force it
        $('#select_time_annotation_label').html(""); //clear drop down list
        $('#select_time_annotation_label').json2html(time_settings[timeObjectSelected].annotations, {'<>':'option','html': '${label} (shape : ${shape})', 'value':'${label}'});
        $('#select_time_annotations_label').attr('size', time_settings[objectSelected].annotations.length);
        document.getElementById('select_time_annotation_label').selectedIndex = 0;
        $('#start_time_annotation').html('Start ' + time_settings[timeObjectSelected].annotations[0].label + ' annotation');
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
    line  = new stateLine();                        // to track the mouse status to create a bounding box
    setLoaded = false;                              // flag indicating if the image set has been uploaded



    // load datasets names and populate the drop-down list
    loadDatasetsInfo();
    // load config settings
    setSettings();

    // add listeners to different elements
    addListenerToSelects();
    addListenersToDocument();
    addListenerToCanvas();
    addListenerToDownloadData();
    addListenerToUploadData();

    showMessage("Welcome on the Annotation Tool created by Viva Lab !");
}); // end ready function
   