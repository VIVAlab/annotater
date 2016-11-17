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




def extractAnnotationsOfSize(path, locs, width, height):
    a = cv2.imread(path)
    oR, oC, oCn = a.shape
    crops = []
    for x,y, w, h, lx, rx  in locs:
       newH = int(float(h) * 100.0 / 40.0)
       newW = int(newH * .8)
       centerX = int(x + w/2.0)
       centerY = int(y + h/2.0)
       x = int(centerX - newW / 2.0)
       y = int(centerY - .35 * newH)
       
       
       top = 0 if y >= 0 else -y
       bottom = 0 if h + newH <= (oR - 1) else (h + newH - oR - 1)
       left = 0 if x >=0 else -x
       right  = 0 if w + newW <= (oC - 1) else (w + newW - oC - 1)
       
       x = max(0, x)
       y = max(0, y)
       
       xW = min(oC - 1, newW + x)
       yH = min(oR - 1, newH + y)
    
       crop = a[y:yH, x:xW]
       fill = cv2.copyMakeBorder(crop,top, bottom, left, right, cv2.BORDER_REPLICATE)
       resize = cv2.resize(fill, (64,80))
       crops.append(resize)
    return crops



parser = argparse.ArgumentParser()
parser.add_argument('-d', '--dataset', default="data/dataset.json", type=str, help='dataset file')
parser.add_argument('-f', '--folder', default="extract", type=str, help='folder')
parser.add_argument('annotation', type=str, metavar='N', nargs='+',
                    help='annotated files')

args = parser.parse_args()

with open(args.dataset) as f:
    datasets = json.load(f)

if not os.path.exists(args.folder):
    os.makedirs(args.folder)

number = 0

for _json in args.annotation:
    with open(_json) as f:
        annotation = json.load(f)

    dataset = datasets[int(annotation['dataset'])]

    for idx, locations in enumerate(annotation['list']):
        if locations != None:
            filename = dataset['files'][idx]
            path     = join(dataset['url'], filename)
            imgs = extractAnnotationsOfSize(path, locations, 64, 80)
            for img in imgs:
                cv2.imwrite(join(args.folder, '%05d.png' % (number)), img)
                number +=1
