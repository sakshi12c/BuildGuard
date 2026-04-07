#include <stdio.h>

// Only ONE timestamp macro
// Small difference = high score
const char* build_time = __TIME__;

int main() {
    printf("Hello BuildGuard!\n");
    printf("Time: %s\n", build_time);
    printf("2 + 2 = %d\n", 2 + 2);
    printf("Testing partial reproducibility\n");
    return 0;
}