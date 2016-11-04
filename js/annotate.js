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

function UpperBody(canvas, width, height) {
    var self = this;
    
   
    
    self.x = 0;
    self.y = 0;
    self.ratio = width / height;
    self.w = width;
    self.h = height;
    self.canvasH = canvas.height;
    self.canvasW = canvas.width;
    
    self.state = State.HEAD;

    self.leftX  = self.x - 10;
    self.rightX = self.x + self.w + 10;
    
    
    self.tP = 15
    self.mP = 35
    self.hP = 55
    
    self.eVP = 20
    self.eHP = 16
    
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
        self.state = self.state % State.size;
        return self.state;
    }
    
    this.stateDown = function() {
        self.state--;
        if (self.state <= 0)
            self.state = 0;
        return self.state;
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
        ctx.moveTo(self.x - 10, self.y);
        ctx.lineTo(self.x - 10, self.y + self.h);
        
        ctx.moveTo(self.x + self.w + 10, self.y);
        ctx.lineTo(self.x + self.w + 10, self.y + self.h);
        
        ctx.stroke();
        ctx.restore();
    }
}

function updateCanvas(canvas, image, detections, current) {
    var ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#00f';
    for (var i = 0; i < detections.length; i++)
    {
        detections[i].draw(image);
    }
    ctx.strokeStyle = '#fff';
    current.draw(image);
}



$(document).ready(function(){ // When the DOM is Ready
    var canvas = document.getElementById('canvas');
    var ctx = canvas.getContext('2d');
    var current   = new UpperBody(canvas, 150*.8, 150);
    var img  = new Image;
    var detections = [];
    
    ctx.strokeStyle = '#fff';

    img.onload = start;
    img.src = '/Sharing/ground.truth/All/captures/1/1448560259342001000.jpg';

function start() {
    updateCanvas(canvas, img, detections, current);
    
    
    canvas.addEventListener('mousemove',function (e) 
    {
        var r = canvas.getBoundingClientRect(),
            x = e.clientX - r.left,
            y = e.clientY - r.top;
    
        current.setUpperCorner(x, y);
         updateCanvas(canvas, img, detections, current);
    });
    canvas.addEventListener('click', function(e) 
    {
        current.stateUp();

        if ( current.state == State.DONE)
        {
            detections.push(current);
            current = new UpperBody(canvas, 150*.8, 150); 
        }
        
    });

    document.addEventListener('keydown', function(event) 
    {
        if(event.keyCode == 38) 
        {
            current.scaleUp();
             updateCanvas(canvas, img, detections, current);
        }
        else if(event.keyCode == 40) 
        {
            current.scaleDown();
             updateCanvas(canvas, img, detections, current);
        }
        else if (event.keyCode == 85)
        {
            current.stateDown();
            console.log(ub.state);
        }
    });
}







});//ready