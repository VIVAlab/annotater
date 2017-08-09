# config.json
### Description
Configure the annotations you will have on the interface

### Params
group_name = name of the group of annotation (ex: "group_name" : "hands")  
type = type of annotation possible : multiple, order, unique, time (ex: "type" : "multiple")  
annotations = name of annotations allowed (ex : "annotations" : ["left hand", "right hand"])

### Example of config.json file
[  
  {  
    "group_name" : "Various",  
    "type" : "multiple",  
    "annotations" :  
    [  
      {  
        "shape": "1 point",  
        "label" : "Shoulders"  
      },  
      {  
        "shape": "3 points",  
        "label" : "Left Arm"  
      }  
    ]  
  },  
  {  
    "group_name" : "Persons",  
    "type" : "order",  
    "annotations" :  
    [  
      {  
        "shape": "rectangle",  
        "label" : "Head"  
      },  
      {  
        "shape": "rectangle",  
        "label" : "Torso"  
      },  
      {  
        "shape": "3 points",  
        "label" : "Right arm"  
      },  
      {  
        "shape": "3 points",  
        "label" : "Left Arm"  
      }  
    ]  
  }  
]

# datasets.json
### Description
Load the path of the frames and display a name in the interface.

### Basic format:
[  
	{"name": "Select Dataset", "url": ""}, //DO NOT DELETE THIS LINE  
	//Your customs folder path  
	{"name": "videox", "url": "./data/videox/data.json"},  
	{"name": "videoy", "url": "./data/videoy/data.json"}  
]

# multilabels.json
### Description
Allow users to add others informations to one annotation. For instance, if you annotate persons and you want to add other informations like his gender, age.. Please follow the example bellow

### Example of multilabels.json file
[   
  {  
    "category" : "gender",  
    "options" : [  
      "man",  
      "woman"  
    ]  
  },  
  {  
    "category" : "age",  
    "options" : [  
      "-20",  
      "20-40",  
      "40-60",  
      "+60"  
    ]  
  }  
]