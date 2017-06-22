#!/usr/bin/python

# Convert annotations collected for the interface
#
#

from pprint import pprint
import argparse
import json

parser = argparse.ArgumentParser()
parser.add_argument('file', metavar='N', type=str, nargs='+', help='file to convert')

args = parser.parse_args()


json_input_data = open(args.file[0]).read()
input_data = json.loads(json_input_data)
# init
frames = []
data_frames = input_data['frames']

# load all the annotations for all pictures
for frame in data_frames:# take one picture
    annotations = frame['annotations']
    for annotation in annotations:
        annotation["shape"] = "rectangle"
        annotation['x'] = int(round(annotation['x'], 0))
        annotation['y'] = int(round(annotation['y'], 0))
        annotation['height'] = int(round(annotation['height'], 0))
        annotation['width'] = int(round(annotation['width'], 0))
    frame['annotations'] = annotations
    frames.append(frame)

input_data['frames'] = frames

# then write
with open(args.file[0], 'w') as f:
    f.write(json.dumps(input_data, sort_keys=True, indent=2, separators=(',', ': ')))