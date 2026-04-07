#include <stdio.h>

const char* t1 = __TIME__;
const char* t2 = __TIME__;

int main() {
    printf("Hello BuildGuard!\n");
    printf("Time1: %s\n", t1);
    printf("Time2: %s\n", t2);
    printf("Computation: %d\n", 2 + 2);
    return 0;
}