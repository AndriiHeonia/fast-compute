Fast-compute - high-level JavaScript library for the parallel heterogeneous computing (<a href="http://en.wikipedia.org/wiki/General-purpose_computing_on_graphics_processing_units" target="_blank">GPGPU</a>).

## Usage

Declare kernels (callbacks):

    <script id="kernels" type="text/x-opencl">
        kernel void sum(global uint* arr1, global uint* arr2, uint len, global uint* out) {
            uint i = get_global_id(0);
            if (i >= len) { return; }
            out[i] = arr1[i] + arr2[i];
        }
        kernel void sub(global uint* arr1, global uint* arr2, uint len, global int* out) {
            uint i = get_global_id(0);
            if (i >= len) { return; }
            out[i] = arr1[i] - arr2[i];
        }
    </script>

Init `Fast` instance and call the appropriate methods:

    var len = 5000000,
        arr1 = new Uint32Array(len),
        arr2 = new Uint32Array(len),
        sum = new Uint32Array(len),
        sub = new Int32Array(len);

    // fill input arrays
    for (var i = 0; i < len; i++) {
        arr1[i] = i;
        arr2[i] = i*i;
    }

    var fast = new Fast(document.getElementById('kernels').text);

    fast.sum(arr1, arr2, new Uint32Array([len]), sum);
    console.log('sum:', sum);

    fast.sub(arr1, arr2, new Uint32Array([len]), sub);
    console.log('sub:', sub);

## To-do

* Try to write more complex examples and ensure that it's possible:
    * global/local kernels arguments usage
    * when to use (or don't use) C pointers
    * how to compute 2 dimensional matrix
    * what about `Image` type usage instead of `Buffers`?
* Implement WebGL fallback
* Write build tasks and tests
* Update API doc
* Try to use it in hull.js

## Changelog
### 0.1.0 — 13.12.2014
First and very simple version