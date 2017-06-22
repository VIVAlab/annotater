#!/usr/bin/python
# Generates json file to use with the annotate web tool
#
#
# Author: Andres Solis Montero

import argparse
import json
import glob
import os
from os.path import basename, join , exists
import cv2
import shutil

parser = argparse.ArgumentParser()
parser.add_argument('-d', '--dataset', default="data/dataset.json", type=str, help='dataset file')
parser.add_argument('-f', '--file', default="file", type=str, help='output file')
parser.add_argument('annotation', type=str, metavar='N', nargs='+',
                    help='annotated files')

args = parser.parse_args()

with open(args.dataset) as f:
    datasets = json.load(f)

number = 0

frames = []
ratios = {'ratio':0.8,"eHP": 16,"hP": 55, "tP": 15, "mP": 35,"eVP": 20}
_data_ = {'name': args.file.upper(), 'url': args.file, 'canvas':[480, 360], 'ratios': ratios, 'frames':frames }


for _json in args.annotation:
    with open(_json) as f:
        annotation = json.load(f)

    dataset = datasets[int(annotation['dataset'])]

    for idx, locations in enumerate(annotation['list']):
        if locations != None:
            filename = dataset['files'][idx]
            path     = join(dataset['url'], filename)
            frames.append({'file':filename, 'locations':locations})

with open("%s.json" % (args.file), 'w') as outfile:
    outfile.write(json.dumps(_data_, sort_keys=True, indent=4, separators=(',', ': ')))


