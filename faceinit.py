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
import sys

parser = argparse.ArgumentParser()
parser.add_argument('dataset',  type=str,  help='dataset file')
parser.add_argument('classifier', type=str, help='path to cascade classifier xml file')
parser.add_argument('-o', '--output', default="output.json", type=str, help='output file')

parser.add_argument("-s", "--scale",             help="scale",   default=1.1, type=float)
parser.add_argument("-m", "--minN",              help="min neighbour",   default=5, type=int)
args = parser.parse_args()


def findFaces(cascade, filename, scale, minN):
    img = cv2.imread(filename)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)
    faces = cascade.detectMultiScale(gray, scale, minN)
    annotations = []
    for face in faces:
        (x,y,w,h) = face
        newW = w * 100 / 32
        centerW = x + w/2
        annotation = [int(x), int(y) , int(w), int(h), int(centerW- newW/2), int(centerW + newW/2)]
        annotations.append(annotation)
    return annotations

cascade = cv2.CascadeClassifier(args.classifier)

with open(args.dataset) as f:
    dataset = json.load(f)

canvas = [480, 360]
ratios = { "ratio": 0.8, "tP": 15, "mP": 35, "hP": 55, "eVP": 20,"eHP": 16}

dataset['ratios'] = ratios
first = True
for _i, f in enumerate(dataset['frames']):
    filename = join(dataset['url'], f['file'])
    if first:
        rows, cols, channels = cv2.imread(filename).shape
        dataset['canvas'] = [cols, rows]
        first = False
    faces = findFaces(cascade, filename, args.scale, args.minN)

    sys.stdout.write('.')
    sys.stdout.flush()
    f['locations'] = faces
sys.stdout.write('\r')
sys.stdout.flush()


with open(args.output, 'w') as f:
    js = json.dumps(dataset, indent=4)
    f.write(js)
    f.close()
