# Convert annotations collected for the interface
import argparse
import glob
import os.path
from pprint import pprint
import json


parser = argparse.ArgumentParser()
parser.add_argument('-i', '--input', metavar='N', type=str, help='input folder path containing all videos')
parser.add_argument('-o', '--output', metavar='N', type=str, help='output folder path which will contain frames')
parser.add_argument('-p', '--python_path', metavar='N', type=str, help='python programs folder path')
parser.add_argument('-s', '--skip', metavar='N', type=int, help='skip frames')
args = parser.parse_args()


directory = glob.glob(args.input)

# take all the name of the folders
for element in directory:
    os.system('python '+args.python_path+'/video2files.py '+args.input+'/'+element+'-f '+args.output+'-s'+args.skip)

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