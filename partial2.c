#include <stdio.h>
#include <string.h>

// Repeated use of timestamps everywhere
// Makes MANY bytes different = very low score

void print_header() {
    printf("===================\n");
    printf("Built: %s %s\n", __DATE__, __TIME__);
    printf("File:  %s\n", __FILE__);
    printf("Line:  %d\n", __LINE__);
    printf("===================\n");
}

void print_footer() {
    printf("-------------------\n");
    printf("End: %s %s\n", __DATE__, __TIME__);
    printf("-------------------\n");
}

void section(int n) {
    printf("Section %d built at %s\n", n, __TIME__);
}

int main() {
    print_header();
    section(1);
    section(2);
    section(3);
    printf("Date stamp: %s\n", __DATE__);
    printf("Time stamp: %s\n", __TIME__);
    printf("More info: compiled %s\n", __DATE__);
    printf("Even more: at time %s\n", __TIME__);
    print_footer();
    return 0;
}