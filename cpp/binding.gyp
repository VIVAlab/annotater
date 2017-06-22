{
  "targets": [
    {
      "target_name": "tracker",
      "type": "executable",
      "sources": ["./include/tracker.cpp", "main.cpp"],
      "include_dirs": ["./include"],
      'cflags': ['-Wno-unused-variable'],
      'cflags!': [ '-fno-exceptions'],
      'cflags_cc!': [ '-fno-exceptions'],
      'conditions': [
          [ 'OS=="linux" or OS=="freebsd" or OS=="openbsd" or OS=="solaris"',{
              'ldflags': [ '<!@(pkg-config --libs --libs-only-other opencv)' ],
              'libraries': [ '<!@(pkg-config --libs opencv)' ],
              'cflags': [ '<!@(pkg-config --cflags opencv)' ],
              'cflags_cc': [ '<!@(pkg-config --cflags opencv)' ],
              'cflags_cc!': ['-fno-rtti'],
              'cflags_cc+': ['-frtti']
          }]
      ]
    }
  ]
}