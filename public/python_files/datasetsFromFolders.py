# Convert annotations collected for the interface

import glob
import os.path
from pprint import pprint
import json


directories=[]

directory = glob.glob('data/*')

# take all the name of the folders
for element in directory:
    if os.path.isdir(element):
        frames_in_sub_directory = False
        for subelement in glob.glob(element + '/*'):
            folder_name = subelement.replace(element + '/', '')
            try:
                int(folder_name) # if the folder is an int it'll continue the program
                if os.path.isdir(subelement):
                    frames_in_sub_directory = True
                    directories.append(subelement)
            except:
                pass
        if not frames_in_sub_directory:
            directories.append(element)

# put in correct json format
data_converted = [{"name": "Select Dataset", "url": ""}]
for directory in directories:
    data_converted.append({
        "name": directory.replace('data/', ''),
        "url": directory+"/data.json"
    })

# now write
with open('config/datasets.json', 'w') as f:
    f.write(json.dumps(data_converted, sort_keys=True, indent=2, separators=(',', ': ')))