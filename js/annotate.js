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

const Ratios = {
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

function UpperBody(canvas, width, height, ratios) {
    var self = this;
    
    self.x = 0;
    self.y = 0;
    self.ratio = width / height;
    self.w = width;
    self.h = height;
    self.canvasH = canvas.height;
    self.canvasW = canvas.width;
    
    self.state = State.HEAD;
    

    self.leftX  = -1;
    self.rightX = -1;
    
    
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
        console.log(self.h);
        self.h -= 1
        self.w = self.ratio * self.h;
        console.log(self.h);
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
    
    this.headBBoxShoulders = function() {
        x = self.x + ((50 - self.eHP)/100)* self.w;
        y = self.y + (self.tP/100) * self.h;
        w = (2 * self.eHP)/100 * self.w;
        h = (2 * self.eVP)/100 * self.h;
        return [x,y,w,h, self.leftX, self.rightX];
    }
    
    this.draw = function(image) {
        var ctx = canvas.getContext('2d');
        
        ctx.save();
        //Solid lines
        ctx.beginPath()
        //Big box
        ctx.moveTo(self.x,  self.y);
        ctx.lineTo(self.x + self.w , self.y);
        ctx.lineTo(self.x + self.w , self.y + self.h );
        ctx.lineTo(self.x,  self.y + self.h );
        ctx.lineTo(self.x,  self.y);
        //Guide Line
        ty = self.y + (self.tP/100) * self.h;
        by = self.y + (self.hP/100) * self.h;    
        my = self.y + (self.mP/100) * self.h;
        mx = self.x + self.w / 2;    

        //Ellipse
        rY = (self.eHP/100) * self.h;
        rX = (self.eVP/100) * self.h;
        ctx.moveTo(self.x + self.w, by);
        ctx.ellipse(mx, my, rX, rY , Math.PI / 2, 0, 2 * Math.PI);
        
        ctx.fillStyle = 'orange';
        //Draw vertical lines
        if (self.leftX != -1)
        {
            ctx.fillText('L', self.leftX, self.y );
            ctx.moveTo(self.leftX, self.y);
            ctx.lineTo(self.leftX, self.y + self.h);
        }
        if (self.rightX != -1)
        {
            ctx.fillText('R', self.rightX , self.y);
            ctx.moveTo(self.rightX, self.y);
            ctx.lineTo(self.rightX, self.y + self.h);
        }
        
        ctx.stroke();
        
        //Dotted lines
        ctx.setLineDash([2]);
        ctx.beginPath()
        //Horizontal Middle Lines
        ctx.moveTo(self.x, ty);
        ctx.lineTo(self.x + self.w, ty);
        ctx.moveTo(self.x, by);
        ctx.lineTo(self.x + self.w, by);
        //Middle line
        ctx.moveTo(mx, self.y);
        ctx.lineTo(mx, self.y+self.h);
        
        ctx.moveTo(self.x, my);
        ctx.lineTo(self.x + self.w, my);
        
        //Shoulder lines 
        
        if (self.state == State.LEFT)
        {
            ctx.fillText('L', self.leftX, self.y );
            ctx.moveTo(self.leftX, self.y);
            ctx.lineTo(self.leftX, self.y + self.h);
        }
        else if (self.state == State.RIGHT)
        {
            ctx.fillText('R', self.rightX , self.y);
            ctx.moveTo(self.leftX, self.y);
            ctx.lineTo(self.leftX, self.y + self.h);
            ctx.moveTo(self.rightX, self.y);
            ctx.lineTo(self.rightX, self.y + self.h);
        }
       
        ctx.stroke();
        ctx.restore();
    }
}

function updateCanvas(canvas, image, detections, current) {
    var ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#ff0';
    if (Array.isArray(detections))
    for (var i = 0; i < detections.length; i++)
    {
        detections[i].draw(image);
    }
    ctx.strokeStyle = '#fff';
    current.draw(image);
    
    $("#details").html(sprintf("Frame: $d / $d ",currentFrame, dataset.files.length - 1));
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

$(document).ready(function(){ // When the DOM is Ready
    var canvas = document.getElementById('canvas');
    var ctx = canvas.getContext('2d');
    var current   = new UpperBody(canvas, defaultHeight * defaultRatio, defaultHeight, Ratios);
    var img       = new Image;
   
    ctx.strokeStyle = '#fff';

    $.getJSON("data/datasets.json", function(data) 
    {
        $('#select').json2html(data, {'<>':'option','html':'${name}', 'value':'${value}'});
        $('#select').change( function () {
            $.getJSON($('#select').val(), function(data) {
                dataset = data;
                img.onload = start;
                detections = new Array(data.files.length);
                img.src = dataset.url + dataset.files[currentFrame];
                return true;
             });
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
                current = new UpperBody(canvas, defaultHeight * defaultRatio, defaultHeight, Ratios);
            }
    
        });
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
        function start() 
        {
            updateCanvas(canvas, img, detections[currentFrame], current);
    
        }
        $("#download").click(function(event)
        {
            var filename = sprintf('%s.json', $('#download_name').val());
            var data     = 
            {
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
					
				}	
			} 
			else 
			{
				alert("File not supported!");	
			}
	});
	    

    });
});//ready