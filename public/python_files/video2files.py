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
parser.add_argument('-o', '--offset',  type=int, help='specify first int number')
parser.add_argument('-n', '--frame_number',  type=int, help='number of frames in each video')

args = parser.parse_args()


def capture_video(input, offset):
    cap = cv2.VideoCapture(input)
    number = offset

    while(True):
        # Capture frame-by-frame
        ret, frame = cap.read()
        if frame is None:
            break

        Orows, Ocols, Ochannels = frame.shape

        if number % args.skip != 0:
            number+=1
            continue
        if args.width:
            frame = cv2.resize(frame, (args.width, args.width * Orows / Ocols))

        cv2.imwrite(join(args.folder,'%010d.png' % (number)), frame)
        number+=1

    # When everything done, release the capture
    cap.release()
    cv2.destroyAllWindows()

if not os.path.exists(args.folder):
    os.makedirs(args.folder)


if os.path.isdir(glob.glob(args.input)[0]):
    # take each video of the input folder
    elements = []
    for element in glob.glob(args.input+'/*'):
        elements.append(element)

    elements.sort()
    offset = 0
    for video in elements:
        capture_video(video, offset)
        offset += args.frame_number

else:
    number = 0
    if args.offset:
        number = args.offset

    capture_video(args.input, number)

