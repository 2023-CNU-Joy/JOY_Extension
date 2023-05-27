#include <stdio.h>
#define _CRT_SECURE_NO_WARNINGS

int fac(int n){
    if(n < 2)
        return 1;
    return n * fac(n - 1);
}

int main(){
    int n = 0;
    scanf("%d", &n);
    printf("%d", fac(n));
    return 0;
}
