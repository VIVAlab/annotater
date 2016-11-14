const State = {
    HEAD:  0,
    LEFT:  1, 
    RIGHT: 2,
    DONE:  3,
    size: function() {
        size = -1;
        for (key in State) {
            if (State.hasOwnProperty(key)) size++;
        }
        return size;
    }
};

var Ratios = {
    ratio: .8,
    tP: 15,
    mP: 35,
    hP: 55,
    eVP: 20,
    eHP: 16
};

var defaultHeight  = 150;
var defaultRatio = .8;
var dataset       = {};
var detections = [[]];
var currentFrame = 0;
var canvas = null;
var ctx = null;
var current = null;
var img = null;

function UpperBody(canvas, height, ratios, lX, rX) {
    var self = this;
    
    self.x = 0;
    self.y = 0;
    self.ratio = ratios.ratio;
    self.w = height * self.ratio;
    self.h = height;
    self.canvasH = canvas.height;
    self.canvasW = canvas.width;
    
    self.state = State.HEAD;
    
    if (lX === undefined)
        self.leftX  = -1;
    else 
        self.leftX = lX;
    
    if (rX == undefined)
        self.rightX = -1;
    else
        self.rightX = rX;
    
    
    self.tP = ratios.tP;
    self.mP = ratios.mP;
    self.hP = ratios.hP;
    
    self.eVP = ratios.eVP;
    self.eHP = ratios.eHP;
    
    this.mouseMove = function(x,y) 
    {
        if (self.state == State.HEAD)
        {
            this.setCenterFace(x,y);
        }
        else if (self.state == State.LEFT)
        {
            this.leftX = x;
        }
        else if (self.state == State.RIGHT)
        {
            this.rightX = x;
        }
    }
    
    this.setCenterFace = function(x,y) {
        self.x = x - self.w/2;
        self.y = y - self.mP/100 * self.h; 
    }
    
    this.setUpperCorner = function(x, y) {
        self.x = x;
        self.y = y;
    }
    
    this.scaleUp = function() {
        self.h += 1
        self.w = self.ratio * self.h;
    }
    this.scaleDown = function() {
        self.h -= 1
        self.w = self.ratio * self.h;
    }
    
    this.stateUp = function() {
        self.state++;
        self.state = self.state % State.size();
        return self.state;
    }
    
    this.stateDown = function() {
        self.state--;
        if (self.state <= State.HEAD)
            self.state = State.HEAD;
        if (self.state == State.RIGHT)
            self.rightX = -1;
        if (self.state <= State.LEFT)
        {
            self.leftX = -1;
            self.rightX = -1;
        }
        return self.state;
    }
    this.pointInsideHeadBBox = function(ptx,pty){
        [x, y , w, h, lx, rx] = self.headBBoxShoulders();
        return ptx >= x && ptx <= (x + w) && pty >= y && pty <= (y + h);
    }
    this.headBBoxShoulders = function() {
        x = self.x + ((50 - self.eHP)/100)* self.w;
        y = self.y + (self.tP/100) * self.h;
        w = (2 * self.eHP)/100 * self.w;
        h = (2 * self.eVP)/100 * self.h;
        return [x,y,w,h, self.leftX, self.rightX];
    }
    
    this.draw = function(image) {
        var ctx = canvas.getContext('2d');
        var leftLabel = 'Left';
        var rightLabel = 'Right';
        ctx.save();
        //Solid lines
        ctx.beginPath()
        //Big box
        
        //Guide Line
        ty = self.y + (self.tP/100) * self.h;
        by = self.y + (self.hP/100) * self.h;    
        my = self.y + (self.mP/100) * self.h;
        mx = self.x + self.w / 2;    

        //Ellipse
        rY = (self.eHP/100) * self.h;
        rX = (self.eVP/100) * self.h;
        ctx.ellipse(mx, my, rX, rY , Math.PI / 2, 0, 2 * Math.PI);
        
        if (self.leftX != -1 && self.rightX != -1)
        {
        ctx.moveTo(self.leftX, self.y);
        ctx.lineTo(self.rightX, self.y);
        ctx.moveTo(self.leftX, self.y + self.h);
        ctx.lineTo(self.rightX, self.y + self.h);
         
        }
        
        
        ctx.fillStyle = 'orange';
        //Draw vertical lines
        if (self.leftX != -1)
        {
            ctx.fillText(leftLabel, self.leftX, self.y );
            ctx.moveTo(self.leftX, self.y);
            ctx.lineTo(self.leftX, self.y + self.h);
        }
        if (self.rightX != -1)
        {
            ctx.fillText(rightLabel, self.rightX , self.y);
            ctx.moveTo(self.rightX, self.y);
            ctx.lineTo(self.rightX, self.y + self.h);
        }
        
        ctx.stroke();
        
        //Dotted lines
        ctx.setLineDash([2]);
        ctx.beginPath()
        //Horizontal Middle Lines
        //Middle line
        ctx.moveTo(mx, self.y);
        ctx.lineTo(mx, self.y+self.h);
        
        ctx.moveTo(self.x, my);
        ctx.lineTo(self.x + self.w, my);
        
        //Shoulder lines 
        
        if (self.state == State.LEFT)
        {
            ctx.fillText(leftLabel, self.leftX, self.y );
            ctx.moveTo(self.leftX, self.y);
            ctx.lineTo(self.leftX, self.y + self.h);
        }
        else if (self.state == State.RIGHT)
        {
            ctx.fillText(rightLabel, self.rightX , self.y);
            ctx.moveTo(self.leftX, self.y);
            ctx.lineTo(self.leftX, self.y + self.h);
            ctx.moveTo(self.rightX, self.y);
            ctx.lineTo(self.rightX, self.y + self.h);
        }
        
        
       
        ctx.stroke();
        ctx.restore();
    }
}

function updateCanvas(canvas, image, dets, current) {
    var ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#ff0';
    if (Array.isArray(dets))
    for (var i = 0; i < dets.length; i++)
    {
        dets[i].draw(image);
    }
    var total = 0;
    for (var i = 0; i < detections.length; i++)
    {
        if (Array.isArray(detections[i]))
        {
            total += detections[i].length;
        }
    }
    ctx.strokeStyle = '#fff';
    current.draw(image);
    
    
    
    $("#details").html(sprintf("Frame: $d / $d <span class='pull-right'>  $d detections</span>",currentFrame, dataset.files.length - 1, total));
}

function save(link, data, filename)
{
		var stringfied = JSON.stringify(data, null, 2);
		console.log("Data encoded");
		var blob = new Blob([stringfied], {type: "application/json"});
		var url  = URL.createObjectURL(blob);
		console.log("Temporary file created");
		link.attr("download", filename);
		link.attr("href", url );
		console.log("Downloading...");
}

function initializeDataset(data) {
    console.log('initialize');
    dataset = data;
    canvas.width = data.canvas[0]
    canvas.height = data.canvas[1]
    img.onload = start;
    detections = new Array(data.files.length);
    currentFrame = 0;
    img.src = dataset.url + dataset.files[currentFrame];
    return true;
}
function initializeDetections(data) {
    Ratios = data.ratios;
    current = new UpperBody(canvas, defaultHeight, Ratios);
    $.each(data.list, function(index, l) {
        if (Array.isArray(l) && l.length > 0)
            detections[index] = [];
        $.each(l, function(idx, head){
            var x  = head[0];
            var y  = head[1];
            var w  = head[2];
            var h  = head[3];
            var lx = head[4];
            var rx = head[5];
           
            var height = (h * 100) / ( 2 * Ratios.eVP);
            var detection = new UpperBody(canvas, height, Ratios, lx , rx)
            detection.setCenterFace(x + w/2 , y + h/2);
            
            
            detections[index].push(detection);
        });
    });
}
function start() 
{
    updateCanvas(canvas, img, detections[currentFrame], current);

}

$(document).ready(function(){ // When the DOM is Ready
    canvas    = document.getElementById('canvas');
    ctx       = canvas.getContext('2d');
    current   = new UpperBody(canvas, defaultHeight, Ratios);
    img       = new Image;
   
    ctx.strokeStyle = '#fff';

    $.getJSON("./data/dataset.json?q=3", function(data) 
    {
        $('#select').json2html(data, {'<>':'option','html':'${name}', 'value':'${value}'});
        $('#select').change( function () {
            var _index = $('#select').val();
            if (_index > 0 )
            {
                dataset = data[_index];
                initializeDataset(dataset);
                if (dataset.detections.list.length > 0)
                    initializeDetections(dataset.detections);
                
                $('#canvas').focus();
            }
        });
        
        canvas.addEventListener('mousemove',function (e) 
        {
            var r = canvas.getBoundingClientRect(),
                x = e.clientX - r.left,
                y = e.clientY - r.top;

             current.mouseMove(x, y);
             updateCanvas(canvas, img, detections[currentFrame], current);
        });
        canvas.addEventListener('click', function(e) 
        {
            current.stateUp();
       
            if ( current.state == State.DONE)
            {
                if (Array.isArray(detections[currentFrame]) && detections[currentFrame].length > 0)
                    detections[currentFrame].push(current);
                else
                    detections[currentFrame] = [current];
                current = new UpperBody(canvas, defaultHeight, Ratios);
            }
    
        });
        
        canvas.addEventListener('mousewheel',function(event){
            
             if (event.deltaY > 0)
             {
                 current.scaleUp();
                 updateCanvas(canvas, img, detections[currentFrame], current);
             }
             if (event.deltaY < 0)
             {
                current.scaleDown();
                updateCanvas(canvas, img, detections[currentFrame], current);
             }
             return false; 
        }, false);
        
        
        canvas.addEventListener('contextmenu', function (e){

         var r = canvas.getBoundingClientRect(),
                x = e.clientX - r.left,
                y = e.clientY - r.top;
          var _idx = -1;
          var _detection = null;
          $.each(detections[currentFrame], function(index, detection){
                var inside = detection.pointInsideHeadBBox(x,y);
                if (inside)
                {
                    _idx = index;
                    _detection = detection;
                }
                
          });
          if (_idx != -1)
          {
            detections[currentFrame].slice(_idx, 1);
            current = _detection;
            current.state = State.HEAD;
          }
          e.preventDefault();
          return(false); 
          
        }, false); 
        document.addEventListener('keydown', function(event) 
        {
            //Up Arrow
            if(event.keyCode == 38) 
            {
                 current.scaleUp();
                 updateCanvas(canvas, img, detections[currentFrame], current);
            }
            //Down Arrow
            else if(event.keyCode == 40) 
            {
                 current.scaleDown();
                 updateCanvas(canvas, img, detections[currentFrame], current);
            }
            //space, next frame
            else if (event.keyCode == 32 || event.keyCode == 39)
            {
                if (currentFrame < dataset.files.length - 1)
                {
                    currentFrame++;
                    img.src = dataset.url + dataset.files[currentFrame];
                    updateCanvas(canvas, img, detections[currentFrame], current);
                }
            }
            // 'u' key, undo
            else if (event.keyCode == 85)
            {
                if (current.state == State.HEAD)
                {
                    if (detections[currentFrame].length > 0)
                    {
                        current = detections[currentFrame].pop();
                    }
                }
                current.stateDown();
            }
            //'p' key , previous frame
            else if (event.keyCode == 80 || event.keyCode == 37)
            {
                if (currentFrame > 0)
                {
                    currentFrame--;
                    img.src = dataset.url + dataset.files[currentFrame];
                    updateCanvas(canvas, img, detections[currentFrame], current);
                }
            }
        
            //'clear' 'c' key
            else if (event.keyCode == 67)
            {
                detections[currentFrame] = [];
                updateCanvas(canvas, img, detections[currentFrame], current);
            }
        });
        
        $("#download").click(function(event)
        {
            var filename = sprintf('$s.json', $('#download_name').val());
            var data     = 
            {
                "name": $("#select option:selected").text(),
                "dataset": $('#select').val(),
                "canvas": [canvas.width, canvas.height],
                "ratios": Ratios,
                "list": Array(detections.length)
            };
            $.each(detections, function(frame, det) {
                
                var annotation = null;
                if (Array.isArray(det) && det.length > 0)
                {
                    annotation = []
                    $.each(det, function(num, d) {
                        annotation.push(d.headBBoxShoulders());
                    });
                }
                data.list[frame] = annotation;
            }); 
		    save($('#download'),data, filename);
		    $('#canvas').focus();
	    });
	    
	    $('#upload').on('change', function(event) {
			var file = event.target.files[0];
			var textType = /json.*/;
			var self = $(this);
			
			
			if (file.type == "" || file.type.match(textType)) 
			{
				var reader = new FileReader();
    
				reader.onload = function(e) 
				{
				    
					var newData = JSON.parse(reader.result);
					initializeDataset(data[newData.dataset]);
					initializeDetections(newData);
					$('#select').val(newData.dataset);
					
					
				}	
				reader.readAsText(file);
			} 
			else 
			{
				alert("File not supported!");	
			}
	});
	    

    });
});//ready