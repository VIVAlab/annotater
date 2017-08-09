# video2files.py
### Description
Convert a video in multiple frames. You can specify width with -w flag. Input can be either a video or folder containing videos. If it's a folder, all videos are going to be converted. 
### Basic command
python video2files.py source\video1.mp4 -f data/captures/video1 -s 1  

# folder2json.py
### Description
Create the "data.json" in a folder. This python script will automatically load every file name in a given folder an store them in JSON file. It require OpenCV because it also get the size of the frames.  
### Basic command
python folder2json.py data\captures\videox\  

# datasetsFromFolders.py
### Description
Take all the directory name in data/captures/ and create for each repository name
its url and name in the config/datasets.json file.  
### Basic command
python datasetsFromFolders.py  

# Other files
Others python files are either not used or used in specific cases. 