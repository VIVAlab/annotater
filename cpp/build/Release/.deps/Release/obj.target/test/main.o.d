cmd_Release/obj.target/test/main.o := g++ '-DNODE_GYP_MODULE_NAME=test' '-DUSING_UV_SHARED=1' '-DUSING_V8_SHARED=1' '-DV8_DEPRECATION_WARNINGS=1' '-D_LARGEFILE_SOURCE' '-D_FILE_OFFSET_BITS=64' -I/home/goren/.node-gyp/4.7.2/include/node -I/home/goren/.node-gyp/4.7.2/src -I/home/goren/.node-gyp/4.7.2/deps/uv/include -I/home/goren/.node-gyp/4.7.2/deps/v8/include -I../include  -fPIC -pthread -Wall -Wextra -Wno-unused-parameter -m64 -Wno-unused-variable -I/usr/local/include/opencv -I/usr/local/include -O3 -ffunction-sections -fdata-sections -fno-omit-frame-pointer -std=gnu++0x -frtti -I/usr/local/include/opencv -I/usr/local/include -MMD -MF ./Release/.deps/Release/obj.target/test/main.o.d.raw   -c -o Release/obj.target/test/main.o ../main.cpp
Release/obj.target/test/main.o: ../main.cpp ../include/test_alan.h
../main.cpp:
../include/test_alan.h:
