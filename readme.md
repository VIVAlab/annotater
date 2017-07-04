# Annotater tool
## Introduction
This tool allows to annotate frames (spacial and temporal annotations).


## Customize the software
#### config.json :
Contains the annotations available from the web page.  
* **group_name :** name of the group of annotations  
* **label :** label of the annotation
* **type :** type of the annotations. You can choose between 3 : order, multiple, unique  
* **shape :** the shape can be either rectangle or line x with x the number of points you want. For example, for an arm : line 3.   
You can type line 3, line3, line-3 or anything else  

#### multilabels.json :
If you need to add multiple labels to one annotation, you can configure this file :  
* **category :** gender / age / ...
* **options :** array containing values available

#### datasets.json :
Contains paths to frames  

## Add a new dataset
If you want to add a new dataset please do this : 
1) Create a new folder in the data folder with the name you want
2) Paste in the folder you've created all your images
3) Run :  
create the data.json file :  
`python python_files/folder2json.py data/your_new_folder `  
add your folder to config/datasets :  
`python python_files/datasetsFromFolders.py `
