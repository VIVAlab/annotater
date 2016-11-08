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

parser = argparse.ArgumentParser()
parser.add_argument('folders', metavar='N', type=str, nargs='+', help='folder paths')
parser.add_argument('-e', '--ext', default=".jpg", type=str, help='images file extension')
parser.add_argument('-o', '--output', default="data/dataset.json", type=str, help='output file')
parser.add_argument('-n',  default=1000, type=int, help='chunck size')
args = parser.parse_args()

datasets = []
datasets.append({"name": "Select Dataset" , "value": 0, "url": "", "files":[]})
unique = 1
for k, folder in enumerate(args.folders):
    files = [ basename(f) for f in glob.glob(join(folder, '*%s' % (args.ext)))]
    chunks = [ files[i:i + args.n] for i in range(0, len(files), args.n)]
    for idx, chunk in enumerate(chunks):
        dataset  = {"name": "sub%d: %d" % (k, idx + 1), "value": unique, "url": folder, "files":chunk}
        datasets.append(dataset)
        unique+=1

    
with open(args.output, 'w') as f:
    f.write(json.dumps(datasets, sort_keys=True, indent=4))
    f.close()

