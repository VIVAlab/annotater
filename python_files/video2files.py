#!/usr/bin/python
import argparse
import json
import glob
import os
from os.path import basename
from os.path import join
import cv2
import sys
import numpy as np
from pprint import pprint


parser = argparse.ArgumentParser()
parser.add_argument('input',  type=str,  help='folder or video file')
parser.add_argument('-f', '--folder',  type=str, help='folder output')
parser.add_argument('-w', '--width',  type=int, help='force width keeping aspect ratio')
parser.add_argument('-s', '--skip',  type=int, default=100, help='skip amount of frames')
parser.add_argument('-n', '--frame_number',  type=int, help='number of frames in each video')

args = parser.parse_args()


count = 0

def capture_video(input):
    global count
    cap = cv2.VideoCapture(input)

    while(True):
        # Capture frame-by-frame
        ret, frame = cap.read()
        # frame = cv2.flip(frame, -1) # if you want to flip from 180 the input video
        if frame is None:
            break

        Orows, Ocols, Ochannels = frame.shape

        if count % args.skip != 0:
            count += 1
            continue
        if args.width:
            frame = cv2.resize(frame, (args.width, args.width * Orows / Ocols))

        cv2.imwrite(join(args.folder, '%010d.jpg' % (count)), frame)
        count += 1

    # When everything done, release the capture
    cap.release()
    cv2.destroyAllWindows()



if not os.path.exists(args.folder):
    print 'Creating folder "' + args.folder + '"'
    os.makedirs(args.folder)

if len(glob.glob(args.input)) > 0:
    if os.path.isdir(glob.glob(args.input)[0]):
        print "Input is a folder"
        # take each video of the input folder
        elements = []
        for element in glob.glob(args.input+'/*'):
            elements.append(element)

        elements.sort()
        print "Converting, please wait the end"
        for video in elements:
            capture_video(video)
    elif os.path.exists(args.input):
        print "Input is a file"
        print "Converting, please wait the end"
        capture_video(args.input)
else:
    print "Input does not exist"
