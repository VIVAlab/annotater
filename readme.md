# Annotater tool
## Introduction
This tool allows to annotate frames. It can annotate spacially but also temporally.

## Configure files 
To configure your files, go in _config/_ folder :  

#### - config.json :
Contains the annotations available from the web page.  
**_name_ :** name of the group of annotations  
**_type_ :** type of the annotations. You can choose between 3 : order, multiple, unique  
**_shape_ :** the shape can be either rectangle or line x with x the number of points you want. For example, for an arm : line 3.   
You can type line 3, line3, line-3 or anything else  
**_label_ :** label of the annotation

#### - datasets.json :
Contains links to the frames  

## Python files
If you want to add a new dataset please do this : 
1) Create a new folder in the data folder with the name you want
2) Paste in the folder you've created all your images
3) Run :  
 `python python_files/folder2json.py data/your_new_folder //create the data.json file`  
 `python python_files/datasetsFromFolders.py //add to config/datasets your folder`
