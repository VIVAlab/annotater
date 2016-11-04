$(document).ready(function(){ // When the DOM is Ready
   var canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    ub   = new UpperBody(ctx, 150*.8, 150, canvas.width, canvas.height);
    img = new Image;
    ctx.strokeStyle = '#fff';


document.addEventListener('keydown', function(event) {
    if(event.keyCode == 37) {
        ub.scaleUp();
        ub.draw(img);
    }
    else if(event.keyCode == 39) {
        ub.scaleDown();
        ub.draw(img);
    }
});


function UpperBody(ctx, width, height, canvasW, canvasH) {
    var self = this;
    
    self.x = 0;
    self.y = 0;
    self.ratio = width / height;
    self.w = width;
    self.h = height;
    self.canvasH = canvasH;
    self.canvasW = canvasW;
    
    this.scaleUp = function() {
        self.h += 1
        self.w = self.ratio * self.h;
    }
    this.scaleDown = function() {
        self.h -= 1
        self.w = self.ratio * self.h;
    }
    
    this.draw = function(image) {
       
        ctx.drawImage(image, 0, 0, self.canvasW, self.canvasH);
        
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
        ty = self.y + (15/100) * self.h;
        by = self.y + (55/100) * self.h;    
        my = self.y + (35/100) * self.h;
        mx = self.x + self.w / 2;    

        //Ellipse
        rY = (16/100) * self.h;
        rX = (20/100) * self.h;
        ctx.moveTo(self.x + self.w, by);
        ctx.ellipse(mx, my, rX, rY , Math.PI / 2, 0, 2 * Math.PI);
        ctx.stroke();
        
        //Dotted lines
        ctx.setLineDash([2]);
        ctx.beginPath()
        //Top and Bottom Line
        ctx.moveTo(self.x, ty);
        ctx.lineTo(self.x + self.w, ty);
        ctx.moveTo(self.x, by);
        ctx.lineTo(self.x + self.w, by);
        //Middle line
        ctx.moveTo(mx, self.y);
        ctx.lineTo(mx, self.y+self.h);
        
        ctx.moveTo(self.x, my);
        ctx.lineTo(self.x + self.w, my);
        ctx.stroke();
        ctx.restore();
    }
}




img.onload = start;
img.src = '/Sharing/ground.truth/All/captures/1/1448560259342001000.jpg';

function start() {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.onmousemove = updateLine;

}

function updateLine(e) 
{
    var r = canvas.getBoundingClientRect(),
        x = e.clientX - r.left,
        y = e.clientY - r.top;
        
    ub.x = x;
    ub.y = y;
    ub.draw(img);
}





});//ready