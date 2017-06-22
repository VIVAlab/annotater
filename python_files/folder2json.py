#!/usr/bin/python

# Generates json file to use with the annotate web tool
#
#
# Author: Andres Solis Montero

import argparse
import json
import glob
from os.path import basename
from os.path import join
import cv2
from random import shuffle

parser = argparse.ArgumentParser()
parser.add_argument('folders', metavar='N', type=str, nargs='+', help='folder paths')
parser.add_argument('-o', '--output', default="data.json", type=str, help='output file')
parser.add_argument('-m', '--merge', type=str, help="json with annotations too keep")
parser.add_argument('-u', '--update', action='store_true', help="update current data.json in folder")
args = parser.parse_args()

if args.update and len(args.folders) == 1:
    args.merge = join(args.folders[0], 'data.json')

if args.merge:
    with open(args.merge) as f:
        merge = json.load(f)
        merge_dict = {frame['file']: frame['annotations'] for frame in merge['frames']}
        f.close()

exts = ['.jpg', '.png']
for k, folder in enumerate(args.folders):
    #ratios  = {  "eHP": 16, "eVP": 20, "hP": 55,  "mP": 35, "ratio": 0.8, "tP": 15 }
    #dataset = {'canvas': [], 'frames':[], 'ratios': ratios, 'url': '', 'name':''}

    # structure of the JSON file wich is the input for the annotation tool
    dataset = {'canvas': [], 'frames' : [], 'time_annotations' : [], 'url' : '', 'name' : ''}
    dataset['name'] = folder
    dataset['url']  = folder + '/'
    files = []
    for ext in exts:
        files.extend([basename(f) for f in glob.glob(join(folder, '*%s' % (ext)))])
    
    if len(files) > 0:
        rows, cols, channels =  cv2.imread(join(folder, files[0])).shape
        dataset['canvas'] = [cols, rows]
    
    annotations = []
    for file in files:
        if args.merge and file in merge_dict:
            annotations = merge_dict[file]
        
        dataset['frames'].append({'file':file, 'annotations':annotations})
    
    #shuffle(dataset['frames'])
    
    with open(join(folder, args.output), 'w') as f:
        f.write(json.dumps(dataset, sort_keys=True, indent=4, separators=(',', ': ')))
