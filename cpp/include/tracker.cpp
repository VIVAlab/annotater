#include <iostream>
#include <cstdlib>
#include <opencv2/core.hpp>
#include <opencv2/highgui.hpp>
#include <opencv2/imgproc.hpp>
#include <opencv2/features2d/features2d.hpp>
#include <opencv2/video/tracking.hpp>

#include "tracker.h"

void showImage(int argc, char* argv[] )
{
    if ( argc != 2 )
    {
        printf("usage: DisplayImage.out <Image_Path>\n");
    }

    printf(argv[1]);
    cv::Mat image;
    image = cv::imread( argv[1], 1);

    if ( !image.data )
    {
        printf("No image data \n");
    }
    cv::namedWindow("Display Image", cv::WINDOW_AUTOSIZE );
    cv::imshow("Display Image", image);

    cv::waitKey(0);
}

void tracker(int argc, char* argv[]){
    // Illustration of the Median Tracker principle
    cv::Mat image1 = cv::imread("./tmp/frame_src.jpg", cv::ImreadModes::IMREAD_GRAYSCALE);
    cv::Rect bb(atoi(argv[1]), atoi(argv[2]), atoi(argv[3]), atoi(argv[4]));

    // define a regular grid of points
    int size_grid = 10;
    std::vector<cv::Point2f> grid;
    for (int i = 0; i < size_grid; i++) {
        for (int j = 0; j < size_grid; j++) {
            cv::Point2f p(bb.x+i*bb.width/size_grid, bb.y+j*bb.height/size_grid);
            grid.push_back(p);
        }
    }

    // track in next image
    cv::Mat image2 = cv::imread("./tmp/next_frame.jpg", cv::ImreadModes::IMREAD_GRAYSCALE);
    std::vector<cv::Point2f> newPoints;
    std::vector<uchar> status; // status of tracked features
    std::vector<float> err;    // error in tracking

    // track the points
    cv::calcOpticalFlowPyrLK(image1, image2, // 2 consecutive images
        grid,      // input point position in first image
        newPoints, // output point postion in the second image
        status,    // tracking success
        err);      // tracking error

    // Draw the points
    for (cv::Point2f p : grid) {
        cv::circle(image1, p, 1, cv::Scalar(255, 255, 255), -1);
    }
    cv::imshow("Initial points", image1);


    for (cv::Point2f p : newPoints) {
        cv::circle(image2, p, 1, cv::Scalar(255, 255, 255), -1);
    }
    cv::imshow("Tracked points", image2);

    //std::cout << "Erreur :" << err[0] << "," << err[1] << std::endl;

    std::cout << newPoints[0] << std::endl;
    std::cout << newPoints[(size_grid-1)*size_grid] << std::endl;
    std::cout << newPoints[size_grid-1] << std::endl;
    std::cout << newPoints[size_grid*size_grid-1];

    cv::waitKey();

}