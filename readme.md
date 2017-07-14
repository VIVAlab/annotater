# Annotater tool
## Introduction
This tool allows to annotate frames (spacial and temporal annotations).


## Customize the software
To customize the tool, please have a look at the help.txt file which explains what can be changed and how. 

## Add a new dataset
If you want to add a new dataset please do this : 
1) Create a new folder in the ./data/ with the name you want
2) Paste in this new all your frames
3) 
    create the data.json file :  
    `python python_files/folder2json.py data/your_new_folder `  
    add your folder to config/datasets :  
    `python python_files/datasetsFromFolders.py `
If the data.json is in the subdirectory of your_new_folder, you have to manually enter the path of your frames in the datasets.json