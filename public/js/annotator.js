// global variables
//don't change
var canvas, bBox, line, context, setLoaded, opencv;
var image            = null;
var dataset          = {};
var temp_region     = null; // temporary region used for time annotation
var frameIndex       = -1;
var timeAnnotations = []; // contains time annotations that are not yet finished (don't have any frame end)
var timeLabelSelected = 0, timeObjectSelected = 0, labelSelected = 0, objectSelected = 0;
var key              =  {'a': 65,'c':67,'d':68,'e':69,'h':72,'p':80,'u':85,'r':82,'s':83,'z':90,'left':37,'right':39,'esc':27,'pgup':33,'pgdn':34,'ctrl':17,'shift':16};
var spacial_settings = [], time_settings = [], multilabels = [];
var shiftKeyDown = false, ctrlKeyDown = false, dKeyDown = false, sKeyDown = false, hKeyDown = false;
var info_box_before_move = {};
var bound_moving = {'left':false, 'right':false, 'lower':false, 'upper':false, 'all':false};
var index_point_clicked = -1;
var type_annotation_clicked = ""; //For resizing of moving box
var index_annotation_clicked = -1;//For resizing of moving box
var diff_x, diff_y;
var wait_for_click, wait_for_opencv = false;
var auto_creation = false, auto_multilabels = false;



// var changables :
var options = {
    'colorLine'     : "#FF0000",
    'labelFont'     : '18px Arial',
    'spaceLabel'    :  5, //number of pixels between text and bounding box
    'line_width'    : 5,
    'circle_diameter'   : 8,
    'colorHiddenLine'   : "#067a13",
    'auto_creation_torso_height'    : 1.5,
    'auto_creation_torso_width'     : 2,
    'colorBoundingBox'              : "#FF0000",
    'colorTimeBoundingBox'          : "#0000FF"
};

function sendRegionsToServer(){
    //Are we sending annotations to the server ?
    if(opencv.sending){
        //Is the region's group name opencv?
        var annotation = opencv.getCurrentAnnotation();
        if(annotation.group_name == "opencv"){
            //Send the annotation
            var frame_src = dataset.frames[frameIndex].file;
            var next_frame = dataset.frames[frameIndex+1].file;

            socket_send('new frame', {
                url         : dataset.name,
                frame_src   : frame_src,
                next_frame  : next_frame,
                region      : annotation });
        }
    }
}

/**
 * Object contain the state of the interaction between opencv and javascript
 */
function stateOpencv () {
    this.sending = false;
    this.current_region = -1;
    this.annotations = [];

    this.start = function(){
        this.sending = true;
        this.current_region = 0;
    };

    this.end = function(){
        return this.current_region >= this.annotations.length
    };

    this.stop = function(){
        this.sending = false;
        this.current_region = -1;
        this.annotations = [];
    };

    this.nextAnnotation = function(){
        this.current_region++;
        if(this.end()) this.stop();
    };

    this.getCurrentAnnotation = function(){
        return this.annotations[this.current_region];
    }
}
/**
 * object that contains info for mouse
 * interaction to create bounding boxes.
 */
function stateBBox(){
    this.nClicks        = 0;               // number of clicks
    this.coordinates    = {
        'x1'    : 0,
        'y1'    : 0,
        'x2'    : 0,
        'y2'    : 0
    };
    this.mx             = 0;               // mouse coordinates
    this.my             = 0;
    this.label          = 'default';
    this.annotationType = 'default';
    this.click = function (){             // update states according to the number of clicks
        this.nClicks +=1;
        if(this.nClicks === 1){
            this.coordinates['x1'] = this.mx;
            this.coordinates['y1'] = this.my;
        }
        else if(this.nClicks === 2){
            this.coordinates['x2'] = this.mx;
            this.coordinates['y2'] = this.my;
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
    this.click = function (isVisible = true){
        this.nbClicks++;
        if(isVisible) this.coordinates.push({
            'x' : this.mx,
            'y' : this.my,
            'hidden' : false
        });
        else this.coordinates.push([-1,-1]);
    };
    this.getLastCoordinates = function(){
        var index = this.coordinates.length;
        return [this.coordinates[index-1]['x'], this.coordinates[index-1]['y']];
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
    this.group_name = 'default';
    this.label      = 'default';
    this.x = 0;
    this.y = 0;
    this.height = 0;
    this.width = 0;
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
    return (getBoundMoving()==='none' && (index_point_clicked === -1) && !wait_for_click && (bBox.nClicks != 1) && (line.nbClicks==0) && (temp_region==null));
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
                bbox.coordinates['x1'] = (annotation.x + annotation.width/2 - annotation.width*options['auto_creation_torso_width']/2) < 0 ? 0 : annotation.x + annotation.width/2 - annotation.width*options['auto_creation_torso_width']/2;
                bbox.coordinates['y1'] = annotation.y + annotation.height;
                bbox.coordinates['x2'] = (bbox.coordinates['x1'] + annotation.width*options['auto_creation_torso_width']) < canvas.width ? annotation.width*options['auto_creation_torso_width'] : canvas.width - bbox.coordinates['x1'];
                bbox.coordinates['y2'] = (bbox.coordinates['y1'] + annotation.height*options['auto_creation_torso_height']) < canvas.height ? annotation.height*options['auto_creation_torso_height'] : canvas.height - bbox.coordinates['y1'];
                bbox.label = "Torso";
                bbox.annotationType = annotation.type;
                /*drawRectangle(
                    bbox.coordinates[0],
                    bbox.coordinates[1],
                    bbox.coordinates[2],
                    bbox.coordinates[3],
                    bbox.label
                );*/
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
    var line_width = options['line_width'];
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
function clickOnAPointOrLine(annotation, mouse_pos, num_annotation){
   var clicked = false;

    // clicked on a point ?
    for(var i = 0; i < annotation.coordinates.length; i++){
        if(mouse_pos.x < annotation.coordinates[i]['x'] + options['line_width']
            && mouse_pos.x > annotation.coordinates[i]['x'] - options['line_width']
            && mouse_pos.y < annotation.coordinates[i]['y'] + options['line_width']
            && mouse_pos.y > annotation.coordinates[i]['y'] - options['line_width'] ){
            clicked = true;
            if(dKeyDown){
                dataset.frames[frameIndex].annotations.splice(num_annotation, 1);
                showMessage({'type': 'success', 'message': 'Annotation deleted'});
                refreshImage();
            }
            else if(ctrlKeyDown){
                index_annotation_clicked = num_annotation;
                index_point_clicked = i;
            }
            else if(hKeyDown){
                dataset.frames[frameIndex].annotations[num_annotation].coordinates[i]['hidden'] ^= true;
                refreshImage();
            }
        }
    }

    // clicked on a line ?
    if(!clicked){
        var a,b;
        var ax, ay, bx, by;
        var line;
        var vertical = false;
        var line_width = options['line_width'];
        for(var i = 0; i < annotation.coordinates.length-1; i++){
            ax = annotation.coordinates[i]['x'];
            ay = annotation.coordinates[i]['y'];
            bx = annotation.coordinates[i+1]['x'];
            by = annotation.coordinates[i+1]['y'];

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
                            clicked = true;break;
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
                        clicked = true;break;
                    }
                }
                else {
                    if( mouse_pos.x     < (ax + line_width)
                        && mouse_pos.x  > (ax - line_width)
                        && mouse_pos.y  < by
                        &&  mouse_pos.y > ay){
                        clicked = true;
                    }
                }
            }
        }
        if(clicked){
            if(dKeyDown){
                dataset.frames[frameIndex].annotations.splice(num_annotation, 1);
                showMessage({'type': 'success', 'message': 'Box deleted'});
                refreshImage();
            }
        }
    }
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
 * stop a given time annotation
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
    var annotation = {};
    var assign_multilabels = [];
    if(auto_multilabels){
        multilabels.forEach(label => {
            assign_multilabels.push(
            {
                'category'  : label.category,
                'value'     : $('#select_'+label.category).val()
            }
        )
    });
    }
    switch (type){
        case 'line':
            annotation = {
                'shape'             : 'line',
                'junctions_number'  : anAnnotation.nbJunctions,
                'label'             : anAnnotation.label,
                'group_name'        : anAnnotation.group_name,
                'multilabels'       : assign_multilabels,
                'hidden'            : false,
                'coordinates'       : anAnnotation.coordinates
            };

            dataset.frames[frameIndex].annotations.push(annotation);
            break;
        case 'box':
            annotation = {
                'shape'             : 'rectangle',
                'label'             : anAnnotation.label,
                'group_name'        : anAnnotation.group_name,
                'multilabels'       : assign_multilabels,
                'x'                 : anAnnotation.coordinates['x1'],
                'y'                 : anAnnotation.coordinates['y1'],
                'width'             : anAnnotation.coordinates['x2'] - anAnnotation.coordinates['x1'],
                'height'            : anAnnotation.coordinates['y2'] - anAnnotation.coordinates['y1']
            };
            dataset.frames[frameIndex].annotations.push(annotation);
            break;
        case 'time':
            annotation = {
                'shape'         : 'rectangle',
                'frameStart'    :   anAnnotation.frameStart,
                'frameEnd'      :   anAnnotation.frameEnd,
                'type'          :   anAnnotation.annotationType,
                'group_name'    :   anAnnotation.group_name,
                'label'         :   anAnnotation.label,
                'multilabels'   :   assign_multilabels,
                "x"             :   anAnnotation.x,
                "y"             : anAnnotation.y,
                "width"         : anAnnotation.width,
                "height"        : anAnnotation.height,
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
            'group_name'     :   bb.group_name,
            'label'          :   bb.label,
            'x'              :   bb.coordinates[0],
            'y'              :   bb.coordinates[1],
            'width'          :   bb.coordinates[2],
            'height'         :   bb.coordinates[3]
        };
    }
}

/**
 * draw labels on annotations
 */
function drawLabel(p1, label, type, params = {}){
    var x = p1['x'], y = p1['y'];
    if(x > 0 && y > 0){
        if(type === "rectangle"){
            // draw the background rectangle
            context.beginPath();
            context.fillStyle = 'white';
            context.fillRect(x, y - options['spaceLabel']/2, context.measureText(label).width, -20);
            context.stroke();
            context.closePath();

            //draw the text
            context.beginPath();
            context.fillStyle = typeof params.color != 'undefined' ? params.color : options['colorBoundingBox'];
            context.fillText(label, x, y - options['spaceLabel']);
            context.stroke();
            context.closePath();
        }
        else if(type === "point"){
            var space = options['spaceLabel']*3;
            // draw the background rectangle
            context.beginPath();
            context.fillStyle = 'white';
            context.fillRect(x - context.measureText(label).width/2, y - space + 3, context.measureText(label).width, -20);
            context.stroke();
            context.closePath();

            //draw the text
            context.beginPath();
            context.fillStyle =  typeof params.color != 'undefined' ? params.color : options['colorLine'];
            context.fillText(label, x - context.measureText(label).width/2, y - space);
            context.stroke();
            context.closePath();
        }
        else if(type === "line"){
            //draw label along a line
            var dx = params['p2']['x'] - x;
            var dy = params['p2']['y'] - y;
            var padding = 2;
            var pad = padding / Math.sqrt(dx*dx+dy*dy);

            context.save();

            context.textAlign = 'left';
            context.translate(x + dx*pad, y + dy*pad);
            context.rotate(Math.atan2(dy,dx));

            context.fillStyle = 'white';
            context.beginPath();
            context.fillRect(0, 0, context.measureText(label).width, -20);
            context.closePath();
            context.stroke();

            context.fillStyle =  typeof params.color != 'undefined' ? params.color :options['colorLine'];
            context.fillText(label, 0, 0);
            context.restore();
        }
    }
}

/**
 * draw a rectangle on the canvas
 */
function drawRectangle(annotation, color){
    if(color == null) color = options['colorBoundingBox'];
    context.beginPath();
    context.rect(
        annotation.x,
        annotation.y,
        annotation.width,
        annotation.height);
    context.strokeStyle = color;
    context.stroke();
    context.closePath();

    if(!sKeyDown){
        drawLabel(annotation, annotation.label, "rectangle");
    }
}

/**
 * draw points and lines between these points
 */
function drawPoints(annotation){
     //if necessary, draw lines between the points
    for(var j = 0; j < annotation.coordinates.length - 1; j++){
        if(annotation.coordinates[j]['x'] > 0 && annotation.coordinates[j+1]['x'] > 0) {
            context.strokeStyle = options['colorLine'];
            context.fillStyle = options['colorLine'];
            context.beginPath();
            context.moveTo(annotation.coordinates[j]['x'], annotation.coordinates[j]['y']);
            context.lineTo(annotation.coordinates[j + 1]['x'], annotation.coordinates[j + 1]['y']);
            context.stroke();
            context.closePath();
        }
    }

    //then draw the points
    for(var i = 0; i < annotation.coordinates.length; i++){
        coordinate = annotation.coordinates[i];
        if(coordinate['x'] > 0){
            if(coordinate['hidden']){
                context.strokeStyle = options['colorHiddenLine'];
                context.fillStyle = options['colorHiddenLine'];
            }
            else {
                context.strokeStyle = options['colorLine'];
                context.fillStyle = options['colorLine'];
            }
            context.beginPath();
            context.arc(coordinate['x'], coordinate['y'], options['circle_diameter'], 0, Math.PI*2, true);
            context.fill();
            context.closePath();
        }
    }

    if(!sKeyDown) {
        if(annotation.coordinates.length > 1) drawLabel(annotation.coordinates[0], annotation.label, "line", {'color':options['colorLine'], 'p2':annotation.coordinates[1]});
        else drawLabel(annotation.coordinates[0], annotation.label, "point", {'color':options['colorLine']});
    }
}

/**
 * display all the bounding boxes for current image
 */
function getAndPrintAllBoxesForCurrentImage(){
    var rectangles = [];
    context.font = options['labelFont'];
    //draw previous bounding boxes if any
    if (typeof dataset.frames[frameIndex] !== "undefined") {
        // spacial objects
        for(var i = 0; i<  dataset.frames[frameIndex].annotations.length; i++ ){
            annotation = dataset.frames[frameIndex].annotations[i];
            if(annotation.shape === 'rectangle'){
                //rectangles
                drawRectangle(annotation);
                rectangles.push(annotation);
            }
            else if(annotation.shape === 'line'){
                //draw every line of the annotation
                drawPoints(annotation);
            }
        }
        //lines which are currently drawing
        if(line.nbClicks > 0){
            for(i = 0; i < line.coordinates.length - 1; i++){
                if(line.coordinates[i]['x'] > 0 && line.coordinates[i+1]['y'] > 0){
                    context.beginPath();
                    context.moveTo(line.coordinates[i]['x'], line.coordinates[i]['y']);
                    context.lineTo(line.coordinates[i+1]['x'],line.coordinates[i+1]['y']);
                    context.strokeStyle = options['colorLine'];
                    context.stroke();
                    context.closePath();
                }
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
                drawRectangle(annotation, annotation.label, options['colorTimeBoundingBox']);
            }
        }
        // if we have time annotation in progress
        for(var ta = 0; ta < timeAnnotations.length; ta++ ){
            annotation = timeAnnotations[ta];
            drawRectangle(annotation, annotation.label, options['colorTimeBoundingBox']);
        }
        // if we have in memory a temporary region
        if(temp_region != null){
            drawRectangle(temp_region, options['colorTimeBoundingBox']);
        }
        return rectangles;
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
        var widthBB  =  x - bBox.coordinates['x1'];
        var heightBB =  y - bBox.coordinates['y1'];
        refreshImage();
        context.rect(bBox.coordinates['x1'], bBox.coordinates['y1'], widthBB, heightBB);
        showMessage('Annotating ...');
    }
    // draw full bounding box because user has selected the second point
    else if(bBox.nClicks === 2){
        var temp; 
        // put the rectangle with positive height and width
        if(x - bBox.coordinates['x1'] < 0){
            temp = bBox.coordinates['x1'];
            bBox.coordinates['x1'] = bBox.coordinates['x2'];
            bBox.coordinates['x2'] = temp;
        }
        if(y - bBox.coordinates['y2'] < 0){
            temp = bBox.coordinates['y1'];
            bBox.coordinates['y1'] = bBox.coordinates['y2'];
            bBox.coordinates['y2'] = temp;
        }

        if(bBox.annotationType === "time_annotation"){
            wait_for_click = false;
            bBox.label = time_settings[timeObjectSelected].annotations[timeLabelSelected].label;
            bBox.group_name = time_settings[timeObjectSelected].group_name;
            showMessage({'type':'success', 'message':'Annotation '+ bBox.label + ' created, you can now start time annotation'});
            saveTemporarilyRegion(bBox);
        }
        else {
            //bBox.annotationType = spacial_settings[objectSelected].type;
            bBox.group_name = spacial_settings[objectSelected].group_name;

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
        context.strokeStyle = options['colorTimeBoundingBox'];
    }
    else {
        context.strokeStyle = options['colorBoundingBox'];
    }
    context.stroke();
    context.closePath();
} // end drawBoundingBox

/**
 * draw line on canvas
 */
function drawLineBetweenPoints(x, y){

    if(!setLoaded)
        return;

    context.beginPath();
    getAndPrintAllBoxesForCurrentImage();

    // draw line interactively
    if(line.nbClicks > 0 && line.nbClicks < line.nbJunctions){
        refreshImage();
        [last_junction_x, last_junction_y] = line.getLastCoordinates();
        if(last_junction_x > 0 && last_junction_y > 0){
            context.moveTo(last_junction_x, last_junction_y);
            context.lineTo(x,y);
        }
        showMessage('Annotating : ' + line.label + ' - Point number : ' + line.nbClicks);
    } else if(line.nbClicks == line.nbJunctions){
        // new line
        line.annotationType = spacial_settings[objectSelected].name;
        line.label = spacial_settings[objectSelected].annotations[labelSelected].label;
        pushNewAnnotation(line, 'line');
        showMessage({'type':'success', 'message':'Annotation '+ line.label + ' created'});
        if(spacial_settings[objectSelected].type === 'order'){
            nextAnnotationLabel();
        }
        line.reset(); // original state: no points have been selected
        refreshImage();
    }

    context.strokeStyle = options['colorLine'];
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
 * function called by server.js when OpenCV has finished to track a box
 */
function newTrackedBox(new_coord, data){
    bbox = new stateBBox();
    bbox.coordinates['x1'] = new_coord[0][0];
    bbox.coordinates['y1'] = new_coord[0][1];
    bbox.coordinates['x2'] = new_coord[1][0];
    bbox.coordinates['y2'] = new_coord[1][1];
    bbox.group_name = data.region.group_name;
    bbox.label = data.region.label;
    pushNewAnnotation(bbox, 'box');
    refreshImage();
    opencv.nextAnnotation();
    if(opencv.sending) {
        sendRegionsToServer();
    }
}

/**
 * Load settings
 */
function setSettings(){
    // read config json file
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
            $('#select_time_annotation_type').json2html(time_settings, {'<>':'option','html':'${group_name}', 'value':'${type}'});
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
            $('#select_annotation_group_name').json2html(spacial_settings, {'<>':'option','html':'${group_name} (type : ${type})', 'value':'${type}'});
            var select_annotation_group_name = document.getElementById('select_annotation_group_name');
            select_annotation_group_name.dispatchEvent(event);
            $('#row_annotation_type').show();
            $('#row_annotation_label').show();

        }
        // end spacial annotations

        var select = document.getElementById('select');
        select.dispatchEvent(event);
    });
    // read if multilabels are activated
    $.ajax({
        url: "./config/multilabels.json",
        type: "GET",
        statusCode: {
            404: function() {
                $('#div_multilabels').hide();
            }
        },
        success:function(settings) {
            $.getJSON(sprintf("./config/multilabels.json?q=$f", Math.random()), function(data) {

                data.forEach(multilabel => {
                    multilabels.push(multilabel);
                });
                // if yes, create new selects for each category
                if (multilabels.length > 0) {
                    //var html  = '<div class="btn-group" data-toggle="buttons"><label id="label_multilabels" class="btn btn-danger">';
                    //html += '<input  id="multilabels" type="checkbox" autocomplete="off">Multilabels ? :';
                    //html += '<span id="span_multilabels" class="glyphicon glyphicon-remove"></span></label></div>';

                    var html = $('#selects_multilabels').html();
                    multilabels.forEach(multilabel => {
                        multilabel.category = multilabel.category.replace(/\s+/g, '');
                    html += '<h3>' + multilabel.category + '</h3>';
                    html += '<select id="select_' + multilabel.category + '" class="form-control">';
                    // and add each options for this category
                    multilabel.options.forEach(option => {
                        html += '<option value="' + option + '">' + option + '</option>';
                    });
                    html += '</select>';
                });
                    $('#selects_multilabels').html(html);
                }
                else {
                    $('#div_multilabels').hide();
                }
            });
        }
    });
} // end load settings

/**
 * Events move mouse and click on canvas
 */
function addListenerToCanvas(){
    // click over canvas
    canvas.addEventListener('click', function(e){
        if((ctrlKeyDown || shiftKeyDown || dKeyDown || hKeyDown) && (getIfCanvasFree() || temp_region)){

            // is there any annotation on the current frame that is on the position of the click
            var annotation;
            //on a spatial box ?
            for (var num_annotation = 0; num_annotation < dataset.frames[frameIndex].annotations.length; num_annotation++) {
                annotation = dataset.frames[frameIndex].annotations[num_annotation];

                if (annotation.shape === 'rectangle') {
                    clickOnABox(annotation, getMousePos(e), "spatial", num_annotation);
                }
                else {
                    clickOnAPointOrLine(annotation, getMousePos(e), num_annotation);
                }

            }

            // time annotation ?
            if(temp_region != null){
                clickOnABox(temp_region, getMousePos(e), "time");
            }
        }
        else if(getBoundMoving()!='none'){
            stopBoundMoving();
        }
        else if(index_point_clicked > -1){
            index_point_clicked = -1;
        }
        // when time annotation has been drawn, we wait for user to click on the button start time annotation
        else if(temp_region != null && temp_region.width != null){ //it means we are waiting for user to click on start time annotation
            showMessage({'type':'danger', 'message':'You have to start time annotation before drawing another box'});
        }
        // if we are waiting for a time annotation to be drawn
        else if(wait_for_click){
            bBox.click();    // count the number of clicks and add coordinates
            bBox.annotationType = "time_annotation";
            drawBoundingBox(bBox.mx, bBox.my);
        }
        // start drawing line or box
        else if(spacial_settings.length > 0){
            var shape = spacial_settings[objectSelected].annotations[labelSelected].shape;

            if(shape === 'rectangle'){
                bBox.click();    // count the number of clicks and add coordinates
                drawBoundingBox(bBox.mx, bBox.my);
            } else if(shape.indexOf('point')>=0){
                // if it's first click, init junctions numbers
                if(line.nbClicks == 0) line.nbJunctions = shape.match(/\d+/)[0];
                line.click();
                drawLineBetweenPoints(line.mx, line.my);
            }
        }
    });

    canvas.addEventListener('mousemove', function(e) {
        mx = Math.floor(getMousePos(e).x);
        my = Math.floor(getMousePos(e).y);
        bBox.mx = mx;
        bBox.my = my;
        line.mx = mx;
        line.my = my;
        if(bBox.nClicks === 1){ //draw a bouding box
            drawBoundingBox(bBox.mx, bBox.my);
        }
        else if(line.nbClicks > 0){ //draw a line
            drawLineBetweenPoints(line.mx, line.my)
        }
        else{
            // if we are moving one bound of the box
            if(getBoundMoving() != 'none'){
                var annotation;
                if(type_annotation_clicked === "time"){
                    annotation = temp_region;
                }
                else if(type_annotation_clicked === "spatial"){
                    annotation = dataset.frames[frameIndex].annotations[index_annotation_clicked];
                }
                switch (getBoundMoving()){
                    case 'all':
                        var x = mx - diff_x;
                        var y = my - diff_y;
                        if(x > 0
                            && y > 0
                            && x + annotation.width < canvas.width
                            && y + annotation.height < canvas.height){
                            annotation.x = mx - diff_x;
                            annotation.y = my - diff_y;
                            showMessage('Moving the box');
                        }
                        else{
                            showMessage({'type':'danger','message':'Stay in the canvas'});
                        }

                        break;
                    case 'left':
                        if(mx < (info_box_before_move['x'] + info_box_before_move['width'] - options['line_width']/2)){
                            annotation.x = mx;
                            annotation.width = info_box_before_move['x'] - mx + info_box_before_move['width'];
                        }
                        showMessage('Resizing left box bound');
                        break;
                    case 'right':
                        if((info_box_before_move['x'] + options['line_width']/2) < mx) {
                            annotation.width = info_box_before_move['width'] + mx - (info_box_before_move['x'] + info_box_before_move['width']);
                        }
                        showMessage('Resizing right box bound');
                        break;
                    case 'upper':
                        if(my < (info_box_before_move['y'] + info_box_before_move['height'])){
                            annotation.y = my;
                            annotation.height = info_box_before_move['y'] - my + info_box_before_move['height'];
                        }

                        showMessage('Resizing upper box bound');
                        break;
                    case 'lower':
                        if(my > info_box_before_move['y']){
                            annotation.height = info_box_before_move['height'] + my - (info_box_before_move['y']+info_box_before_move['height']);
                        }
                        showMessage('Resizing lower box bound');
                        break;
                }
                refreshImage();
            }
            else if(index_point_clicked > -1){
                annotation = dataset.frames[frameIndex].annotations[index_annotation_clicked].coordinates[index_point_clicked];
                annotation[0] = mx;
                annotation[1] = my;
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
        if (event.keyCode == key['ctrl']) ctrlKeyDown = true;
        if (event.keyCode == key['d']) dKeyDown = true;
        if (event.keyCode == key['s']) {
            sKeyDown = !sKeyDown;
            refreshImage();
        }

        switch(event.keyCode){
            case key['right']:         //right key, next frame
                if(!getIfCanvasFree()){
                    wait_for_click? showMessage({'type':'danger', 'message':'You have to draw the box for time annotation'}) :  showMessage({'type':'danger', 'message':'You have to finish resizing/moving the box before changing frame'});
                }
                else if (frameIndex < dataset.frames.length - 1) {
                    getAndPrintAllBoxesForCurrentImage().forEach(function(annotation){
                        if(annotation.group_name == "opencv"){
                            opencv.annotations.push(annotation);
                        }
                    });
                    opencv.start();
                    showMessage("Tracking annotations, please wait ...");
                    sendRegionsToServer();
                    frameIndex++;
                    displayImage();
                }
                break;

            case key['left']:         // previous frame
                if(!getIfCanvasFree()){
                    wait_for_click? showMessage({'type':'danger', 'message':'You have to draw the box for time annotation'}) :  showMessage({'type':'danger', 'message':'You have to finish resizing/moving the box before changing frame'});
                }
                else if (frameIndex > 0)
                {
                    frameIndex--;
                    displayImage();
                }
                break;

            case key['pgdn']:         // frame -= 50
                if(!getIfCanvasFree()){
                    wait_for_click? showMessage({'type':'danger', 'message':'You have to draw the box for time annotation'}) :  showMessage({'type':'danger', 'message':'You have to finish resizing/moving the box before changing frame'});
                }
                else if (frameIndex > 50) {
                    frameIndex =  frameIndex - 50;
                } else {
                    frameIndex = 0;
                }
                displayImage();
                break;

            case key['pgup']:         // frame += 50
                if(!getIfCanvasFree()){
                    wait_for_click? showMessage({'type':'danger', 'message':'You have to draw the box for time annotation'}) :  showMessage({'type':'danger', 'message':'You have to finish resizing/moving the box before changing frame'});
                }
                else if (frameIndex < dataset.frames.length - 50) {
                    frameIndex =  frameIndex + 50;
                } else {
                    frameIndex = dataset.frames.length-1;
                }
                displayImage();
                break;

            case key['r']:         // duplicate previous annotation for this frame
                if (frameIndex > 0)
                {
                    frameIndex--;
                    for(var num_annotation = 0; num_annotation < dataset.frames[frameIndex].annotations.length; num_annotation++){
                        var annotation = dataset.frames[frameIndex].annotations[num_annotation];
                        bBox.coordinates['x1'] =  annotation.x;
                        bBox.coordinates['y1'] =  annotation.y;
                        bBox.coordinates['x2'] =  annotation.x + annotation.width;
                        bBox.coordinates['y2'] =  annotation.y + annotation.height;
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
                break;

            case key['z']:         //select next label type 'z' key
                labelSelected++;
                if(labelSelected === spacial_settings[objectSelected].annotations.length)
                    labelSelected = 0;
                var select_annotation_label = document.getElementById('select_annotation_label');
                var event = new Event('change');
                select_annotation_label.selectedIndex = labelSelected;
                select_annotation_label.dispatchEvent(event);
                showMessage(spacial_settings[objectSelected].annotations[labelSelected].label + ' selected');
                break;

            case key['a']:        //select next annotation 'a' key
                objectSelected++;
                if(objectSelected === spacial_settings.length)
                    objectSelected = 0;
                var select_annotation_group_name = document.getElementById('select_annotation_group_name');
                var event = new Event('change');
                select_annotation_group_name.selectedIndex = objectSelected;
                select_annotation_group_name.dispatchEvent(event);
                showMessage(spacial_settings[objectSelected].name + ' selected');
                break;

            case key['e']:        //select next time annotation 'e' key
                imeLabelSelected++;
                if(timeLabelSelected === time_settings[timeObjectSelected].labels.length)
                    timeLabelSelected = 0;
                var select_time_label_type = document.getElementById('select_time_annotation_label');
                var event = new Event('change');
                select_time_label_type.selectedIndex = timeLabelSelected;
                select_time_label_type.dispatchEvent(event);
                showMessage(time_settings[timeObjectSelected].labels[timeLabelSelected] + ' selected');
                break;

            case key['u']:        // delete last annotation 'u'
                dataset.frames[frameIndex].annotations.pop();
                refreshImage();
                showMessage({'type':'success', 'message':'Last annotation successfully deleted'});
                break;

            case key['c']:        // remove all annotations for current frame 'c'
                // delete all bounding boxs for current frame
                dataset.frames[frameIndex].annotations = [];
                refreshImage();
                showMessage({'type':'success', 'message':'All annotations were deleted'});
                break;

            case key['esc']:        // stop drawing
                bBox.reset();
                line.reset();
                refreshImage();
                showMessage({'type':'danger', 'message':'Annotation canceled'});
                break;

            case key['p']:      // when drawing lines, it can happens that some points are not on the image, press p to skip them
                var shape = spacial_settings[objectSelected].annotations[labelSelected].shape;
                if(shape.indexOf('point')>=0){
                    if(line.nbClicks == 0) line.nbJunctions = shape.match(/\d+/)[0];
                    line.click(false);
                }
        }
    });

    document.addEventListener('keyup', function(event){
        if (event.keyCode == key['h']) hKeyDown = false;
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

            if(temp_region){
                annotation.x = temp_region.x;
                annotation.y = temp_region.y;
                annotation.label        = temp_region.label;
                annotation.group_name   = temp_region.group_name;
                annotation.width        = temp_region.width;
                annotation.height       = temp_region.height;
                temp_region = null;
            }

            var start_btn = document.getElementById("start_box_time_annotation");
            start_btn.innerText="Start drawing";
            start_btn.setAttribute("class","btn btn-primary");

            addTimeAnnotation(annotation);
            refreshImage();
        }

    });

    $('#checkbox_auto_create_box').change(function(){
        if($(this).is(':checked')){
            auto_creation = true;
            $('#span_auto_create_box').attr("class", "glyphicon glyphicon-ok");
            $('#label_auto_create_box').attr("class", "btn btn-success active");
        }
        else {
            auto_creation = false;
            $('#span_auto_create_box').attr("class", "glyphicon glyphicon-remove");
            $('#label_auto_create_box').attr("class", "btn btn-danger");
        }
    });

    $('#checkbox_multilabels').change(function(){
        if($(this).is(':checked')){
            auto_multilabels = true;
            $('#span_multilabels').attr("class", "glyphicon glyphicon-ok");
            $('#label_multilabels').attr("class", "btn btn-success active");
        }
        else {
            auto_multilabels = false;
            $('#span_multilabels').attr("class", "glyphicon glyphicon-remove");
            $('#label_multilabels').attr("class", "btn btn-danger");
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
        var _url = $('#select').val();

        if (_url != "" ) {
            var file = event.target.files[0];
            var textType = /json.*/;
            var self = $(this);

            if (file.type == "" || file.type.match(textType)) {
                var reader = new FileReader();
                reader.onload = function (e) {
                    // annotations is the JSON file containing all the info about the dataset
                    var uploaded_data = JSON.parse(reader.result);

                    dataset.frames.forEach(function (frame) {
                        frame.annotations = [];
                        uploaded_data.frames.forEach(function (uploaded_frame) {
                            if (frame.file === uploaded_frame.file) {
                                frame.annotations = uploaded_frame.annotations;
                            }
                        });
                    });
                    dataset.time_annotations = [];
                    uploaded_data.time_annotations.forEach(function (time_annotation) {
                        dataset.time_annotations.push(time_annotation);
                    });
                    refreshImage();
                    showMessage({'type': 'success', 'message': 'Annotations uploaded'});
                    $('#canvas').focus();
                };
                reader.readAsText(file);
            }
            else showMessage({'type': 'danger', 'message': 'File not supported'});
        }
        else showMessage({'type': 'danger', 'message': 'Select a dataset before upload annotations'});
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

        if (_url != null && _url != "" ){
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
            $('#div_auto_create_box').show();

        } else {
            frameIndex = -1;
            context.clearRect(0, 0, canvas.width, canvas.height);
            $('#canvas').hide();
            $('#details').hide();
            $('#annotation_type').hide();
            $('#annotation_label').hide();
            $('#auto_creation').hide();
            $('#div_auto_create_box').hide();
        }
    });

    //changes in the list of labels for a particular annotation type
    $('#select_annotation_label').change( function (){
        labelSelected = $("#select_annotation_label option:selected").index();
    });

    // changes in the list of annotation types
    $('#select_annotation_group_name').change( function (){
        objectSelected = $("#select_annotation_group_name option:selected").index() < 0 ? 0 : $("#select_annotation_group_name option:selected").index(); //if no option selected we force it
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
        $('#start_time_annotation').html('Start ' + time_settings[timeObjectSelected].annotations[timeLabelSelected].label + ' annotation');
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
    line  = new stateLine();                        // to track the mouse status to create multiple points
    opencv = new stateOpencv();
    setLoaded = false;                              // flag indicating if the image set has been uploaded

    //init socker with server
    socket_init(); 

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
   