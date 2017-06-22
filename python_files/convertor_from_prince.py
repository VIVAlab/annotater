#!/usr/bin/python

# Convert annotations collected for the interface
#
#

from pprint import pprint
import argparse
import json
import re

parser = argparse.ArgumentParser()
parser.add_argument('file', metavar='N', type=str, nargs='+', help='file to convert')
parser.add_argument('-f', '--folder', default="data/captures/test", type=str, help='output folder')
parser.add_argument('-o', '--output', default="data.json", type=str, help='output file')
parser.add_argument('-t', '--type', default="head", type=str, help='annotations type (gestures, persons, faces..)')
parser.add_argument('-l', '--label', default="heads", type=str, help='annotations label')
parser.add_argument('--width', default=640, type=int, help='picture width')
parser.add_argument('--height', default=480, type=int, help='picture height')

args = parser.parse_args()


json_input_data = open(args.file[0]).read()
input_data = json.loads(json_input_data)

#init
frames = []

# load all the annotations for all pictures
for data in enumerate(input_data): # take one picture
    file_annotations = []

# load the annotation position
    for annotation in enumerate(data[1]['rects']):
        file_annotations.append({
            "type": args.type,
            "label": args.label,
            "x": annotation[1]['x1'],
            "y": annotation[1]['y1'],
            "width": annotation[1]['x2'] - annotation[1]['x1'],
            "height": annotation[1]['y2'] - annotation[1]['y1']
        })
    regexp_file_name = "[0-9]+\.[a-zA-Z]{,5}" #get the file name with extensions
    exp = re.compile(regexp_file_name)
    if exp.search(data[1]['image_path']) is not None:
        file_name = exp.search(data[1]['image_path']).group(0)
        frames.append({
            "annotations"   : file_annotations,
            "file"          : file_name
        })


# transorm in the good convention
data_converted = {
    "canvas":[args.width, args.height],
    "frames": frames,
    "name"  : args.folder,
    "time_annotations"  : [],
    "url"  : args.folder + "/"
}
# then write
with open(args.folder + "/" + args.output, 'w') as f:
    f.write(json.dumps(data_converted, sort_keys=True, indent=2, separators=(',', ': ')))