#!/usr/bin/python

# Generates json file to use with the annotate web tool
#
#
# Author: Andres Solis Montero


# 1/23/2007 PATCH NOTES
# - Ability to rotate output frames
#

import argparse
import json
import glob
import os
from os.path import basename
from os.path import join
import cv2
import sys
import numpy as np

parser = argparse.ArgumentParser()
parser.add_argument('video',  type=str,  help='video file')
parser.add_argument('-f', '--folder',  type=str, help='folder output')
parser.add_argument('-w', '--width',  type=int, help='force width keeping aspect ratio')
parser.add_argument('-s', '--skip',  type=int, default=100, help='skip amount of frames')
parser.add_argument('-r', '--rotate', type=int, default=0, help='rotate output frame')
args = parser.parse_args()

if not os.path.exists(args.folder):
    os.makedirs(args.folder)

cap = cv2.VideoCapture(args.video)
number = 0
while(True):
    # Capture frame-by-frame

    ret, frame = cap.read()
    #print 'new frame', ret
    if frame is None:
        break
    
    Orows, Ocols, Ochannels = frame.shape

    if number % args.skip != 0:
        number+=1
        continue
    if args.width:
        frame = cv2.resize(frame, (args.width, args.width * Orows / Ocols))
    
    if args.rotate:
        rows, cols, channels = frame.shape
        M = cv2.getRotationMatrix2D((cols/2,rows/2),args.rotate,1)
        dst = cv2.warpAffine(frame, M, (cols,rows))
        frame = dst

    cv2.imwrite(join(args.folder,'%010d.png' % (number)), frame)
    number+=1

# When everything done, release the capture
cap.release()
cv2.destroyAllWindows()
