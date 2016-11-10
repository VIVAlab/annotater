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

parser = argparse.ArgumentParser()
parser.add_argument('folders', metavar='N', type=str, nargs='+', help='folder paths')
parser.add_argument('-o', '--output', default="data/dataset.json", type=str, help='output file')
parser.add_argument('-n',  default=1000, type=int, help='chunck size')
args = parser.parse_args()




datasets = []
datasets.append({"name": "Select Dataset" , "value": 0, "url": "", "files":[], "detections":{} })
unique = 1
exts = ['.jpg', '.png']
for k, folder in enumerate(args.folders):
    files = []
    for ext in exts:
        files.extend([basename(f) for f in glob.glob(join(folder, '*%s' % (ext)))])
    
    chunks = [ files[i:i + args.n] for i in range(0, len(files), args.n)]
    total = len(chunks)
    size = [480, 360]
    _first = True
    for idx, chunk in enumerate(chunks):
        name  = "sub%d: %d" % (k, idx + 1)
        if _first:
            img = cv2.imread(join(folder,chunk[0]))
            size = [img.shape[1], img.shape[0]]
            _first = False
        value = unique
        ratios    = {'ratio':0, 'tP':0, 'mP':0, 'hP':0, 'eVP':0, 'eHP':0}
        detection = {'name': name, 'dataset': value, 'canvas':size, 'ratios': ratios, 'list':[]}
        dataset   = {"name": name, "value": value, "url": folder, "files":chunk, "canvas": size, "detections":detection}
        datasets.append(dataset)
        unique+=1

    
with open(args.output, 'w') as f:
    f.write(json.dumps(datasets, sort_keys=True, indent=4))
    f.close()

