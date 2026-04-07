#include <stdio.h>

// __DATE__ and __TIME__ are embedded at compile time
// They change every time you compile!
const char* build_date = __DATE__;
const char* build_time = __TIME__;

int main() {
    printf("Program built on: %s at %s\n", build_date, build_time);
    printf("Hello from BuildGuard!\n");
    return 0;
}